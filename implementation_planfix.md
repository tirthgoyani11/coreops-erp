# CoreOps ERP — Full Implementation Plan

> Bringing CoreOps to SAP/Oracle/Dynamics parity (excluding Auth & Security)

---

## Phase 0: Bug Fixes (Priority: Critical)

### Bug 1: Page Refresh Logout

> [!NOTE]
> Already fixed — `sameSite: 'none'` in [authController.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/src/controllers/authController.js). Needs deploy confirmation.

---

### Bug 2: Socket.IO Production URL

#### [MODIFY] [useSocket.ts](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/frontend/src/hooks/useSocket.ts)

```diff
- socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
+ const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api$/, '');
+ socket = io(SOCKET_URL, {
```

---

### Bug 3: SVG Path Errors on Login

#### [MODIFY] [Yeti.tsx](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/frontend/src/components/Yeti.tsx)

- Add null checks on SVG `d` attribute before rendering
- Wrap animated path components in conditional renders: `{d && <path d={d} />}`

---

### Bug 4: Duplicate Serial Number Validation

#### [MODIFY] [assetController.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/src/controllers/assetController.js)

- In `createAsset`: Check `prisma.asset.findFirst({ where: { serialNumber } })` before creation
- Return `409 Conflict` if duplicate found

---

## Phase 1: Maintenance Module Enhancements

### 1.1 Preventive Maintenance Scheduler

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model PreventiveSchedule {
  id              String   @id @default(uuid())
  name            String
  assetId         String?
  asset           Asset?   @relation(fields: [assetId], references: [id])
  assetCategory   AssetCategory?
  officeId        String
  office          Office   @relation(fields: [officeId], references: [id])
  frequency       ScheduleFrequency  // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM
  intervalDays    Int?               // For CUSTOM frequency
  description     String?
  checklist       Json?              // [{ item, required }]
  priority        TicketPriority     @default(MEDIUM)
  estimatedCost   Float?
  assignedToId    String?
  lastExecuted    DateTime?
  nextDue         DateTime
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([nextDue, isActive])
  @@index([officeId])
}

enum ScheduleFrequency {
  DAILY
  WEEKLY
  BIWEEKLY
  MONTHLY
  QUARTERLY
  SEMI_ANNUAL
  YEARLY
  CUSTOM
}
```

#### [NEW] `backend/src/controllers/preventiveController.js`
- `createSchedule` — Create preventive maintenance schedule
- `getSchedules` — List all schedules (with office isolation)
- `updateSchedule` — Update schedule details
- `deleteSchedule` — Soft delete schedule
- `executeSchedule` — Manually trigger a scheduled maintenance ticket
- `getDueSchedules` — Get schedules due today/this week

#### [NEW] `backend/src/routes/preventiveRoutes.js`
- `POST /api/preventive` — Create schedule
- `GET /api/preventive` — List schedules
- `GET /api/preventive/due` — Get due/overdue schedules
- `PATCH /api/preventive/:id` — Update schedule
- `DELETE /api/preventive/:id` — Delete schedule
- `POST /api/preventive/:id/execute` — Execute now (create ticket)

#### [NEW] `backend/src/services/schedulerService.js`
- Cron job (runs every hour) that checks `PreventiveSchedule` for `nextDue <= now()`
- Auto-creates `MaintenanceTicket` with data from the schedule
- Updates `lastExecuted` and calculates `nextDue` based on `frequency`
- Sends notification to assigned technician
- Called from [server.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/server.js) on startup

#### [MODIFY] [server.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/server.js)
- Import and start the scheduler service on boot

#### [MODIFY] [PreventiveMaintenance.tsx](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/frontend/src/pages/PreventiveMaintenance.tsx)
- Connect existing UI to new backend endpoints
- Add schedule creation form with frequency picker
- Add calendar view showing upcoming schedules

---

### 1.2 Recurring Maintenance Calendar

#### [NEW] `frontend/src/pages/MaintenanceCalendar.tsx`
- Full calendar view (monthly/weekly/daily)
- Shows: preventive schedules (blue), active tickets (orange), overdue (red)
- Click on date → see tickets/schedules for that day
- Drag-and-drop reschedule (calls `PATCH /api/preventive/:id`)
- Use `@fullcalendar/react` library

---

### 1.3 SLA Tracking & Escalation

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model SLAPolicy {
  id                String   @id @default(uuid())
  name              String
  priority          TicketPriority
  responseTimeHours Int      // Max hours to first response
  resolutionTimeHours Int    // Max hours to resolution
  escalationLevels  Json     // [{ afterHours, notifyRole, notifyUserId }]
  officeId          String?
  isDefault         Boolean  @default(false)
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  @@index([priority])
}
```

