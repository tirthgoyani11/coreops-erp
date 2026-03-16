# CoreOps ERP — Ultimate Implementation Plan
## Full Enterprise Feature Roadmap (12 Categories, 20 Phases)

---

## 📊 Current State Audit

After auditing **29 controllers, 27 route files, 15 services, 76 frontend pages, and 1,404 lines of Prisma schema**, here is the complete feature map:

### ✅ Already Built (No Work Needed)

| Category | Feature | Backend | Frontend |
|---|---|:---:|:---:|
| Finance | General Ledger + Chart of Accounts | ✅ `glController` | ✅ `GLDashboard` |
| Finance | Accounts Payable / Receivable | ✅ `apArController` | ✅ `ARAging` |
| Finance | Bank Reconciliation | ✅ `bankReconciliationController` | ✅ `BankReconciliation` |
| Finance | Trial Balance / Balance Sheet | ✅ `glController` | ✅ `BalanceSheet` |
| Finance | Year-End Close | ✅ `yearEndController` | ✅ `YearEndClose` |
| Finance | Expense Claims | ✅ `expenseController` | ✅ `ExpenseClaims` |
| Finance | Multi-Currency + Live Rates | ✅ `currencyService` | ✅ Integrated |
| Finance | Tax/GST Engine | ✅ `taxService` | ✅ Integrated |
| Finance | Audit Trail | ✅ `auditMiddleware` | ✅ `AuditLogs` |
| Procurement | Purchase Requisitions | ✅ `requisitionController` | ✅ `PurchaseRequisitions` |
| Procurement | RFQ + Vendor Quotations | ✅ `rfqController` | ✅ `RFQManagement` |
| Procurement | Purchase Orders | ✅ `purchaseOrderController` | ✅ `PurchaseOrders` |
| Procurement | GRN + 3-Way Matching | ✅ `grnController` | ✅ `GRN` |
| Procurement | Vendor Management | ✅ `vendorController` | ✅ `Vendors` |
| Inventory | Inventory Management | ✅ `inventoryController` | ✅ `Inventory` |
| Inventory | Batch Tracking | ✅ `batchController` | ✅ `BatchTracker` |
| Inventory | Serial Tracking | ✅ Schema: `SerializedUnit` | ✅ Integrated |
| Inventory | QR/Barcode | ✅ `qrcode` lib | ✅ `ScanQR` |
| Inventory | Stock Transfers | ✅ `StockMovement` model | ✅ `InventoryTransfer` |
| Inventory | Stock Adjustments | ✅ `StockMovement: ADJUSTMENT` | ✅ `StockOperations` |
| Inventory | Cycle Counting | ✅ `stocktakeController` | ✅ `Stocktake` |
| Inventory | Reorder Automation | ✅ `autoReorderService` | — |
| Assets | Asset Register + Lifecycle | ✅ `assetController` | ✅ `Assets`, `AssetDetail` |
| Assets | Preventive Maintenance | ✅ `preventiveController` | ✅ `PreventiveMaintenance` |
| Assets | Work Orders / Tickets | ✅ `maintenanceController` | ✅ `Maintenance`, `TicketWizard` |
| Assets | SLA Policies | ✅ `slaController` | ✅ `SLADashboard` |
| Assets | Spare Parts Inventory | ✅ `SparePartUsage` model | ✅ Integrated |
| AI | LLM Integration (Ollama) | ✅ `aiService` | Partial |
| AI | OCR Invoice Scanning | ✅ `ocrService` | — |
| AI | Predictive Maintenance | ✅ `predictiveService` | — |
| Security | RBAC | ✅ `authorize.js` | ✅ `roleConfig.ts` |
| Security | Rate Limiting | ✅ `rateLimiter.js` | — |
| Infra | Real-time WebSocket | ✅ Socket.io | ✅ Integrated |
| Infra | Multi-Office / Multi-Tenant | ✅ `filterByOffice.js` | ✅ Integrated |
| UX | Global Search | ✅ `searchController` | ✅ `CommandPalette` |
| UX | Keyboard Shortcuts | — | ✅ Ctrl+K |
| UX | Dark Mode | — | ✅ CSS Variables |
| UX | Notifications | ✅ `notificationController` | ✅ `Notifications` |
| Email | All notification types | ✅ `emailService` | — |
| Scheduling | Cron jobs (PM, SLA, Reorder) | ✅ `schedulerService` | — |

### ❌ Missing Features (Organized by Phase)

