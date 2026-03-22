const prisma = require('../config/prisma');
const socketServer = require('../config/socketServer');
const { publishEvent } = require('./eventBus');
const { processOnce } = require('./inboxStore');
const { postTransactionToGL } = require('../services/financePostingService');

async function postWorkflowFinanceTransaction({
  officeId,
  actorId,
  type,
  category,
  amount,
  description,
  referenceType,
  referenceId,
}) {
  const normalizedAmount = Number(amount || 0);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return null;

  return prisma.$transaction(async (tx) => {
    const financeTx = await tx.transaction.create({
      data: {
        type,
        category,
        amount: normalizedAmount,
        currency: 'INR',
        date: new Date(),
        description,
        referenceType: referenceType || 'MANUAL',
        referenceId: referenceId || null,
        officeId: officeId || null,
        recordedById: actorId || null,
        status: 'CLEARED',
      },
    });

    await postTransactionToGL({ tx, transaction: financeTx, userId: actorId || null });
    return financeTx;
  });
}

const RULES = [
  {
    id: 'crm-deal-approval-threshold',
    trigger: 'crm.deal.submitted',
    description: 'If deal value > threshold, require manager approval',
    evaluate: (payload) => Number(payload.dealValue || 0) > Number(payload.threshold || 100000),
    run: async (context, envelope) => {
      await publishEvent('workflow.approval.required', {
        workflow: 'crm.deal.approval',
        reason: 'Deal value exceeds threshold',
        dealId: envelope.payload.dealId,
        dealValue: envelope.payload.dealValue,
      }, context);
    },
  },
  {
    id: 'hcm-leave-over-limit',
    trigger: 'hcm.leave.submitted',
    description: 'If leave days exceed policy limit, trigger HR approval',
    evaluate: (payload) => Number(payload.totalDays || 0) > Number(payload.policyLimit || 3),
    run: async (context, envelope) => {
      await publishEvent('workflow.approval.required', {
        workflow: 'hcm.leave.approval',
        reason: 'Leave request exceeds configured policy',
        leaveRequestId: envelope.payload.leaveRequestId,
        totalDays: envelope.payload.totalDays,
      }, context);
    },
  },
  {
    id: 'finance-overdue-notification',
    trigger: 'finance.invoice.overdue',
    description: 'Notify sales and trigger automatic reminders when an invoice is overdue',
    evaluate: (payload) => Number(payload.daysOverdue || 0) > 0,
    run: async (context, envelope) => {
      const { invoiceId, customerName, amount, officeId } = envelope.payload;
      const managers = await prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
          ...(officeId ? { officeId } : {}),
        },
        select: { id: true },
        take: 20,
      });

      if (managers.length) {
        await prisma.notification.createMany({
          data: managers.map((user) => ({
            recipientId: user.id,
            type: 'SYSTEM_ALERT',
            title: 'Invoice Overdue',
            message: `Invoice ${invoiceId} for ${customerName || 'customer'} is overdue. Amount: INR ${Number(amount || 0).toFixed(2)}.`,
            priority: 'HIGH',
            relatedModel: 'Invoice',
            relatedDocId: invoiceId || null,
          })),
        });
      }

      if (officeId) {
        socketServer.broadcastToOffice(officeId, 'finance.invoice.overdue', {
          invoiceId,
          customerName,
          amount,
          daysOverdue: envelope.payload.daysOverdue,
        });
      }

      await publishEvent('finance.collection.reminder.requested', {
        invoiceId,
        customerName,
      }, context);
    },
  },
  {
    id: 'inventory-auto-procurement',
    trigger: 'inventory.low_stock.detected',
    description: 'Create procurement signal when stock falls below reorder level',
    evaluate: (payload) => Number(payload.availableQty || 0) <= Number(payload.reorderLevel || 0),
    run: async (context, envelope) => {
      await publishEvent('procurement.requisition.auto_requested', {
        inventoryId: envelope.payload.inventoryId,
        inventoryName: envelope.payload.inventoryName,
        availableQty: envelope.payload.availableQty,
        reorderLevel: envelope.payload.reorderLevel,
        suggestedQty: envelope.payload.suggestedQty || Math.max(Number(envelope.payload.reorderLevel || 0) * 2, 1),
      }, context);
    },
  },
  {
    id: 'inventory-sale-profit-to-finance',
    trigger: 'inventory.sale.fulfilled',
    description: 'Post realized inventory sale profit as finance income transaction',
    evaluate: (payload) => Number(payload.profitAmount || 0) > 0,
    run: async (context, envelope) => {
      const { officeId, salesOrderId, orderNumber, profitAmount } = envelope.payload;
      await postWorkflowFinanceTransaction({
        officeId,
        actorId: context.actorId,
        type: 'INCOME',
        category: 'INVENTORY_SALE_PROFIT',
        amount: Number(profitAmount || 0),
        description: `Inventory sale profit recognized for ${orderNumber || salesOrderId}`,
        referenceType: 'MANUAL',
        referenceId: salesOrderId || null,
      });
    },
  },
  {
    id: 'inventory-spare-usage-to-expense',
    trigger: 'inventory.sparepart.used',
    description: 'Post spare part consumption as maintenance expense',
    evaluate: (payload) => Number(payload.totalCost || 0) > 0,
    run: async (context, envelope) => {
      const { officeId, ticketId, ticketNumber, inventoryName, totalCost } = envelope.payload;
      await postWorkflowFinanceTransaction({
        officeId,
        actorId: context.actorId,
        type: 'EXPENSE',
        category: 'SPAREPART_USAGE',
        amount: Number(totalCost || 0),
        description: `Spare part expense on maintenance ${ticketNumber || ticketId}${inventoryName ? ` - ${inventoryName}` : ''}`,
        referenceType: 'MAINTENANCE_TICKET',
        referenceId: ticketId || null,
      });
    },
  },
  {
    id: 'inventory-stock-in-to-expense',
    trigger: 'inventory.stock.adjusted',
    description: 'Post inventory buy/add stock-in value as expense',
    evaluate: (payload) => String(payload.movementType || '').toUpperCase() === 'STOCK_IN' && Number(payload.movementValue || 0) > 0,
    run: async (context, envelope) => {
      const { officeId, inventoryId, quantity, movementValue, reason, reference } = envelope.payload;
      await postWorkflowFinanceTransaction({
        officeId,
        actorId: context.actorId,
        type: 'EXPENSE',
        category: 'INVENTORY_PURCHASE',
        amount: Number(movementValue || 0),
        description: `Inventory stock-in expense (${quantity} units)${reason ? ` - ${reason}` : ''}`,
        referenceType: 'MANUAL',
        referenceId: inventoryId || reference || null,
      });
    },
  },
];

async function evaluateEvent(envelope, context = {}) {
  const consumer = context.consumer || 'coreops.automation.engine';

  const execution = await processOnce(consumer, envelope, async () => {
    const applicableRules = RULES.filter((rule) => rule.trigger === envelope.eventName);
    const executed = [];

    for (const rule of applicableRules) {
      if (!rule.evaluate(envelope.payload)) continue;
      await rule.run(context, envelope);
      executed.push({ id: rule.id, description: rule.description });
    }

    return executed;
  });

  return execution.replayed ? [] : execution.result;
}

function getAutomationRules() {
  return RULES.map((rule) => ({
    id: rule.id,
    trigger: rule.trigger,
    description: rule.description,
  }));
}

module.exports = {
  evaluateEvent,
  getAutomationRules,
};
