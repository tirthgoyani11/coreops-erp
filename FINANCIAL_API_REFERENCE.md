# CoreOps Financial System - API Reference

**Status**: Production Ready (Phase 1 Complete)  
**Architecture**: Odoo/ERPNext patterns on PostgreSQL + Express  
**Database**: Prisma ORM

---

## Core Concepts

### Double-Entry Accounting
All financial transactions follow the formula: **Debits = Credits**

### Chart of Accounts Hierarchy
```
1000 Assets
  1100 Cash and Bank
  1200 Accounts Receivable
    1210 Customer A
    1220 Customer B
2000 Liabilities
  2100 Accounts Payable
  2300 GST Payable (IGST, SGST, CGST)
3000 Equity
4000 Revenue
5000 Expense/Cost of Goods Sold
```

### GL Account Types
- **ASSET** - Normal side: DEBIT (increases on debit)
- **LIABILITY** - Normal side: CREDIT (increases on credit)
- **EQUITY** - Normal side: CREDIT
- **REVENUE** - Normal side: CREDIT
- **EXPENSE** - Normal side: DEBIT

---

## API Endpoints

### 📊 General Ledger (GL)

#### Chart of Accounts

**Get All Accounts**
```
GET /api/gl/accounts
Query: ?officeId=...&isActive=true
Returns: Tree structure with balances
```

**Create Account**
```
POST /api/gl/accounts
Body: {
  "code": "1100",
  "name": "Cash and Bank",
  "type": "ASSET",
  "parentId": "parent-uuid",
  "normalSide": "DEBIT",
  "officeId": "office-uuid"
}
```

**Update Account**
```
PUT /api/gl/accounts/{id}
Body: { "name": "...", "description": "...", "isActive": true }
```

#### Journal Entries

**Create Journal Entry** (Double-entry enforced)
```
POST /api/gl/journal
Body: {
  "date": "2026-03-20",
  "description": "Monthly utilities payment",
  "referenceType": "MANUAL",
  "reference": "CHQ-2026-001",
  "lines": [
    { "accountId": "...", "debit": 10000, "credit": 0, "description": "Expense" },
    { "accountId": "...", "debit": 0, "credit": 10000, "description": "Cash" }
  ]
}
Response: { entryNumber: "JE-2026-0001", status: "POSTED", ... }
```

**Get Journal Entries**
```
GET /api/gl/journal
Filters: ?startDate=&endDate=&status=POSTED&accountId=&limit=50
```

#### Financial Reports

**Trial Balance**
```
GET /api/gl/trial-balance
Query: ?startDate=2026-03-01&endDate=2026-03-31
Returns: All accounts with debit/credit totals, validates balanced
```

**Profit & Loss (Income Statement)**
```
GET /api/gl/profit-loss
Query: ?startDate=2026-03-01&endDate=2026-03-31
Returns: Revenue, Expenses, Net Income + Profit Margin %
```

**Balance Sheet (Statement of Financial Position)**
```
GET /api/gl/balance-sheet
Returns: Assets, Liabilities, Equity + Retained Earnings
Validates: A = L + E (Accounting Equation)
```

**Cash Flow Statement**
```
GET /api/gl/cash-flow
Returns: Historical (30/60/90 days), Projections, Monthly breakdown
```

**GL Extract (Account Detail)**
```
GET /api/gl/extract
Query: ?accountId=&startDate=&endDate=&limit=500
Returns: All JE lines for account with running balance
```

**Account Reconciliation**
```
GET /api/gl/reconciliation
Returns: GL balance vs calculated balance for all accounts
Flags imbalances and errors
```

---

### 💰 Accounts Payable (AP)

#### AP Invoices

**Create AP Invoice**
```
POST /api/ap-invoices
Body: {
  "invoiceNumber": "INV-2026-001",
  "vendorId": "vendor-uuid",
  "poId": "po-uuid",  // Optional, for 3-way matching
  "grnId": "grn-uuid",  // Optional
  "invoiceDate": "2026-03-20",
  "dueDate": "2026-04-20",
  "lines": [
    {
      "description": "Widget A",
      "quantity": 100,
      "unitPrice": 500,
      "taxCode": "GST18",
      "glAccountId": "account-uuid"
    }
  ]
}
Auto-calculates: subtotal, taxAmount, totalAmount
```