Add to `MaintenanceTicket`:
```prisma
  slaResponseDeadline  DateTime?
  slaResolutionDeadline DateTime?
  slaBreached          Boolean   @default(false)
  firstResponseAt      DateTime?
```

#### [NEW] `backend/src/controllers/slaController.js`
- `createSLAPolicy` — Define SLA rules per priority
- `getSLAPolicies` — List policies
- `checkSLACompliance` — Check if ticket meets SLA

#### [NEW] `backend/src/services/slaService.js`
- On ticket creation: Calculate deadlines based on priority → matching SLA policy
- Cron job (every 15 min): Check tickets approaching SLA breach → send escalation notifications
- Mark tickets as `slaBreached = true` when deadline passes

#### [NEW] `frontend/src/pages/SLADashboard.tsx`
- SLA compliance rate (pie chart)
- Tickets approaching breach (countdown timers)
- SLA breach history table
- SLA policy configuration form

---

### 1.4 Gantt Chart for Scheduling

#### [NEW] `frontend/src/pages/MaintenanceGantt.tsx`
- Gantt view using `gantt-task-react` or `dhtmlx-gantt`
- Rows = technicians, bars = assigned tickets
- Color-coded by priority
- Drag to reassign/reschedule
- Filter by office, technician, date range

---

### 1.5 Predictive Maintenance (ML)

#### [NEW] `backend/src/services/predictiveService.js`
- Collect historical maintenance data per asset: ticket frequency, costs, types
- Calculate MTBF (Mean Time Between Failures) per asset
- Simple regression model: predict next failure date based on last N failures
- Store predictions in `Asset.notes` or new `AssetPrediction` model
- Expose via `GET /api/assets/:id/predictions`

#### [MODIFY] [orchestrator.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/src/services/orchestrator.js)
- Connect `PREDICT_MAINTENANCE` intent to `predictiveService`
- Return predicted failure dates and recommended actions

---

## Phase 2: Inventory Module Enhancements

### 2.1 Batch/Lot Tracking

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model InventoryBatch {
  id              String    @id @default(uuid())
  inventoryId     String
  inventory       Inventory @relation(fields: [inventoryId], references: [id])
  batchNumber     String
  lotNumber       String?
  quantity        Int
  expiryDate      DateTime?
  manufacturingDate DateTime?
  receivedDate    DateTime  @default(now())
  costPerUnit     Float?
  status          String    @default("AVAILABLE") // AVAILABLE, EXPIRED, CONSUMED, QUARANTINE
  notes           String?
  createdAt       DateTime  @default(now())
  @@unique([inventoryId, batchNumber])
  @@index([expiryDate])
  @@index([status])
}
```

#### [MODIFY] [inventoryController.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/src/controllers/inventoryController.js)
- Add batch info to stock-in operations
- Track batch consumption on stock-out (FIFO by default)
- Add `GET /api/inventory/:id/batches` endpoint

#### [NEW] `frontend/src/pages/BatchTracker.tsx`
- View all batches for an inventory item
- Expiry alerts for items nearing expiration
- Batch-level stock movements

---

### 2.2 Serial Number Tracking

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model SerializedUnit {
  id            String    @id @default(uuid())
  inventoryId   String
  inventory     Inventory @relation(fields: [inventoryId], references: [id])
  serialNumber  String    @unique
  status        String    @default("IN_STOCK") // IN_STOCK, ISSUED, RETURNED, DEFECTIVE
  batchId       String?
  issuedToId    String?
  issuedDate    DateTime?
  returnDate    DateTime?
  notes         String?
  createdAt     DateTime  @default(now())
  @@index([inventoryId, status])
}
```

