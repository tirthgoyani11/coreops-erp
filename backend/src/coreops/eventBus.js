const { EventEmitter } = require('events');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const { getContextValue } = require('../middleware/context');
const { getEventMetadata } = require('./eventCatalog');

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

let kafkaProducer = null;
let kafkaReady = false;

const OUTBOX_PREFIX = 'coreops:outbox:';

function getOutboxKey(eventId) {
  return `${OUTBOX_PREFIX}${eventId}`;
}

async function saveOutboxRecord(record) {
  await prisma.settings.upsert({
    where: { key: getOutboxKey(record.envelope.id) },
    update: { value: record },
    create: { key: getOutboxKey(record.envelope.id), value: record },
  });
}

async function listPendingOutbox(limit = 50) {
  const rows = await prisma.settings.findMany({
    where: { key: { startsWith: OUTBOX_PREFIX } },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });

  const now = new Date();
  return rows
    .map((row) => ({ key: row.key, record: row.value || {} }))
    .filter(({ record }) => {
      const status = String(record.status || 'PENDING').toUpperCase();
      if (status === 'DELIVERED') return false;
      const nextAttemptAt = record.nextAttemptAt ? new Date(record.nextAttemptAt) : null;
      return !nextAttemptAt || Number(nextAttemptAt) <= Number(now);
    });
}

function computeBackoffMs(attempts) {
  const base = Number(process.env.OUTBOX_RETRY_BASE_MS || 2000);
  const cappedAttempts = Math.min(Number(attempts || 1), 8);
  return Math.min(base * (2 ** (cappedAttempts - 1)), 300000);
}

async function initKafkaIfConfigured() {
  if (kafkaReady) return;

  const brokers = (process.env.KAFKA_BROKERS || '').split(',').map((v) => v.trim()).filter(Boolean);
  if (!brokers.length) {
    kafkaReady = true;
    return;
  }

  try {
    // Optional dependency: loads only when configured.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const { Kafka } = require('kafkajs');
    const kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'coreops-backend',
      brokers,
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: process.env.KAFKA_USERNAME
        ? {
            mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
            username: process.env.KAFKA_USERNAME,
            password: process.env.KAFKA_PASSWORD || '',
          }
        : undefined,
    });

    kafkaProducer = kafka.producer();
    await kafkaProducer.connect();
    kafkaReady = true;
    logger.info('[CoreOpsEventBus] Kafka producer connected');
  } catch (error) {
    kafkaProducer = null;
    kafkaReady = true;
    logger.warn(`[CoreOpsEventBus] Kafka disabled; using in-memory bus only: ${error.message}`);
  }
}

async function deliverEnvelope(envelope, options = {}) {
  emitter.emit(envelope.eventName, envelope);
  emitter.emit('coreops.event', envelope);

  await initKafkaIfConfigured();

  if (kafkaProducer) {
    const topic = options.topic || process.env.KAFKA_TOPIC_COREOPS || 'coreops-events';
    await kafkaProducer.send({
      topic,
      messages: [{ key: envelope.eventName, value: JSON.stringify(envelope) }],
    });
  }
}

async function publishEvent(eventName, payload = {}, options = {}) {
  const { eventVersion, owner, isCataloged } = getEventMetadata(eventName, options.eventVersion);
  const traceId = options.traceId || getContextValue('traceId') || getContextValue('requestId') || null;
  const requestId = getContextValue('requestId') || null;
  const envelope = {
    id: options.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    eventName,
    eventVersion,
    eventOwner: owner,
    occurredAt: new Date().toISOString(),
    source: options.source || 'coreops.api',
    officeId: options.officeId || null,
    actorId: options.actorId || null,
    traceId,
    requestId,
    payload,
  };

  const initialRecord = {
    envelope,
    status: 'PENDING',
    attempts: 0,
    isCataloged,
    createdAt: new Date().toISOString(),
    nextAttemptAt: new Date().toISOString(),
    lastError: null,
    deliveredAt: null,
  };

  await saveOutboxRecord(initialRecord);

  try {
    await deliverEnvelope(envelope, options);
    await saveOutboxRecord({
      ...initialRecord,
      status: 'DELIVERED',
      attempts: 1,
      deliveredAt: new Date().toISOString(),
      nextAttemptAt: null,
    });
  } catch (error) {
    logger.warn(`[CoreOpsEventBus] Deferred event delivery for ${eventName}: ${error.message}`);
    await saveOutboxRecord({
      ...initialRecord,
      status: 'FAILED',
      attempts: 1,
      lastError: error.message,
      nextAttemptAt: new Date(Date.now() + computeBackoffMs(1)).toISOString(),
    });
  }

  return envelope;
}

async function replayOutboxRecord(outboxKey, record) {
  if (!record?.envelope?.eventName) return null;

  const attempts = Number(record.attempts || 0) + 1;
  const updatedRecord = {
    ...record,
    status: 'PROCESSING',
    attempts,
    lastError: null,
    lastAttemptAt: new Date().toISOString(),
  };
  await prisma.settings.update({ where: { key: outboxKey }, data: { value: updatedRecord } });

  try {
    await deliverEnvelope(record.envelope, {});
    const deliveredRecord = {
      ...updatedRecord,
      status: 'DELIVERED',
      deliveredAt: new Date().toISOString(),
      nextAttemptAt: null,
    };
    await prisma.settings.update({ where: { key: outboxKey }, data: { value: deliveredRecord } });
    return deliveredRecord;
  } catch (error) {
    const failedRecord = {
      ...updatedRecord,
      status: 'FAILED',
      lastError: error.message,
      nextAttemptAt: new Date(Date.now() + computeBackoffMs(attempts)).toISOString(),
    };
    await prisma.settings.update({ where: { key: outboxKey }, data: { value: failedRecord } });
    logger.warn(`[CoreOpsEventBus] Outbox replay failed (${record.envelope.eventName}): ${error.message}`);
    return failedRecord;
  }
}

function subscribe(eventName, handler) {
  emitter.on(eventName, handler);
  return () => emitter.off(eventName, handler);
}

module.exports = {
  publishEvent,
  subscribe,
  listPendingOutbox,
  replayOutboxRecord,
};
