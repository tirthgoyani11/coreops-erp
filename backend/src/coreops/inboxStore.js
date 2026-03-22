const prisma = require('../config/prisma');

const INBOX_PREFIX = 'coreops:inbox:';

function getInboxKey(consumer, eventId) {
  return `${INBOX_PREFIX}${consumer}:${eventId}`;
}

async function hasProcessed(consumer, eventId) {
  const entry = await prisma.settings.findUnique({
    where: { key: getInboxKey(consumer, eventId) },
    select: { key: true },
  });

  return Boolean(entry);
}

async function markProcessed(consumer, eventId, metadata = {}) {
  const key = getInboxKey(consumer, eventId);
  await prisma.settings.upsert({
    where: { key },
    update: {
      value: {
        consumer,
        eventId,
        processedAt: new Date().toISOString(),
        ...metadata,
      },
    },
    create: {
      key,
      value: {
        consumer,
        eventId,
        processedAt: new Date().toISOString(),
        ...metadata,
      },
    },
  });
}

async function processOnce(consumer, envelope, handler) {
  if (!consumer || !envelope?.id) {
    return { replayed: false, result: await handler() };
  }

  const alreadyProcessed = await hasProcessed(consumer, envelope.id);
  if (alreadyProcessed) {
    return { replayed: true, result: null };
  }

  const result = await handler();

  await markProcessed(consumer, envelope.id, {
    eventName: envelope.eventName,
    occurredAt: envelope.occurredAt,
  });

  return { replayed: false, result };
}

module.exports = {
  processOnce,
  hasProcessed,
  markProcessed,
};