#### [MODIFY] [inventoryController.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/src/controllers/inventoryController.js)
- When `trackingType = 'SERIALIZED'`, require serial numbers on stock-in
- Track individual serial numbers through stock-out

---

### 2.3 Inventory Valuation (FIFO/LIFO/WAC)

#### [NEW] `backend/src/services/valuationService.js`
- `calculateFIFO(inventoryId)` — First In First Out costing
- `calculateLIFO(inventoryId)` — Last In First Out costing
- `calculateWAC(inventoryId)` — Weighted Average Cost
- Reads from `StockMovement` + `InventoryBatch` to compute current value
- Generates valuation report per office

#### [NEW] `frontend/src/pages/InventoryValuation.tsx`
- Valuation method selector (FIFO/LIFO/WAC)
- Total inventory value by office
- Per-item valuation breakdown table
- Comparison view across methods

---

### 2.4 Auto-Reorder (PO Generation)

#### [NEW] `backend/src/services/autoReorderService.js`
- Cron job (daily): Scan all `Inventory` where `currentQuantity <= reorderPoint`
- Group by `primaryVendorId` → create draft `PurchaseOrder` with items
- Set PO quantity = `reorderQuantity`
- Send notification to managers for approval
- Skip if existing draft PO already contains the items

#### [MODIFY] [server.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/server.js)
- Start auto-reorder cron on boot

---

### 2.5 Stocktake / Cycle Counting

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model Stocktake {
  id          String   @id @default(uuid())
  officeId    String
  office      Office   @relation(fields: [officeId], references: [id])
  status      String   @default("DRAFT") // DRAFT, IN_PROGRESS, COMPLETED, CANCELLED
  startedAt   DateTime?
  completedAt DateTime?
  createdById String
  notes       String?
  items       StocktakeItem[]
  createdAt   DateTime @default(now())
  @@index([officeId, status])
}

model StocktakeItem {
  id            String    @id @default(uuid())
  stocktakeId   String
  stocktake     Stocktake @relation(fields: [stocktakeId], references: [id], onDelete: Cascade)
  inventoryId   String
  systemQuantity Int
  countedQuantity Int?
  variance      Int?
  notes         String?
  countedAt     DateTime?
  @@index([stocktakeId])
}
```

#### [NEW] `backend/src/controllers/stocktakeController.js`
- `createStocktake` — Creates stocktake with all inventory items pre-loaded
- `updateCount` — Update counted quantity for individual items
- `completeStocktake` — Finalize, calculate variances, create adjustment `StockMovement`s

#### [NEW] `frontend/src/pages/Stocktake.tsx`
- Start new stocktake wizard
- Mobile-friendly counting interface
- Variance report on completion

---

### 2.6 Inter-Branch Transfers & Returns UI

#### [NEW] `frontend/src/pages/InventoryTransfer.tsx`
- Source office → destination office selector
- Select items and quantities
- Approval workflow for inter-branch
- Creates `StockMovement` type `TRANSFER` at both offices

#### [NEW] `frontend/src/pages/InventoryReturns.tsx`
- Return to vendor form
- Creates `StockMovement` type `RETURN`
- Links to original PO

---

## Phase 3: Procurement Module Enhancements

### 3.1 Purchase Requisitions

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model PurchaseRequisition {
  id              String   @id @default(uuid())
  prNumber        String   @unique
  requestedById   String
  requestedBy     User     @relation(fields: [requestedById], references: [id])
  officeId        String
  office          Office   @relation(fields: [officeId], references: [id])
  status          String   @default("DRAFT") // DRAFT, SUBMITTED, APPROVED, REJECTED, CONVERTED
  priority        String   @default("MEDIUM")
  justification   String?
  requiredByDate  DateTime?
  approvedById    String?
  approvalDate    DateTime?
  convertedToPOId String?
  items           PRItem[]
  totalEstimate   Float?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([officeId, status])
  @@index([requestedById])
}

model PRItem {
  id              String   @id @default(uuid())
  requisitionId   String
  requisition     PurchaseRequisition @relation(fields: [requisitionId], references: [id], onDelete: Cascade)
  inventoryId     String?
  description     String
  quantity        Int
  estimatedPrice  Float?
  suggestedVendorId String?
  notes           String?
  @@index([requisitionId])
}
```

