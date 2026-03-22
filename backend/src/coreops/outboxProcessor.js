const logger = require('../utils/logger');
const { listPendingOutbox, replayOutboxRecord } = require('./eventBus');

let timer = null;
let running = false;

async function processOutboxBatch() {
  if (running) return;
  running = true;

  try {
    const batchSize = Number(process.env.OUTBOX_BATCH_SIZE || 25);
    const rows = await listPendingOutbox(batchSize);

    for (const row of rows) {
      await replayOutboxRecord(row.key, row.record);
    }
  } catch (error) {
    logger.warn(`[OutboxProcessor] Batch failed: ${error.message}`);
  } finally {
    running = false;
  }
}

function startOutboxProcessor() {
  if (timer) return;

  const intervalMs = Number(process.env.OUTBOX_PROCESSOR_INTERVAL_MS || 5000);
  timer = setInterval(() => {
    processOutboxBatch().catch((error) => {
      logger.warn(`[OutboxProcessor] Unexpected error: ${error.message}`);
    });
  }, intervalMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  logger.info(`[OutboxProcessor] Started (interval=${intervalMs}ms)`);

  processOutboxBatch().catch((error) => {
    logger.warn(`[OutboxProcessor] Initial run failed: ${error.message}`);
  });
}

function stopOutboxProcessor() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  logger.info('[OutboxProcessor] Stopped');
}

module.exports = {
  processOutboxBatch,
  startOutboxProcessor,
  stopOutboxProcessor,
};