---

## Phase 1: Data Integrity & Consistency ✅ DONE
> Already completed. Fixed asset value discrepancies and consolidated formatCurrency.

---

## Phase 2: Surface Existing AI/ML in the UI
> Backend has AI, OCR, and Predictive services — but no frontend pages expose them.

### 2.1 AI Copilot in Command Palette
#### [MODIFY] [CommandPalette.tsx](file:///c:/Users/tirth/Desktop/Mini%20project/coreops-erp/frontend/src/components/ui/CommandPalette.tsx)
- `?` prefix triggers AI mode → "Show overdue invoices", "Generate P&L report"
- Connect to `/api/ai/query` → display response with typing animation
- Support follow-up questions within the palette

### 2.2 Predictive Maintenance Dashboard
#### [NEW] `PredictiveDashboard.tsx`
- Fleet risk heatmap from `/api/maintenance/fleet-risk`
- Per-asset failure prediction cards (MTBF, next failure date, R² confidence)
- Risk distribution pie chart

### 2.3 OCR Invoice Scanner
#### [NEW] `InvoiceScanner.tsx`
- Drag-drop upload zone → calls `/api/ocr/scan-invoice`
- Extracted fields: vendor, invoice #, date, total with confidence scores
- "Create Expense Claim" / "Create PO" buttons pre-filled from OCR data

---

## Phase 3: Enhanced Audit & Compliance
> Current audit logs are action-level. Enterprise needs field-level diffs.

### 3.1 Field-Level Change Tracking
#### [MODIFY] `auditMiddleware.js`
- Capture before/after values as JSON diff: `[{ field, old, new }]`
- Store in existing `AuditLog.changes` JSON column

### 3.2 Audit Logs UI Upgrade
#### [MODIFY] `AuditLogs.tsx`
- Expandable rows with color-coded before/after diffs
- Date range, user, and resource type filters
- CSV export for SOX/ISO compliance reporting

---

## Phase 4: Workflow Engine & Custom Fields
> Enterprise ERPs allow no-code automation. Currently hardcoded.

### 4.1 Rule-Based Workflow System
#### [NEW] Backend: `workflowEngine.js` + `WorkflowRule` Prisma model
- JSON rules: `if amount > 5000 → require_approval_from(CFO)`
- Actions: `require_approval`, `send_email`, `auto_assign`, `block`

#### [NEW] `WorkflowBuilder.tsx`
- Visual rule builder with dropdowns for conditions/actions
- Enable/disable toggle, preview matching records

### 4.2 Dynamic Custom Fields (UDF)
#### [NEW] Backend: `CustomFieldDefinition` + `CustomFieldValue` models
#### [NEW] `<DynamicFields entityType="ASSET" entityId={id} />`
- Auto-renders fields on Asset, Inventory, and User detail pages

---

## Phase 5: Dashboard Personalization
### 5.1 Widget System
#### [NEW] `DashboardConfigurator.tsx`
- Drag-and-drop grid layout (`react-grid-layout`)
- Widgets: Stats, Charts, Approval Queue, AI Insights, Quick Actions
- Save layout per user

### 5.2 KPI Alerts
#### [NEW] Backend: `kpiAlertService.js`
- Threshold alerts: "When low stock > 5", "When pending approvals > 10"

---

## Phase 6: API Gateway & Webhooks
### 6.1 API Key Management
#### [NEW] `ApiKey` model + auth middleware for `X-API-Key` header
#### [NEW] `ApiKeySettings.tsx` — generate/revoke keys

### 6.2 Outgoing Webhooks
#### [NEW] `Webhook` model + dispatcher with retry logic
#### [NEW] `WebhookSettings.tsx` — register URLs, select events, view delivery log

---

## Phase 7: Final Polish & Production
### 7.1 Error Boundaries + Empty States
### 7.2 Onboarding Tour (`react-joyride`)
### 7.3 Accessibility (aria-labels, keyboard nav, WCAG AA)
### 7.4 Code Splitting (`React.lazy` + `Suspense`)

---

## Phase 8: Automated Depreciation Engine
> Schema has depreciation fields but no automated runner.

### 8.1 Monthly Depreciation Scheduler
#### [NEW] `depreciationService.js`
- Straight Line: `(purchase - salvage) / (life * 12)`
- Declining Balance: `bookValue * (rate / 12 / 100)`
- Auto-create JournalEntry for depreciation expense

