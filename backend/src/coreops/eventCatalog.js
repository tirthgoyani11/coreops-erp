const DEFAULT_VERSION = 1;

const EVENT_CATALOG = {
  'asset.created': { version: 1, owner: 'assets' },
  'asset.lifecycle.changed': { version: 1, owner: 'assets' },
  'inventory.created': { version: 1, owner: 'inventory' },
  'inventory.item.created': { version: 1, owner: 'inventory' },
  'inventory.stock.adjusted': { version: 1, owner: 'inventory' },
  'inventory.sparepart.used': { version: 1, owner: 'inventory' },
  'inventory.sale.fulfilled': { version: 1, owner: 'inventory' },
  'inventory.low_stock.detected': { version: 1, owner: 'inventory' },
  'procurement.requisition.auto_requested': { version: 1, owner: 'procurement' },
  'finance.transaction.created': { version: 1, owner: 'finance' },
  'finance.collection.reminder.requested': { version: 1, owner: 'finance' },
  'finance.invoice.overdue': { version: 1, owner: 'finance' },
  'crm.deal.submitted': { version: 1, owner: 'crm' },
  'workflow.approval.required': { version: 1, owner: 'workflow' },
  'hcm.leave.submitted': { version: 1, owner: 'hcm' },
  'sales.order.created': { version: 1, owner: 'sales' },
  'sales.order.fulfilled': { version: 1, owner: 'sales' },
};

function getEventMetadata(eventName, requestedVersion) {
  const catalogEntry = EVENT_CATALOG[eventName] || null;
  const eventVersion = Number(requestedVersion || catalogEntry?.version || DEFAULT_VERSION);

  return {
    eventVersion: Number.isFinite(eventVersion) && eventVersion > 0 ? eventVersion : DEFAULT_VERSION,
    owner: catalogEntry?.owner || 'unknown',
    isCataloged: Boolean(catalogEntry),
  };
}

module.exports = {
  DEFAULT_VERSION,
  EVENT_CATALOG,
  getEventMetadata,
};
