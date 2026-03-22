const ENTITY_GRAPH = {
  version: '1.0.0',
  generatedAt: () => new Date().toISOString(),
  architecture: {
    model: 'unified-data-architecture',
    apiStyle: ['REST', 'GraphQL-ready'],
    communication: ['event-driven', 'request-response', 'websocket-realtime'],
    backendStyle: 'service-oriented-monolith-ready-for-microservice-extraction',
  },
  sharedEntities: [
    'User',
    'Employee',
    'Organization',
    'Role',
    'Department',
    'Customer',
    'Vendor',
    'Product',
    'Invoice',
    'Transaction',
    'Asset',
    'Task',
    'Activity',
    'Document',
  ],
  implementedModels: {
    User: 'User',
    Employee: 'Employee',
    Organization: 'Office',
    Role: 'UserRole',
    Department: 'Employee.department',
    Customer: 'Customer',
    Vendor: 'Vendor',
    Product: 'Inventory',
    Invoice: ['Invoice', 'ARInvoice', 'APInvoice'],
    Transaction: 'Transaction',
    Asset: 'Asset',
    Task: ['MaintenanceTicket', 'PreventiveSchedule'],
    Activity: ['AuditLog', 'AiOperation', 'Notification'],
    Document: 'Document',
  },
  keyRelations: [
    'User -> Employee (1:0..1)',
    'User -> Office (N:1)',
    'Employee -> Attendance (1:N)',
    'Employee -> LeaveRequest (1:N)',
    'PayrollRun -> Payslip (1:N)',
    'SalesOrder -> ARInvoice (1:N)',
    'PurchaseOrder -> APInvoice (1:N)',
    'Asset -> MaintenanceTicket (1:N)',
    'Document -> Asset (N:1)',
    'Document -> Office (N:1)',
    'Transaction -> GLAccount (N:1)',
  ],
  crossModuleFlows: [
    {
      name: 'crm_deal_to_finance_invoice',
      trigger: 'crm.deal.won',
      action: 'finance.invoice.create',
      status: 'enabled',
    },
    {
      name: 'invoice_to_gl_entries',
      trigger: 'finance.invoice.created',
      action: 'finance.gl.post_journal',
      status: 'enabled',
    },
    {
      name: 'sales_to_inventory_reservation',
      trigger: 'sales.order.confirmed',
      action: 'inventory.stock.reserve',
      status: 'enabled',
    },
    {
      name: 'inventory_low_stock_to_procurement',
      trigger: 'inventory.low_stock.detected',
      action: 'procurement.requisition.create',
      status: 'enabled',
    },
    {
      name: 'asset_assignment_to_maintenance',
      trigger: 'asset.assigned',
      action: 'maintenance.plan.sync',
      status: 'enabled',
    },
  ],
};

function getEntityGraph() {
  return {
    ...ENTITY_GRAPH,
    generatedAt: ENTITY_GRAPH.generatedAt(),
  };
}

module.exports = {
  getEntityGraph,
};