#### [NEW] `backend/src/controllers/requisitionController.js`
- Full CRUD + approval workflow
- `POST /api/requisitions/:id/convert-to-po` — Convert approved PR to PO

#### [NEW] `frontend/src/pages/procurement/PurchaseRequisitions.tsx`
- PR creation form with line items
- Approval queue for managers
- Convert-to-PO button on approved PRs

---

### 3.2 RFQ (Request for Quotation) & Vendor Bid Comparison

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model RFQ {
  id            String   @id @default(uuid())
  rfqNumber     String   @unique
  title         String
  description   String?
  officeId      String
  requiredByDate DateTime?
  status        String   @default("DRAFT") // DRAFT, SENT, CLOSED, AWARDED
  items         RFQItem[]
  quotations    VendorQuotation[]
  awardedVendorId String?
  createdById   String
  createdAt     DateTime @default(now())
  @@index([status])
}

model RFQItem {
  id          String @id @default(uuid())
  rfqId       String
  rfq         RFQ    @relation(fields: [rfqId], references: [id], onDelete: Cascade)
  description String
  quantity    Int
  unit        String @default("pieces")
  specs       String?
  @@index([rfqId])
}

model VendorQuotation {
  id          String   @id @default(uuid())
  rfqId       String
  rfq         RFQ      @relation(fields: [rfqId], references: [id], onDelete: Cascade)
  vendorId    String
  vendor      Vendor   @relation(fields: [vendorId], references: [id])
  totalAmount Float
  currency    String   @default("INR")
  validUntil  DateTime?
  items       Json     // [{ rfqItemId, unitPrice, totalPrice, notes }]
  attachments String[]
  status      String   @default("SUBMITTED") // SUBMITTED, ACCEPTED, REJECTED
  submittedAt DateTime @default(now())
  @@index([rfqId, vendorId])
}
```

#### [NEW] `backend/src/controllers/rfqController.js`
- Create RFQ, send to vendors, receive quotations
- Side-by-side comparison endpoint: `GET /api/rfq/:id/compare`
- Award to vendor → auto-create PO

#### [NEW] `frontend/src/pages/procurement/RFQList.tsx` & `RFQDetail.tsx`
- RFQ creation wizard
- Vendor quotation entry
- **Comparison table** with price, delivery time, vendor rating side-by-side

---

### 3.3 Goods Receipt Note (GRN) & Partial Receiving

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model GoodsReceipt {
  id              String   @id @default(uuid())
  grnNumber       String   @unique
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  receivedById    String
  officeId        String
  status          String   @default("DRAFT") // DRAFT, INSPECTING, ACCEPTED, PARTIAL, REJECTED
  receivedDate    DateTime @default(now())
  items           GRNItem[]
  notes           String?
  createdAt       DateTime @default(now())
  @@index([purchaseOrderId])
}

model GRNItem {
  id              String       @id @default(uuid())
  grnId           String
  grn             GoodsReceipt @relation(fields: [grnId], references: [id], onDelete: Cascade)
  poItemId        String
  quantityReceived Int
  quantityAccepted Int?
  quantityRejected Int?
  rejectionReason  String?
  batchNumber      String?
  @@index([grnId])
}
```

#### [NEW] `backend/src/controllers/grnController.js`
- `createGRN` — Create GRN from PO, update `PurchaseOrderItem.receivedQuantity`
- Auto-update `Inventory.currentQuantity` on acceptance
- Create `StockMovement` type `STOCK_IN`
- Partial receiving: PO stays `PARTIALLY_RECEIVED` until all items complete

#### [NEW] `frontend/src/pages/procurement/GoodsReceipt.tsx`
- Select PO → shows pending items with quantities
- Enter received quantities, accept/reject per item
- Quality inspection workflow

---

