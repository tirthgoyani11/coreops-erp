# CoreOps Data Schema Blueprint and Top-Tier ERP Improvement Plan

Date: 2026-03-22
Status: Proposed execution blueprint
Primary source schema: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)

## 1. Objective

Build a data architecture that supports Tier-1 ERP depth while preserving current operational continuity.

This plan provides:

- Current schema baseline by domain.
- Target Tier-1 schema additions.
- Migration and compatibility strategy.
- Performance, governance, and audit requirements.

## 2. Current schema baseline

CoreOps currently has a strong relational foundation with 60+ operational models.

### 2.1 Implemented model groups

- Organization and identity:
	- Office
	- User
	- RefreshToken

- HCM and payroll:
	- Employee
	- Attendance
	- LeaveRequest
	- PayrollRun
	- Payslip

- Assets and maintenance:
	- Asset
	- AssetMaintenanceHistory
	- MaintenanceTicket
	- WorkLog
	- SparePartUsage
	- PreventiveSchedule
	- SLAPolicy

- Inventory and procurement:
	- Inventory
	- StockMovement
	- InventoryBatch
	- SerializedUnit
	- Stocktake
	- StocktakeItem
	- PurchaseRequisition
	- PRItem
	- RFQ
	- RFQItem
	- VendorQuotation
	- PurchaseOrder
	- PurchaseOrderItem
	- GoodsReceipt
	- GRNItem
	- POAmendment
	- Vendor
	- VendorContract

- Finance and accounting:
	- Transaction
	- Budget
	- FinanceLog
	- Invoice
	- GLAccount
	- JournalEntry
	- JournalEntryLine
	- TaxRate
	- BankStatement
	- BankEntry
	- ExpenseClaim
	- ExpenseItem
	- ARInvoice
	- ARInvoiceLine
	- APInvoice
	- APInvoiceLine
	- ApPayment
	- ArPayment
	- InvoiceMatchLog

- Sales and CRM:
	- Customer
	- PricingRule
	- Quotation
	- QuotationItem
	- SalesOrder
	- SalesOrderItem

- Platform, AI, and governance:
	- AiOperation
	- Notification
	- AuditLog
	- WorkflowRule
	- Settings
	- Counter
	- CurrencyRate
	- CustomFieldDef
	- CustomFieldValue
	- KpiAlert
	- Document

### 2.2 Strengths of current schema

- Strong relation modeling and foreign keys.
- Wide enum usage for operational consistency.
- Good baseline for finance posting and operational traceability.
- Good coverage of procurement and maintenance operations.

### 2.3 Current schema limitations

- Missing legal-entity and multi-company accounting hierarchy.
- Missing manufacturing core aggregates.
- Missing project and service contracting core aggregates.
- Revenue recognition modeled operationally but not with full contract-performance schema.
- Office-level scoping exists, but tenant-grade partitioning is not explicit.
- Heavy use of JSON payloads in some paths where analytical relational design is needed.

## 3. Tier-1 target schema architecture

## 3.1 Foundational enterprise layer

Add organization and accounting boundaries:

- Tenant
- LegalEntity
- BusinessUnit
- FiscalCalendar
- FiscalPeriod
- AccountingBook

Recommended relation direction:

- Tenant 1:N LegalEntity
- LegalEntity 1:N BusinessUnit
- LegalEntity 1:N AccountingBook
- AccountingBook 1:N FiscalPeriod
- Office N:1 BusinessUnit

## 3.2 Finance depth layer (Tier-1 controls)

Add dimensions and close controls:

- CostCenter
- ProfitCenter
- DimensionSet
- DimensionSetItem
- PeriodCloseRun
- PeriodCloseTask
- ConsolidationRun
- ConsolidationCompanyBalance
- EliminationEntry
- IntercompanySettlement
- IntercompanyInvoice
- IntercompanyReconciliation

Add revenue recognition contract layer:

- RevenueContract
- PerformanceObligation
- RevenueSchedule
- RevenueScheduleLine
- RevenueRecognitionEntry

## 3.3 Manufacturing and quality layer

- ItemMaster extension for manufactured goods (or Product model if separated from Inventory)
- BOM
- BOMItem
- Routing
- RoutingStep
- WorkCenter
- ProductionOrder
- ProductionExecution
- MaterialIssue
- FinishedGoodsReceipt
- QualityInspection
- NonConformance

## 3.4 Supply chain and logistics layer

- Warehouse
- WarehouseZone
- WarehouseBin
- Shipment
- ShipmentItem
- Carrier
- RoutePlan
- DeliveryMilestone
- DemandForecast
- ReplenishmentPlan

