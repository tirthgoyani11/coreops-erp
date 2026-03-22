const prisma = require('../../config/prisma');
const { asyncHandler, AppError } = require('../../utils/errorHandler');
const orchestrator = require('../../services/orchestrator');
const socketServer = require('../../config/socketServer');
const { getEntityGraph } = require('../../coreops/entityGraph');
const { publishEvent } = require('../../coreops/eventBus');
const { evaluateEvent, getAutomationRules } = require('../../coreops/automationEngine');

function resolveOfficeId(value) {
  if (!value) return null;
  if (typeof value === 'object' && value.id) return value.id;
  return value;
}

exports.getArchitecture = asyncHandler(async (req, res) => {
  const graph = getEntityGraph();
  const rules = getAutomationRules();

  res.status(200).json({
    success: true,
    data: {
      ...graph,
      workflowRules: rules,
      integration: {
        apis: ['REST', 'GraphQL-ready'],
        realtime: 'socket.io',
        eventBus: process.env.KAFKA_BROKERS ? 'kafka+inmemory' : 'inmemory',
      },
    },
  });
});

exports.getUnifiedContext = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);

  const [
    users,
    employees,
    customers,
    vendors,
    products,
    assets,
    invoices,
    transactions,
    documents,
    openTasks,
    recentActivities,
  ] = await Promise.all([
    prisma.user.count({ where: officeId ? { officeId, isActive: true } : { isActive: true } }),
    prisma.employee.count({ where: officeId ? { officeId, status: 'ACTIVE' } : { status: 'ACTIVE' } }),
    prisma.customer.count({ where: officeId ? { officeId, status: 'ACTIVE' } : { status: 'ACTIVE' } }),
    prisma.vendor.count({ where: officeId ? { officeId } : {} }),
    prisma.inventory.count({ where: officeId ? { officeId } : {} }),
    prisma.asset.count({ where: officeId ? { officeId } : {} }),
    prisma.invoice.count({ where: officeId ? { officeId } : {} }),
    prisma.transaction.aggregate({
      where: officeId ? { officeId } : {},
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.document.count({ where: officeId ? { officeId } : {} }),
    prisma.maintenanceTicket.count({
      where: {
        ...(officeId ? { officeId } : {}),
        status: { in: ['OPEN', 'IN_PROGRESS', 'ON_HOLD'] },
      },
    }),
    prisma.auditLog.findMany({
      where: officeId
        ? {
            OR: [
              { user: { officeId } },
              { resourceId: officeId },
            ],
          }
        : {},
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        timestamp: true,
        user: { select: { id: true, name: true, role: true } },
      },
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      officeId: officeId || null,
      generatedAt: new Date().toISOString(),
      entities: {
        users,
        employees,
        customers,
        vendors,
        products,
        assets,
        invoices,
        transactions: transactions._count.id,
        transactionVolume: transactions._sum.amount || 0,
        documents,
        openTasks,
      },
      activityTimeline: recentActivities,
    },
  });
});

exports.publishDomainEvent = asyncHandler(async (req, res, next) => {
  const { eventName, payload, officeId: requestOfficeId } = req.body;
  if (!eventName) {
    return next(new AppError('eventName is required', 400));
  }

  const officeId = resolveOfficeId(requestOfficeId || req.user?.officeId);

  const envelope = await publishEvent(eventName, payload || {}, {
    source: 'coreops.domain.api',
    officeId,
    actorId: req.user?.id || null,
    traceId: req.traceId || req.id || null,
  });

  const executedRules = await evaluateEvent(envelope, {
    source: 'coreops.automation.engine',
    consumer: 'coreops.automation.engine',
    officeId,
    actorId: req.user?.id || null,
  });

  if (officeId) {
    socketServer.broadcastToOffice(officeId, 'coreops.domain.event', {
      eventName: envelope.eventName,
      payload: envelope.payload,
      occurredAt: envelope.occurredAt,
    });
  }

  res.status(202).json({
    success: true,
    data: {
      envelope,
      executedRules,
    },
  });
});

exports.copilotQuery = asyncHandler(async (req, res, next) => {
  const { query, providerPreference, modelPreference } = req.body;
  if (!query || typeof query !== 'string') {
    return next(new AppError('query is required', 400));
  }

  const officeId = resolveOfficeId(req.user?.officeId);

  const [hcmStats, financeStats, salesStats, inventoryStats, assetStats] = await Promise.all([
    prisma.employee.count({ where: officeId ? { officeId, status: 'ACTIVE' } : { status: 'ACTIVE' } }),
    prisma.transaction.aggregate({ where: officeId ? { officeId } : {}, _sum: { amount: true }, _count: { id: true } }),
    prisma.salesOrder.count({ where: officeId ? { officeId } : {} }),
    prisma.inventory.count({ where: officeId ? { officeId } : {} }),
    prisma.asset.count({ where: officeId ? { officeId } : {} }),
  ]);

  const contextSnapshot = {
    hcm: { activeEmployees: hcmStats },
    finance: { transactionCount: financeStats._count.id, transactionVolume: financeStats._sum.amount || 0 },
    crm: { salesOrders: salesStats },
    inventory: { products: inventoryStats },
    assets: { totalAssets: assetStats },
  };

  const prompt = `${query}\n\nUse this cross-module context snapshot for grounding:\n${JSON.stringify(contextSnapshot)}`;

  const result = await orchestrator.processCommand(prompt, {
    userId: req.user.id,
    officeId,
    role: req.user.role,
    sessionId: req.headers['x-session-id'],
    providerPreference,
    modelPreference,
  });

  if (officeId) {
    socketServer.broadcastToOffice(officeId, 'coreops.copilot.query', {
      userId: req.user.id,
      intent: result.intent || 'GENERAL',
      at: new Date().toISOString(),
    });
  }

  res.status(200).json({
    success: true,
    data: {
      contextSnapshot,
      result,
    },
  });
});