### 3.4 PO Amendment History

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model POAmendment {
  id              String   @id @default(uuid())
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  amendmentNumber Int
  changes         Json     // { field, oldValue, newValue }
  reason          String?
  amendedById     String
  createdAt       DateTime @default(now())
  @@index([purchaseOrderId])
}
```

#### [MODIFY] [purchaseOrderController.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/src/controllers/purchaseOrderController.js)
- On PO update: Create `POAmendment` record with diff
- `GET /api/purchase-orders/:id/amendments` — View amendment history

---

## Phase 4: Finance & GL Enhancements

### 4.1 Accounts Payable / Receivable Aging

#### [NEW] `backend/src/controllers/apArController.js`
- `GET /api/finance/ap-aging` — AP aging report (current, 30, 60, 90, 90+ days)
- `GET /api/finance/ar-aging` — AR aging report
- Groups invoices by vendor/customer and age bucket
- Calculated from `Invoice.dueDate` vs current date

#### [NEW] `frontend/src/pages/financial/APAging.tsx` & `ARAging.tsx`
- Aging buckets table with totals
- Drill-down to individual invoices
- Color-coded overdue indicators

---

### 4.2 Tax Calculation Engine (GST/VAT)

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model TaxRate {
  id        String   @id @default(uuid())
  name      String   // "GST 18%", "IGST 12%", "VAT 5%"
  code      String   @unique // "GST18", "IGST12"
  rate      Float    // 18.0, 12.0
  type      String   // GST, IGST, SGST, CGST, VAT, CUSTOM
  isDefault Boolean  @default(false)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}
```

#### [NEW] `backend/src/services/taxService.js`
- `calculateTax(amount, taxRateId)` → returns `{ taxAmount, totalWithTax, breakdown }`
- Auto-split GST into CGST+SGST for intra-state
- Apply to PO items, invoices, transactions

#### [MODIFY] [purchaseOrderController.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/src/controllers/purchaseOrderController.js), [financeController.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/src/controllers/financeController.js)
- Integrate tax calculation into PO total and transaction amounts

---

### 4.3 Balance Sheet Report

#### [MODIFY] [glController.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/src/controllers/glController.js)
- Add `GET /api/gl/balance-sheet` endpoint
- Query GL accounts by type (ASSET, LIABILITY, EQUITY)
- Calculate totals, verify Assets = Liabilities + Equity

#### [NEW] `frontend/src/pages/financial/BalanceSheet.tsx`
- Standard balance sheet format
- Date-range selector
- PDF export

---

### 4.4 Bank Reconciliation

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model BankStatement {
  id          String   @id @default(uuid())
  bankName    String
  accountNumber String
  statementDate DateTime
  entries     BankEntry[]
  uploadedById String
  officeId    String
  status      String   @default("PENDING") // PENDING, RECONCILED
  createdAt   DateTime @default(now())
  @@index([officeId, status])
}

model BankEntry {
  id              String   @id @default(uuid())
  statementId     String
  statement       BankStatement @relation(fields: [statementId], references: [id], onDelete: Cascade)
  date            DateTime
  description     String
  amount          Float
  type            String   // DEBIT, CREDIT
  reference       String?
  matchedTransactionId String?
  isReconciled    Boolean  @default(false)
  @@index([statementId])
}
```

#### [NEW] `backend/src/controllers/bankReconciliationController.js`
- Upload bank statement (CSV/OFX parser)
- Auto-match bank entries with `Transaction` records by amount + date
- Manual match for unmatched items
- Mark as reconciled

#### [NEW] `frontend/src/pages/financial/BankReconciliation.tsx`
- Upload statement file
- Split view: bank entries (left) vs system transactions (right)
- Auto-matched items highlighted
- Drag-and-drop manual matching

---

### 4.5 Financial Year Closing

#### [NEW] `backend/src/controllers/yearEndController.js`
- `POST /api/finance/year-close` — Close financial year
  - Verify all journal entries are posted
  - Calculate net income (Revenue - Expenses)
  - Create closing journal entry: Debit Revenue accounts, Credit Expense accounts, net to Retained Earnings
  - Lock all transactions before closing date
  - Reset revenue/expense account balances

#### [NEW] `frontend/src/pages/financial/YearEndClose.tsx`
- Pre-close checklist (unposted entries, unreconciled items)
- Preview closing journal entry
- One-click close with confirmation

---

### 4.6 Expense Claims & Reimbursement

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model ExpenseClaim {
  id            String   @id @default(uuid())
  claimNumber   String   @unique
  employeeId    String
  employee      User     @relation(fields: [employeeId], references: [id])
  officeId      String
  status        String   @default("DRAFT") // DRAFT, SUBMITTED, APPROVED, REJECTED, PAID
  totalAmount   Float    @default(0)
  currency      String   @default("INR")
  description   String?
  items         ExpenseItem[]
  approvedById  String?
  approvalDate  DateTime?
  paidDate      DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([employeeId, status])
  @@index([officeId])
}

model ExpenseItem {
  id          String   @id @default(uuid())
  claimId     String
  claim       ExpenseClaim @relation(fields: [claimId], references: [id], onDelete: Cascade)
  date        DateTime
  category    String   // TRAVEL, FOOD, ACCOMMODATION, SUPPLIES, OTHER
  description String
  amount      Float
  receipt     String?  // File URL
  @@index([claimId])
}
```

