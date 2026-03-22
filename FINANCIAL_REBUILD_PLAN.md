# Financial System Rebuild Plan
**Date**: 2026-03
**Scope**: Complete financial module refactor using Odoo/ERPNext patterns
**Status**: ACTIVE

## Architecture Summary

### Current State Gap Analysis
- ✅ GLAccount, JournalEntry, JournalEntryLine exist
- ❌ Missing: APInvoice model (separate from generic Invoice)
- ❌ Missing: APPayment model for AP settlement
- ❌ Missing: ArPayment model for AR collections
- ❌ Missing: 3-way matching (PO → GRN → Invoice) enforcement
- ❌ Missing: Tax breakup per invoice line
- ❌ Missing: Financial reports (Trial Balance, P&L, BS)

### Odoo/ERPNext Patterns to Implement

1. **Chart of Accounts Hierarchy**
   - Parent-child relationships (already in schema)
   - Type-based normal side (already in schema)
   - **TODO**: Add account level (1000=Assets, 1100=Current Assets, 1110=Cash)

2. **Invoice Matching Engine**
   ```
   PO → GRN (Goods Receipt) → Match with Invoice
   PO.qty vs GRN.qty vs Invoice.qty must align
   Price tolerance: 0.5% (configurable)
   ```

3. **Tax Accounting**
   - Line-level tax detail (IGST/SGST breakdown)
   - Tax journal posting (GST has separate ledger impact)
   - Tax reconciliation report

4. **Multi-Currency Handling**
   - FX rate snapshot at transaction date
   - GL posting in functional currency only
   - FX gains/losses automatic posting

5. **Account Reconciliation**
   - Balance verification (sum of JE lines = GL balance)
   - AR aging = sum of unpaid invoices by dueDate bucket
   - AP aging = sum of unpaid invoices by dueDate bucket

---

## Implementation Phases

### Phase 1: Schema & Foundation (THIS SPRINT)
**Goal**: Create missing GL invoice models and establish 3-way matching framework

**Tasks**:
1. Add APInvoice model (PO-based, vendor-linked)
2. Add ArPayment and ApPayment models
3. Enhance Tax tracking (line-level breakup)
4. Add GoodsReceipt lines for qty tracking
5. Create invoice matching enum (UNMATCHED, PARTIALLY_MATCHED, MATCHED, OVER_MATCHED)

**Files to Modify**:
- `backend/prisma/schema.prisma` (+150 lines)

**Acceptance Criteria**:
- [ ] Migration applies cleanly to PostgreSQL
- [ ] APInvoice can link to PO and GRN
- [ ] Tax fields support multi-tax per line

---

### Phase 2: GL Posting Engine (NEXT SPRINT)
**Goal**: Auto-post AP/AR transactions to GL with proper accounts and tax impact

**Tasks**:
1. Enhance `financePostingService.js` to handle AP invoices
2. Create tax posting rules (GST payable, IGST payable, etc.)
3. Add FX gain/loss posting for multi-currency

**Files to Create/Modify**:
- `backend/src/services/financePostingService.js` (enhance existing)
- `backend/src/services/taxPostingService.js` (new)

**Acceptance Criteria**:
- [ ] POST /api/finance-ext/ap-invoices → auto-posts to GL
- [ ] GL balance reconciles to invoice total
- [ ] Tax payable accounts updated correctly

---

### Phase 3: 3-Way Matching & Approvals (NEXT SPRINT)
**Goal**: Implement PO → GRN → Invoice matching with variance tolerance

**Tasks**:
1. Create matching engine (`matchingService.js`)
2. Add match status to APInvoice
3. Create variance report (price, qty, date)
4. Add approval workflow for over-matched invoices

**Files to Create**:
- `backend/src/services/matchingService.js` (new)
- `backend/src/controllers/apMatchingController.js` (new)

**Acceptance Criteria**:
- [ ] API: GET /api/finance-ext/ap-invoices/matching-status
- [ ] Matching algorithm detects qty/price/date mismatches
- [ ] Approval workflow for >0.5% variance

---

### Phase 4: Financial Reports (NEXT SPRINT)
**Goal**: Build Trial Balance, P&L, and Balance Sheet reports

**Tasks**:
1. Implement Trial Balance query (all GL accounts with balances)
2. Implement P&L (period-based revenue/expense consolidation)
3. Implement Balance Sheet (Assets, Liabilities, Equity snapshot)
4. Add Cash Flow

**Files to Modify**:
- `backend/src/controllers/glController.js` (enhance existing)

**Acceptance Criteria**:
- [ ] GET /api/gl/trial-balance returns balanced debits/credits
- [ ] GET /api/gl/profit-loss shows income/expense for period
- [ ] GET /api/gl/balance-sheet shows A=L+E equation

---

### Phase 5: Data Integrity & Verification
**Goal**: Ensure GL consistency and auditability

**Tasks**:
1. Add reconciliation script (GL balance = sum JE lines)
2. Add integrity checks (JE lines balanced, no orphans)
3. Add immutability enforcement (POSTED entries cannot modify)

**Files to Create**:
- `backend/scripts/validateFinancialIntegrity.js` (new)

**Acceptance Criteria**:
- [ ] Script runs without errors on sample data
- [ ] All GL balances reconcile
- [ ] No orphaned JE lines

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Trial Balance query latency | <500ms |
| P&L report generation | <1s |
| Invoice matching accuracy | >99% |
| GL balance reconciliation | 100% |
| Tax calculation accuracy | 100% (within 1 cent) |

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Schema migration fails | Test on dev DB first, rollback plan ready |
| GL imbalance after posting | Validation script before production |
| Performance degradation | Index on invoice.status, JE.date, GL.code |
| Tax calculation edge cases | Unit tests for all GST/VAT scenarios |