### 8.2 Asset Lifecycle Timeline
#### [NEW] `AssetTimeline.tsx` — visual timeline on AssetDetail page

---

## Phase 9: Budget Enforcement
### 9.1 Budget Guard Middleware
#### [NEW] `budgetGuard.js`
- Block POs exceeding budget with clear error
- 90% threshold warning to Finance Manager

### 9.2 Budget Dashboard
#### [NEW] `BudgetDashboard.tsx`
- Budget vs actual per category, drill-down, YoY comparison

---

## Phase 10: Contract Lifecycle Management
### 10.1 Contracts Page
#### [NEW] `Contracts.tsx` — table, color-coded status, CRUD modal

### 10.2 Contract Renewal Scheduler
#### [MODIFY] `schedulerService.js` — daily expiry check + auto-renewal

---

## Phase 11: Advanced Reporting & Export
### 11.1 Report Templates
#### [NEW] `reportController.js`
- Asset Register, Maintenance Cost, Inventory Movement, Vendor Performance, P&L, Cash Flow
- CSV, PDF (`pdfkit`), Excel (`xlsx`) export

### 11.2 Report Builder UI
#### [NEW] `Reports.tsx` — card grid, date range + office filter + format selector

---

## Phase 12: Sales & Order Management 🆕
> **Entirely missing.** Top-tier ERPs like SAP/NetSuite require this.

### 12.1 Schema
#### [NEW] Prisma models:
- `Customer` — name, email, phone, address, creditLimit, status
- `SalesOrder` — orderNumber, customerId, items[], status, totalAmount
- `SalesOrderItem` — inventoryId, quantity, unitPrice, discount
- `PricingRule` — name, type(PERCENTAGE/FLAT), value, conditions
- `Quotation` — quotationNumber, customerId, items[], validUntil, status

### 12.2 Backend
#### [NEW] `salesController.js`, `customerController.js`, `quotationController.js`
- Full CRUD for customers, quotations, and sales orders
- Order fulfillment: auto-deduct inventory on shipment
- Revenue recognition logic

### 12.3 Frontend
#### [NEW] `Customers.tsx`, `SalesOrders.tsx`, `Quotations.tsx`
- Customer portal (read-only order tracking)
- Pricing rules management in Settings

---

## Phase 13: HR & Workforce Module 🆕
> **Entirely missing.** Enterprise ERPs require employee management.

### 13.1 Schema
#### [NEW] Prisma models:
- `Employee` — extends User with: department, designation, dateOfJoining, salary, bankDetails
- `Attendance` — employeeId, date, checkIn, checkOut, status(PRESENT/ABSENT/HALF_DAY)
- `LeaveRequest` — employeeId, leaveType, fromDate, toDate, status, approvedById
- `LeaveBalance` — employeeId, leaveType, total, used, remaining
- `PayrollRun` — month, year, status, totalGross, totalNet
- `PaySlip` — employeeId, payrollRunId, basic, allowances, deductions, net

### 13.2 Backend
#### [NEW] `hrController.js`, `attendanceController.js`, `payrollController.js`, `leaveController.js`

### 13.3 Frontend
#### [NEW] `Employees.tsx`, `Attendance.tsx`, `LeaveManagement.tsx`, `Payroll.tsx`
- Employee directory with search/filter
- Attendance calendar view
- Leave balance dashboard
- Payroll run wizard with payslip generation

---

## Phase 14: Cost Centers & Profit Centers 🆕
> Missing financial dimension tracking.

### 14.1 Schema + Backend
#### [NEW] `CostCenter` model — code, name, managerId, budget
#### [NEW] `ProfitCenter` model — code, name, revenueTarget
- Tag transactions, POs, and expenses with cost/profit center
- Financial consolidation report per center

### 14.2 Frontend
#### [NEW] `CostCenters.tsx`, `ProfitCenters.tsx`
- Budget vs actual per center dashboard

---

## Phase 15: Cash Flow & Financial Consolidation 🆕

### 15.1 Cash Flow Statement
#### [NEW] `cashFlowController.js`
- Operations: net income + adjustments
- Investing: asset purchases/sales
- Financing: loans, equity changes
#### [NEW] `CashFlow.tsx`

### 15.2 Intercompany Transactions
#### [NEW] `intercompanyController.js`
- Office-to-office transfers with elimination entries
- Consolidated P&L and Balance Sheet across all offices

---

## Phase 16: Security & Identity 🆕