#### [NEW] `backend/src/controllers/expenseClaimController.js`
- Full CRUD + approval workflow + conversion to Transaction on payout

#### [NEW] `frontend/src/pages/financial/ExpenseClaims.tsx`
- Claim creation form with receipt upload
- Manager approval queue
- Employee claim history

---

## Phase 5: Vendor Module Enhancements

### 5.1 Contract Management

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model VendorContract {
  id            String   @id @default(uuid())
  contractNumber String  @unique
  vendorId      String
  vendor        Vendor   @relation(fields: [vendorId], references: [id])
  officeId      String
  type          String   // SERVICE, SUPPLY, MAINTENANCE, LEASE
  startDate     DateTime
  endDate       DateTime
  value         Float?
  currency      String   @default("INR")
  renewalType   String   @default("MANUAL") // AUTO, MANUAL, NONE
  autoRenewDays Int?
  terms         String?
  attachments   String[]
  status        String   @default("ACTIVE") // DRAFT, ACTIVE, EXPIRED, TERMINATED
  reminderDays  Int      @default(30)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([vendorId])
  @@index([status, endDate])
}
```

#### [NEW] `backend/src/controllers/contractController.js`
- CRUD operations
- Expiry alerts (cron: notify `reminderDays` before `endDate`)
- Auto-renewal logic

#### [NEW] `frontend/src/pages/procurement/ContractList.tsx` & `ContractDetail.tsx`

---

### 5.2 Vendor Onboarding Workflow

#### [MODIFY] [vendorController.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/src/controllers/vendorController.js)
- Add `onboardingStatus` field: `PENDING_INFO → PENDING_DOCS → UNDER_REVIEW → APPROVED → ACTIVE`
- Checklist of required documents (GST cert, PAN, bank details)
- Approval by manager before vendor becomes active

#### [MODIFY] [Vendors.tsx](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/frontend/src/pages/Vendors.tsx)
- Add onboarding progress tracker
- Document checklist with upload status

---

### 5.3 Enhanced Vendor Performance Dashboard

#### [MODIFY] existing vendor reliability page
- Add: on-time delivery rate, quality rejection rate, price competitiveness
- Data sourced from: `GoodsReceipt` (delivery), `GRNItem.quantityRejected` (quality), `VendorQuotation` (pricing)
- Radar chart comparing vendors across dimensions

---

## Phase 6: Analytics & Reporting Enhancements

### 6.1 PDF Export

#### [NEW] `backend/src/services/pdfService.js`
- Use `puppeteer` or `pdfkit` to generate PDFs from report data
- Templates: P&L, Balance Sheet, Asset Register, Inventory Valuation
- `GET /api/reports/:type/pdf?dateFrom=&dateTo=`

---

### 6.2 Scheduled Report Emails

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model ScheduledReport {
  id          String   @id @default(uuid())
  name        String
  reportType  String   // PL, BALANCE_SHEET, ASSET_REGISTER, INVENTORY
  frequency   String   // DAILY, WEEKLY, MONTHLY
  recipients  String[] // Email addresses
  officeId    String?
  filters     Json?
  lastSentAt  DateTime?
  nextSendAt  DateTime
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  @@index([nextSendAt, isActive])
}
```

