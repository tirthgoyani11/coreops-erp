const crypto = require('crypto');
const prisma = require('../config/prisma');

const IDEMPOTENCY_PREFIX = 'coreops:idempotency:';

function stableBody(body) {
  if (!body || typeof body !== 'object') return {};
  return body;
}

function hashPayload(payload) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload || {}))
    .digest('hex');
}

function resolveKey(req) {
  return String(req.headers['x-idempotency-key'] || req.body?.idempotencyKey || '').trim();
}

function getStorageKey(namespace, req, key) {
  const userPart = req.user?.id || 'anonymous';
  return `${IDEMPOTENCY_PREFIX}${namespace}:${userPart}:${key}`;
}

function idempotencyMiddleware(options = {}) {
  const namespace = options.namespace || 'default';
  const methods = options.methods || ['POST', 'PUT', 'PATCH'];
  const required = options.required === true;

  return async (req, res, next) => {
    if (!methods.includes(String(req.method || '').toUpperCase())) {
      return next();
    }

    const key = resolveKey(req);

    if (!key) {
      if (required) {
        return res.status(400).json({
          success: false,
          message: 'x-idempotency-key header is required for this endpoint.',
        });
      }
      return next();
    }

    const payloadFingerprint = hashPayload(stableBody(req.body));
    const storageKey = getStorageKey(namespace, req, key);

    const existing = await prisma.settings.findUnique({ where: { key: storageKey } });
    const existingValue = existing?.value || null;

    if (existingValue?.fingerprint && existingValue.fingerprint !== payloadFingerprint) {
      return res.status(409).json({
        success: false,
        message: 'Idempotency key reuse with different payload is not allowed.',
      });
    }

    if (existingValue?.response) {
      res.setHeader('X-Idempotency-Replayed', 'true');
      return res.status(existingValue.response.statusCode || 200).json(existingValue.response.body);
    }

    res.setHeader('X-Idempotency-Replayed', 'false');

    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      const statusCode = res.statusCode || 200;
      if (statusCode < 500) {
        const value = {
          namespace,
          key,
          fingerprint: payloadFingerprint,
          method: req.method,
          path: req.originalUrl,
          createdAt: new Date().toISOString(),
          response: {
            statusCode,
            body,
          },
        };

        await prisma.settings.upsert({
          where: { key: storageKey },
          update: { value },
          create: { key: storageKey, value },
        });
      }

      return originalJson(body);
    };

    return next();
  };
}

module.exports = {
  idempotencyMiddleware,
};