### 16.1 SSO / SAML Integration
#### [NEW] Backend: `passport-saml` + Google/Microsoft OAuth
- Login with Google, Microsoft, or SAML provider
- Auto-provision users from SSO directory

### 16.2 Multi-Factor Authentication (MFA)
#### [NEW] Backend: `speakeasy` (TOTP) + QR code setup
#### [NEW] `MFASetup.tsx` — QR scan + verification
- Enforce MFA for ADMIN+ roles

### 16.3 Field-Level Permissions
#### [MODIFY] `authorize.js`
- Per-field visibility rules: e.g., STAFF can't see `purchasePrice`
- `hideFields` middleware that strips restricted fields from responses

---

## Phase 17: Advanced AI Features 🆕

### 17.1 AI Finance
- **Fraud detection**: Flag anomalous transactions (Z-score on amount/frequency)
- **Expense auto-categorization**: AI assigns categories to expense claims
- **Invoice auto-coding**: Map invoice line items to GL accounts

### 17.2 AI Procurement
- **Vendor recommendation**: Score vendors by history, delivery time, quality
- **Price anomaly detection**: Flag PO unit prices outside historical range
- **Contract risk detection**: NLP analysis of contract terms

### 17.3 AI Inventory
- **Demand forecasting**: Time-series prediction for inventory items
- **Stockout prediction**: Days-to-stockout based on consumption rate
- **Dynamic reorder suggestions**: AI-adjusted reorder points

### 17.4 AI Document Processing
- **OCR + field extraction** (already exists, just needs UI — Phase 2)
- **Contract clause parsing**: Extract key terms, dates, renewal conditions
- **Receipt extraction**: Auto-extract vendor, amount, date from receipt photos

---

## Phase 18: PWA & Mobile 🆕

### 18.1 PWA Setup
#### [NEW] `manifest.json` + Service Worker (Workbox)
- "Add to Home Screen" prompt
- Offline caching for Dashboard, Assets, Tickets

### 18.2 Mobile-Optimized Views
- Responsive card layouts for all data tables
- Bottom navigation bar for mobile
- Camera QR scanning
- GPS-based asset location logging for field technicians

---

## Phase 19: Developer Platform 🆕

### 19.1 REST API Documentation
#### [NEW] Auto-generated OpenAPI/Swagger docs at `/api/docs`
- All endpoints documented with request/response schemas
- Test sandbox

### 19.2 Plugin System
#### [NEW] Backend: Plugin loader + hook system
- Plugins register hooks: `onAssetCreated`, `onPOApproved`, `onTicketClosed`
- Third-party developers can build extensions

### 19.3 GraphQL Layer (Optional)
#### [NEW] `apollo-server-express` wrapper over existing REST endpoints
- Single endpoint for complex frontend queries
- Reduces over-fetching for dashboard components

---

## Phase 20: Industry Modules 🆕

### 20.1 Manufacturing (Future)
- Bill of Materials (BOM)
- Production Planning
- Material Requirements Planning (MRP)

### 20.2 Retail (Future)
- Point of Sale (POS)
- Store Inventory
- Pricing & Promotions engine

### 20.3 Healthcare (Future)
- Medical Asset Tracking
- Compliance (HIPAA)

> These are long-term modules. The core platform (Phases 1–19) must be complete first.

---

## Full Feature Coverage Matrix