#### [NEW] `backend/src/services/reportSchedulerService.js`
- Cron job: Generate PDF → send via `emailService`

---

### 6.3 KPI Tracking with Targets

#### [MODIFY] [schema.prisma](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/prisma/schema.prisma)

```prisma
model KPITarget {
  id          String   @id @default(uuid())
  name        String
  metric      String   // MTTR, MTBF, INVENTORY_TURNOVER, BUDGET_VARIANCE, etc.
  targetValue Float
  currentValue Float   @default(0)
  unit        String   // hours, days, %, count
  period      String   // MONTHLY, QUARTERLY, YEARLY
  officeId    String?
  isActive    Boolean  @default(true)
  updatedAt   DateTime @updatedAt
  @@index([metric, officeId])
}
```

#### [NEW] `frontend/src/pages/KPIDashboard.tsx`
- KPI cards with progress bars (actual vs target)
- Trend charts over time
- Red/amber/green status indicators

---

### 6.4 Drill-Down Dashboards

#### [MODIFY] Existing dashboard components
- Make chart data points clickable
- Click → navigate to filtered list view
- Example: Click "MAINTENANCE" slice in asset pie chart → navigates to `/assets?status=MAINTENANCE`

---

### 6.5 Excel Export

#### [NEW] `backend/src/services/excelService.js`
- Use `exceljs` library for `.xlsx` generation
- Styled headers, auto-column widths, formatted numbers
- Apply to all export endpoints alongside existing CSV

---

## Phase 7: AI Enhancements

### 7.1 AI-Generated Insight Emails

#### [NEW] `backend/src/services/insightService.js`
- Weekly cron job that:
  1. Collects data snapshots (assets, tickets, spending, inventory)
  2. Sends to LLM via `kaggleService.reasoning()` with prompt: "Analyze this week's ERP data and provide top 5 insights"
  3. Formats response into email template
  4. Sends to managers via `emailService`

---

### 7.2 Connect All New Features to OpsPilot

#### [MODIFY] [orchestrator.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/src/services/orchestrator.js)
- Add new intents to `INTENT_PATTERNS`:
  - `CREATE_PREVENTIVE_SCHEDULE`: "schedule maintenance", "preventive schedule"
  - `CREATE_REQUISITION`: "request purchase", "need to buy"
  - `CREATE_RFQ`: "request quotes", "get quotations"
  - `SUBMIT_EXPENSE`: "expense claim", "reimburse"
  - `CHECK_SLA`: "sla status", "breach tickets"

#### [MODIFY] [agentExecutor.js](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/backend/src/services/agentExecutor.js)
- Add handlers for all new intents

---

## Verification Plan

### Automated Verification
No existing test files found. We should create a test suite:

#### [NEW] `backend/tests/` directory with:
- `preventive.test.js` — Test schedule creation, auto-ticket generation, frequency calculation
- `sla.test.js` — Test deadline calculation, breach detection
- `inventory.test.js` — Test batch tracking, valuation, auto-reorder
- `procurement.test.js` — Test PR→PO conversion, GRN partial receiving, RFQ flow
- `finance.test.js` — Test tax calculation, aging reports, year-end close

Run with: `cd backend && npx jest` (after adding `jest` to devDependencies)

### Manual Verification
Since these are major feature additions, each phase should be verified by:

1. **Start dev server**: `cd backend && npm run dev` + `cd frontend && npm run dev`
2. **Test each new page** in browser at `http://localhost:5173`
3. **Create seed data** via OpsPilot commands or direct API calls
4. **Verify office isolation** by logging in as different roles
5. **User to verify**: After each phase, deploy to Vercel/Render and test on production

> [!IMPORTANT]
> This plan should be implemented **one phase at a time**. Each phase should be committed, deployed, and tested before starting the next. Estimated total effort: **4-6 weeks** for a single developer.
