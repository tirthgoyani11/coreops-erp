# 11: Financial & Accounting Module

## 11.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 8 |
| **Phase** | 2 |
| **Models** | Transaction |
| **Key Feature** | OCR invoice scanning, multi-currency, bank reconciliation, budget tracking |

---

## 11.2 Screen: Transactions List
**URL**: `/financial`  |  **Access**: Manager+

### Quick Stats
| Total Txns | Income | Expenses | Net | Pending Reconciliation |

### Table
| Column | Type |
|--------|------|
| Transaction ID | Text (clickable) |
| Date | Date |
| Type | Badge (Income/Expense/Transfer/Journal) |
| Category | Text |
| Description | Text (truncated) |
| Amount | Currency (green for income, red for expense) |
| Account | Text |
| Status | Badge (Pending/Completed/Reconciled/Void) |
| Reference | Link (PO, ticket, etc.) |
| Actions | View, Reconcile, Void |

### Filters
- Type (Income/Expense/All), Category, Date Range, Amount Range, Status, Account, Reference

---

## 11.3 Screen: Transaction Detail
**URL**: `/financial/:id`  |  **Access**: Manager+

### Header
- Transaction ID, type badge, amount (large), date, status
- Reference links (to PO, ticket, asset, etc.)
- Actions: [✏ Edit] [✅ Reconcile] [🗑 Void] [🖨 Print]

### Tabs
| Tab | Content |
|-----|---------|
| **Details** | All fields, payment method, account, category |
| **Attachments** | Invoices, receipts (drag-drop upload) |
| **Related** | Linked PO, ticket, or asset details |
| **Audit Trail** | All changes |

---

## 11.4 Screen: Record Transaction
**URL**: `/financial/create`  |  **Access**: Manager+

### Form
| Field | Type | Validation |
|-------|------|------------|
| Type* | Radio | Income / Expense / Transfer / Journal |
| Date* | Date picker | Required, ≤ today |
| Category* | Dropdown | Rent, Utilities, Supplies, Maintenance, Salary, etc. |
| Description | Text | Optional |
| Amount* | Currency input | Required, > 0 |
| Currency | Dropdown | From org currencies |
| Account | Dropdown | GL accounts |
| Payment Method | Dropdown | Cash, Bank, Card, Check |
| Reference | Text | PO/Invoice/Ticket number |
| Link Entity | Entity picker | Optional, link to PO/Ticket/Asset |
| Attachments | File upload | Receipt/invoice images |
| Notes | Textarea | Internal notes |

---

## 11.5 Screen: OCR Invoice Scanner
**URL**: `/financial/scan`  |  **Access**: Manager+

### Workflow
```
[1. Upload/Scan] → [2. AI Extract] → [3. Review & Edit] → [4. Create Transaction]
```

### Step 1: Upload
- Drag-drop image/PDF
- Or capture from camera (mobile)

### Step 2: AI Extraction (Tesseract.js + Gemini)
```
┌──────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │ [Invoice Image]     │  │ Extracted Data:                 │   │
│  │                     │  │                                 │   │
│  │  ACME Corporation   │  │ Vendor: ACME Corporation     ✅│   │
│  │  Invoice #: 12345   │  │ Invoice #: 12345             ✅│   │
│  │  Date: Jan 15, 2026 │  │ Date: Jan 15, 2026           ✅│   │
│  │  Amount: ₹1,250.00  │  │ Amount: ₹1,250.00            ✅│   │
│  │                     │  │ Tax: ₹125.00                 ⚠│   │
│  │  Items:             │  │                                 │   │
│  │  - HVAC belts ×10   │  │ Line Items:                    │   │
│  │  - Filters ×20      │  │ • HVAC belts × 10 → ₹500     │   │
│  │                     │  │ • Filters × 20 → ₹750         │   │
│  └─────────────────────┘  │                                 │   │
│                            │ Confidence: 94%                │   │
│                            └─────────────────────────────────┘   │
│                              [✅ Correct] [✏ Edit] [→ Match PO] │
└──────────────────────────────────────────────────────────────────┘
```

### Step 3: Review
- All extracted fields are editable
- Confidence indicators per field (✅ high, ⚠ medium, ❌ low)
- Auto-match to existing PO if vendor + amount match

### Step 4: Create
- Pre-filled transaction form
- One-click create

---

## 11.6 Screen: Budget vs Actual
**URL**: `/financial/budget`  |  **Access**: Manager+

### Budget Setup
| Category | Monthly Budget | YTD Budget | YTD Actual | Variance |
|----------|---------------|-----------|-----------|----------|
| Rent | ₹15,000 | ₹30,000 | ₹30,000 | ₹0 (0%) |
| Maintenance | ₹5,000 | ₹10,000 | ₹12,500 | -₹2,500 (25% over) |
| Supplies | ₹3,000 | ₹6,000 | ₹4,200 | +₹1,800 (30% under) |
| Utilities | ₹4,000 | ₹8,000 | ₹7,800 | +₹200 (2.5% under) |

### Charts
- **Budget vs Actual** (Grouped bar per category)
- **Spending Trend** (Line chart: budget line vs actual spending)
- **Alerts**: Categories exceeding budget highlighted red

---

## 11.7 Screen: Bank Reconciliation
**URL**: `/financial/reconciliation`  |  **Access**: Admin, Manager

### Layout
- **Left**: Bank statement entries (imported CSV or manual)
- **Right**: System transactions
- **Action**: Match entries (drag-drop or click-to-match)
- Auto-match suggestion for identical amounts + dates

---

## 11.8 Screen: Financial Reports
**URL**: `/financial/reports`  |  **Access**: Manager+

### Available Reports
1. **Profit & Loss Statement** — Income - Expenses by period
2. **Balance Sheet** — Assets, Liabilities, Equity
3. **Cash Flow Statement** — Operating, Investing, Financing
4. **Expense by Category** — Breakdown chart + table
5. **Revenue by Branch** — Multi-location comparison
6. **Tax Summary** — Tax collected/paid for filing

### Export
- PDF (formatted report)
- Excel (raw data + charts)
- Schedule auto-email (weekly/monthly)

---

## 11.9 Screen: Currency Management
**URL**: `/financial/currencies`  |  **Access**: Admin

### Features
- Active currencies list with exchange rates
- Manual rate update or auto-fetch
- Historical rate log
- Base currency setting per organization
- Currency conversion calculator