**Get AP Invoices**
```
GET /api/ap-invoices
Filters: ?vendorId=&status=DRAFT|APPROVED|MATCHED|PAID
        &page=1&limit=50&search=INV-2026
```

**Get AP Invoice Detail**
```
GET /api/ap-invoices/{id}
Returns: Full invoice with lines, PO, GRN, matching log, GL posting
```

**Approve AP Invoice**
```
PUT /api/ap-invoices/{id}/approve
Body: { "notes": "Approved for payment" }
Changes status: DRAFT → APPROVED
```

**Post to GL**
```
POST /api/ap-invoices/{id}/post-gl
Prerequisites: Status = APPROVED
Creates balanced JE with Purchase/GST accounts
Auto-posts corresponding GL entry
```

#### AP Aging Report

**Get AP Aging (by Vendor)**
```
GET /api/ap-invoices/aging
Query: ?asOf=2026-03-31&officeId=
Returns: Buckets (Current/30/60/90+ days)
        Total outstanding, vendor breakdown
```

#### AP Payment

**Create AP Payment**
```
POST /api/ap-payments
Body: {
  "invoiceId": "invoice-uuid",
  "amount": 5000,
  "paymentDate": "2026-03-25",
  "method": "BANK_TRANSFER",  // CASH, CHECK, BANK_TRANSFER, etc.
  "reference": "TXN-2026-001"
}
```

**Process Payment**
```
POST /api/ap-payments/{id}/process
Creates GL entry: Dr. AP / Cr. Cash
Updates invoice amountPaid status
```

---

### 📈 Accounts Receivable (AR)

#### AR Invoices
*Same structure as AP but for customer sales*

**Create AR Invoice**
```
POST /api/ar-invoices
Body: {
  "invoiceNumber": "SI-2026-001",
  "customerId": "customer-uuid",
  "salesOrderId": "so-uuid",
  "invoiceDate": "2026-03-20",
  "dueDate": "2026-04-20",
  "lines": [...]
}
```

**AR Payment**
```
POST /api/ar-payments
Body: {
  "invoiceId": "ar-invoice-uuid",
  "amount": 10000,
  "paymentDate": "2026-03-25"
}
```

#### AR Aging Report
```
GET /api/ar-invoices/aging
Returns: Customer aging buckets, outstanding amounts
```

---

### 🧮 Tax Management

#### Tax Rate Setup

**Create Tax Rate**
```
POST /api/tax-rates
Body: {
  "name": "GST 18%",
  "code": "GST18",
  "rate": 18,
  "type": "GST",
  "isDefault": true
}
```

#### Tax Reporting

**Tax Reconciliation Report**
```
GET /api/tax/reconciliation
Query: ?startDate=&endDate=&officeId=&taxType=GST18
Returns: Input tax, Output tax, Net tax liability by period
```

**GST-Specific Report** (India)
```
GET /api/tax/gst-reconciliation
Query: ?startDate=&endDate=&state=MH|DL|KA
Returns: IGST, SGST, CGST breakdown
        Input credit vs output liability
        Net GST payable
```

**Invoice Tax Summary**
```
GET /api/ap-invoices/{id}/tax-summary
Returns: Line-by-line tax breakdown, total tax by code
```

---

### ✅ 3-Way Matching

**Match Invoice to PO & GRN**
```
POST /api/invoices/{id}/match
Validates: PO qty/price vs Invoice
          GRN received qty vs Invoice qty
Returns: Match status (MATCHED, PARTIALLY_MATCHED, OVER_MATCHED)
         Variance details with tolerance
```

**Get Matching Report**
```
GET /api/matching-report
Query: ?poId=&status=MATCHED|PARTIALLY_MATCHED
Returns: List of invoices with match details
```

---

### 🔍 Data Integrity