| # | Feature | SAP | NetSuite | Odoo | CoreOps Now | After Plan |
|---|---|:---:|:---:|:---:|:---:|:---:|
| 1 | General Ledger | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | AP/AR Aging | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | Bank Reconciliation | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | Trial Balance | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Year-End Close | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Depreciation Engine | ✅ | ✅ | ✅ | Schema | ✅ P8 |
| 7 | Budget Enforcement | ✅ | ✅ | ✅ | Schema | ✅ P9 |
| 8 | Cost/Profit Centers | ✅ | ✅ | ✅ | ❌ | ✅ P14 |
| 9 | Cash Flow Statement | ✅ | ✅ | ✅ | ❌ | ✅ P15 |
| 10 | Financial Consolidation | ✅ | ✅ | ✅ | ❌ | ✅ P15 |
| 11 | Multi-Currency | ✅ | ✅ | ✅ | ✅ | ✅ |
| 12 | Tax/GST Engine | ✅ | ✅ | ✅ | ✅ | ✅ |
| 13 | Expense Claims | ✅ | ✅ | ✅ | ✅ | ✅ |
| 14 | Purchase Requisitions | ✅ | ✅ | ✅ | ✅ | ✅ |
| 15 | RFQ + Quotations | ✅ | ✅ | ✅ | ✅ | ✅ |
| 16 | Purchase Orders | ✅ | ✅ | ✅ | ✅ | ✅ |
| 17 | GRN + 3-Way Match | ✅ | ✅ | ✅ | ✅ | ✅ |
| 18 | Vendor Contracts | ✅ | ✅ | Plugin | Schema | ✅ P10 |
| 19 | Vendor Portal | ✅ | ✅ | ✅ | ❌ | ✅ P6 |
| 20 | Inventory (Batch/Serial) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 21 | Stocktake | ✅ | ✅ | ✅ | ✅ | ✅ |
| 22 | Auto-Reorder | ✅ | ✅ | ❌ | ✅ | ✅ |
| 23 | Sales Orders | ✅ | ✅ | ✅ | ❌ | ✅ P12 |
| 24 | Customer Management | ✅ | ✅ | ✅ | ❌ | ✅ P12 |
| 25 | Pricing Rules | ✅ | ✅ | ✅ | ❌ | ✅ P12 |
| 26 | Asset Management | ✅ | ✅ | ✅ | ✅ | ✅ |
| 27 | Predictive Maintenance | ❌ | ❌ | ❌ | ✅ Backend | ✅ P2 |
| 28 | Preventive Scheduling | Plugin | Plugin | ❌ | ✅ | ✅ |
| 29 | SLA Policies | Plugin | Plugin | ❌ | ✅ | ✅ |
| 30 | HR / Payroll | ✅ | ✅ | ✅ | ❌ | ✅ P13 |
| 31 | Attendance / Leave | ✅ | ✅ | ✅ | ❌ | ✅ P13 |
| 32 | AI Copilot / NLP | ❌ | ❌ | ❌ | ✅ Backend | ✅ P2 |
| 33 | AI Finance (Fraud) | ❌ | ❌ | ❌ | ❌ | ✅ P17 |
| 34 | AI Procurement | ❌ | ❌ | ❌ | ❌ | ✅ P17 |
| 35 | AI Inventory (Forecast) | ❌ | ❌ | ❌ | ❌ | ✅ P17 |
| 36 | OCR Document Processing | Plugin | Plugin | ✅ | ✅ Backend | ✅ P2 |
| 37 | Workflow Builder | ✅ | ✅ | ✅ | ❌ | ✅ P4 |
| 38 | Custom Fields (UDF) | ✅ | ✅ | ✅ | ❌ | ✅ P4 |
| 39 | Report Builder | ✅ | ✅ | ✅ | Partial | ✅ P11 |
| 40 | Field-Level Audit | ✅ | ✅ | ❌ | Action-level | ✅ P3 |
| 41 | SSO + MFA | ✅ | ✅ | ✅ | ❌ | ✅ P16 |
| 42 | Field-Level Permissions | ✅ | ✅ | ❌ | ❌ | ✅ P16 |
| 43 | REST API | ✅ | ✅ | ✅ | ✅ | ✅ |
| 44 | Webhooks | ✅ | ✅ | ✅ | ❌ | ✅ P6 |
| 45 | API Documentation | ✅ | ✅ | ✅ | ❌ | ✅ P19 |
| 46 | Plugin System | ✅ | ✅ | ✅ | ❌ | ✅ P19 |
| 47 | Dashboard Widgets | ✅ | ✅ | ✅ | ❌ | ✅ P5 |
| 48 | Mobile / PWA | App | App | App | Responsive | ✅ P18 |
| 49 | Premium UI/UX | ❌ | ❌ | ❌ | ✅ | ✅ |
| 50 | WebSocket Real-time | ❌ | ❌ | ✅ | ✅ | ✅ |

---

## Priority Breakdown

| Priority | Phases | Why |
|---|---|---|
| 🔴 **Critical** | 2, 3, 4, 8, 9 | Surface existing features + core enterprise controls |
| 🟡 **High** | 5, 6, 10, 11, 12, 13 | Sales, HR, and integrations unlock enterprise use |
| 🟠 **Medium** | 7, 14, 15, 16, 17 | Financial depth, security, and AI differentiation |
| 🟢 **Future** | 18, 19, 20 | Mobile, developer ecosystem, industry verticals |

> **After all 20 phases, CoreOps will be the only AI-native ERP with feature parity to SAP/NetSuite plus capabilities they don't have (predictive maintenance, LLM copilot, OCR).**