## 3.5 Projects and service operations layer

- Project
- ProjectTask
- ResourceAssignment
- ProjectTimesheet
- ProjectCostEntry
- Milestone
- ProjectInvoice
- ServiceContract
- FieldVisit
- DispatchPlan
- TechnicianCalendar

## 3.6 Platform extensibility layer

- PluginManifest
- PluginInstallation
- ExtensionPermission
- TenantFeatureFlag
- DataRetentionPolicy

## 4. Data governance and compliance requirements

## 4.1 Mandatory columns for all business-critical tables

- id
- tenantId
- legalEntityId where applicable
- officeId or businessUnitId where applicable
- createdAt
- updatedAt
- createdById where user-originated
- status where lifecycle-driven

## 4.2 Audit and trace requirements

- All financial posting tables must carry sourceReferenceType and sourceReferenceId.
- Close and consolidation tables must carry runId and execution metadata.
- Revenue recognition entries must reference contract and performance obligation.
- Destructive operations require audit log record and soft-delete strategy where needed.

## 4.3 Security requirements

- Sensitive fields encryption for salary and bank data.
- Row-level policy model aligned to tenant and office boundaries.
- PII tags in metadata dictionary for masking and export control.

## 5. Performance and indexing plan

## 5.1 Indexing standards

- Composite index on tenantId, legalEntityId, date for large ledger tables.
- Composite index on status, dueDate for AP and AR operations.
- Composite index on officeId, updatedAt for operations dashboards.
- Unique index on business identifiers per tenant scope.

## 5.2 Partitioning strategy

Use partitioning for high-volume tables:

- JournalEntry and JournalEntryLine by fiscal period.
- Transaction by fiscal period.
- AuditLog by month.
- Notification by month or quarter.

## 5.3 Read model strategy

Build read-optimized views/tables for:

- Close cockpit summary.
- Working capital board.
- Consolidation dashboard.
- Maintenance reliability analytics.

## 6. Migration strategy (safe rollout)

## Phase 0: Schema governance baseline (1 sprint)

- Add schema version register table.
- Add migration review checklist.
- Tag current model inventory as baseline snapshot.

## Phase 1: Enterprise boundaries and dimensions (2 sprints)

- Introduce Tenant, LegalEntity, BusinessUnit, FiscalPeriod tables.
- Add nullable tenantId and legalEntityId to critical tables.
- Backfill existing data with default legal entity mapping.
- Add CostCenter and ProfitCenter dimensions.

## Phase 2: Finance Tier-1 depth (2 to 3 sprints)

- Add consolidation and close-run tables.
- Add intercompany settlement and reconciliation tables.
- Add revenue contract and schedule tables.
- Link JournalEntry and Transaction records to dimension sets.

## Phase 3: Manufacturing and projects foundation (3 to 4 sprints)

- Add manufacturing core models and inventory linkage.
- Add projects and service core models and financial linkage.
- Add quality and nonconformance tracking.

## Phase 4: Optimization and hardening (2 sprints)

- Promote high-value JSON structures into relational tables.
- Add partitioning and read models.
- Add automated consistency checks and reconciliation jobs.

## 7. Backward compatibility rules

- New columns start nullable with defaults.
- New tables introduced without immediate destructive changes.
- API compatibility layer maintained for at least one minor release.
- Use dual-write for transitional features when moving from JSON to relational.
- Add verification jobs before dropping legacy fields.

## 8. Data quality and consistency checks

Build automated checks for:

- Orphaned references in invoice, payment, and journal chains.
- Unbalanced journal entries.
- Intercompany entries not eliminated by close period.
- Revenue schedules not matching contract totals.
- Inventory negative stock and valuation mismatches.

## 9. Definition of done for schema upgrades

A schema upgrade is complete only when:

- Prisma migration is deployed and reversible.
- Backfill scripts are executed and verified.
- API and UI consume the new schema paths.
- Reconciliation checks are green.
- Performance regression is within tolerance.
- Audit and trace linkage is validated.

## 10. Immediate next implementation package

Implement now in order:

- Enterprise boundary models: Tenant, LegalEntity, FiscalPeriod.
- Finance control models: PeriodCloseRun, PeriodCloseTask, ConsolidationRun, EliminationEntry.
- Revenue contract models: RevenueContract, PerformanceObligation, RevenueSchedule, RevenueScheduleLine.
- Dimension models: CostCenter, ProfitCenter, DimensionSet, DimensionSetItem.

This package gives the highest Tier-1 leverage with the least disruption.