**Validate Financial Data**
```bash
# Check mode
node backend/scripts/validateFinancialIntegrity.js

# Check & fix mode
node backend/scripts/validateFinancialIntegrity.js --fix

# Verbose output
node backend/scripts/validateFinancialIntegrity.js --verbose
```

**Validations Performed**:
- GL account balances reconcile
- Journal entries are balanced
- Invoice totals match line sums
- No orphaned records
- Tax calculations accurate

---

## Common Workflows

### AP Invoice to Payment

```
1. Create AP Invoice
   POST /api/ap-invoices

2. System auto-matches to PO/GRN (if provided)

3. Review and Approve
   PUT /api/ap-invoices/{id}/approve

4. Post to GL
   POST /api/ap-invoices/{id}/post-gl
   Creates: Dr. Expense, Cr. AP

5. Make Payment
   POST /api/ap-payments
   Creates: Dr. AP, Cr. Cash

6. Verify GL Balance
   GET /api/gl/trial-balance
```

### Month-End Closing

```
1. Get Trial Balance
   GET /api/gl/trial-balance?startDate=2026-03-01&endDate=2026-03-31

2. Review P&L
   GET /api/gl/profit-loss?startDate=2026-03-01&endDate=2026-03-31

3. Prepare Balance Sheet
   GET /api/gl/balance-sheet

4. Tax Reconciliation
   GET /api/tax/reconciliation?startDate=2026-03-01&endDate=2026-03-31

5. Data Integrity Check
   node scripts/validateFinancialIntegrity.js

6. Post Month-End Close JE (manual)
   POST /api/gl/journal
```

---

## Error Codes & Status

### Invoice Status Flow (AP)
```
DRAFT → SUBMITTED → APPROVED → MATCHED → PAID
                    ↓
                PARTIALLY_PAID (after payment)
```

### Match Status Values
- **UNMATCHED** - Invoice not yet matched to PO/GRN
- **PARTIALLY_MATCHED** - Some variance detected (within tolerance)
- **MATCHED** - Perfect match to PO/GRN
- **OVER_MATCHED** - Variance exceeds tolerance (requires approval)
- **ERROR** - Matching calculation error

### Common HTTP Responses

**201 Created**
```json
{ "success": true, "data": { ... } }
```

**400 Bad Request**
```json
{ "success": false, "message": "Debits (1000) != Credits (500)" }
```

**404 Not Found**
```json
{ "success": false, "message": "AP Invoice not found" }
```

**500 Server Error**
```json
{ "success": false, "error": "Transaction failed" }
```

---

## Performance Considerations

### Indexes
- `apInvoice(vendorId, status)`
- `journalEntry(officeId, date DESC)`
- `gLAccount(type, officeId)`

### Large Datasets
- Trial Balance: <500ms for 50K accounts (with indexes)
- P&L Report: <1s for 24-month history
- AP Aging: <500ms for 1K invoices
- GL Extract: <2s for 10K JE lines per account

### Pagination
All list endpoints support `?page=1&limit=50` (max 200)

---

## Authentication & Authorization

All endpoints require JWT token via `Authorization: Bearer <token>`

**Required Permissions**:
- `canViewFinancials` - Read all GL/Reporting endpoints
- `canManageVendors` - Create/modify AP invoices
- `ADMIN/MANAGER` role - Approve/post transactions

---

## Example cURL Commands

### Get Trial Balance
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/gl/trial-balance?startDate=2026-03-01&endDate=2026-03-31"
```

### Create AP Invoice
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber":"INV-2026-001",
    "vendorId":"vendor-uuid",
    "invoiceDate":"2026-03-20",
    "dueDate":"2026-04-20",
    "lines":[{"description":"Item","quantity":100,"unitPrice":500,"taxCode":"GST18"}]
  }' \
  "http://localhost:3000/api/ap-invoices"
```

### Approve and Post
```bash
# Approve
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/ap-invoices/{id}/approve"

# Post to GL
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/ap-invoices/{id}/post-gl"
```

---

**Documentation Version**: 1.0  
**Last Updated**: 2026-03-20  
**Maintainer**: Financial System Team
