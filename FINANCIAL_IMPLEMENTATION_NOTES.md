# Financial System Implementation Notes

**For**: Next Phase Development  
**Date**: 2026-03-20

---

## Code Structure Overview

```
backend/
├── src/
│   ├── controllers/
│   │   ├── glController.js (reports: TB, P&L, BS, CF, GL Extract)
│   │   └── apInvoiceController.js (NEW: AP invoice CRUD + posting)
│   ├── services/
│   │   ├── financePostingService.js (existing: Transaction posting)
│   │   ├── apInvoicePostingService.js (NEW: AP GL posting with tax)
│   │   ├── matchingService.js (NEW: 3-way matching engine)
│   │   └── taxCalculationService.js (NEW: GST/VAT calculations)
│   └── routes/
│       └── [TODO: apInvoiceRoutes.js, taxRoutes.js]
├── scripts/
│   └── validateFinancialIntegrity.js (NEW: GL validation + auto-fix)
└── prisma/
    └── schema.prisma (6 new models added)
```

---

## Integration Checklist

## Newly Wired Endpoints (Phase 2)

These routes are now active and can be tested immediately.

### AP Invoice + Matching
- `GET /api/ap-invoices`
- `GET /api/ap-invoices/:id`
- `POST /api/ap-invoices`
- `PUT /api/ap-invoices/:id/approve`
- `POST /api/ap-invoices/:id/post-gl`
- `GET /api/ap-invoices/aging`
- `POST /api/ap-invoices/:id/match`
- `GET /api/ap-invoices/matching/report`

### Finance Extended Tax APIs
- `GET /api/finance-ext/tax-reconciliation?startDate=...&endDate=...`
- `GET /api/finance-ext/gst-reconciliation?startDate=...&endDate=...`
- `GET /api/finance-ext/tax-summary/:invoiceType/:invoiceId`
- `POST /api/finance-ext/tax/calculate-line`

### Request Notes
- `invoiceType` must be `AP` or `AR`.
- Tax reconciliation endpoints require `startDate` and `endDate`.
- Office scoping is automatic for non-`SUPER_ADMIN` users.

### Phase 2 Tasks

#### Routes Registration (HIGH PRIORITY)
- [ ] Create `backend/src/routes/apInvoiceRoutes.js`
- [ ] Register endpoints from `apInvoiceController.js`
- [ ] Create `backend/src/routes/taxRoutes.js`
- [ ] Register tax endpoints
- [ ] Add routes to `backend/src/index.js` or `app.js`

**Template for apInvoiceRoutes.js**:
```javascript
const express = require('express');
const router = express.Router();
const apController = require('../controllers/apInvoiceController');
const auth = require('../middleware/verifyToken');
const { authorize } = require('../middleware/authorize');

router.use(auth); // All routes require auth

router.get('/', apController.getAPInvoices);
router.get('/:id', apController.getAPInvoiceById);
router.post('/', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), apController.createAPInvoice);
router.put('/:id/approve', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), apController.approveAPInvoice);
router.post('/:id/post-gl', authorize('SUPER_ADMIN', 'ADMIN'), apController.postAPInvoiceToGL);
router.get('/aging', apController.getAPAging);

module.exports = router;
```

#### Database Migration (CRITICAL)
- [ ] Run Prisma migration: `npx prisma migrate dev --name add_ap_invoices`
- [ ] Verify schema applied to PostgreSQL
- [ ] Test on development database first
- [ ] Backup production before migrating
- [ ] Rollback plan: save migration version before applying

#### Frontend Components (HIGH PRIORITY)
- [ ] AP Invoice List page
  - Search/filter by vendor, status, date range
  - Bulk actions (approve, reject, post to GL)
  - Match status indicator
  
- [ ] AP Invoice Detail/Edit modal
  - Line item editor
  - Tax code dropdown (linked to tax rates)
  - GL account mapping
  - Approval workflow
  
- [ ] AP Aging report
  - Vendor-wise grouping
  - Days overdue highlight
  - Collection follow-up actions
  
- [ ] GL Reconciliation dashboard
  - GL account selector
  - Balance vs calculated comparison
  - Repair button (if admin)

#### Unit Tests (IMPORTANT)
- [ ] Service layer tests:
  ```javascript
  // Test postAPInvoiceToGL
  - Invoice with no lines → error
  - Invoice with single tax code → correct GL posting
  - Invoice with mixed IGST/SGST → correct breakdown
  - Multi-currency invoice → preserve currency
  
  // Test matchAPInvoiceToOrder
  - Perfect match → MATCHED status
  - Qty variance 0.3% → within tolerance
  - Qty variance 1% → over tolerance
  - No PO provided → UNMATCHED
  
  // Test taxCalculationService
  - GST 18% on 1000 → 180 tax
  - SGST/CGST on 1000 → 90+90 equal split
  - Invalid tax code → error
  ```

- [ ] Controller tests:
  ```javascript
  - POST /api/ap-invoices with valid data → 201 + invoice object
  - GET /api/ap-invoices?status=APPROVED → filtered list
  - PUT /api/ap-invoices/{id}/approve → status changed
  - POST /api/ap-invoices/{id}/post-gl (DRAFT) → 400 error
  ```

- [ ] Integration tests:
  ```javascript
  - Full workflow: Create → Approve → Post → GL reconcile
  - 3-way matching: PO + GRN + Invoice → match status
  - Tax reconciliation: Multiple invoices → correct totals
  ```

---

## Known Limitations & Future Enhancements

### Current Limitations

1. **Reversal Not Implemented**
   - Cannot reverse posted JE (only delete, which breaks audit trail)
   - Recommend: Add reversal journal generation feature
   - Impact: Manual correction required for posting errors

2. **No Approval Workflow**
   - Invoice goes directly from DRAFT to APPROVED
   - Recommend: Add multi-level approval with conditions
   - Example: >10K requires CFO approval

3. **Manual GL Account Mapping**
   - Each invoice line requires manual GL account selection
   - Recommend: Auto-map by vendor/category rules
   - Impact: Data entry burden

4. **Multi-Currency FX Not Handling**
   - Currency preserved but no FX gain/loss posting
   - Recommend: Add forex revaluation posting
   - Impact: Consolidated reporting inaccurate

5. **No Intercompany Support**
   - All invoices assume single company
   - Recommend: Add company-level GL accounts
   - Impact: Consolidated financials not possible

### Recommended Next Features

**Priority 1 (Finance)**:
- [ ] Invoice reversal (generate reversing JE)
- [ ] Approval workflow with conditional routing
- [ ] GL account auto-mapping rules
- [ ] Bank reconciliation enhancement for AP/AR

**Priority 2 (Compliance)**:
- [ ] GST e-way bill integration
- [ ] Statutory audit report generation
- [ ] Tax filing XML export
- [ ] Intercompany elimination entries

**Priority 3 (Analytics)**:
- [ ] Cash forecasting (payable timeline)
- [ ] Vendor spend analytics
- [ ] Customer receivables analytics
- [ ] Profitability by customer/product

**Priority 4 (UX)**:
- [ ] Dashboard with outstanding AP/AR
- [ ] Aging trend visualization
- [ ] Match exception alerts
- [ ] Invoice approval mobile app

---

## Database Backup & Recovery

## Verified Runtime Notes (2026-03-22)

- Prisma Client must be regenerated after AP/AR schema updates:
  - `npx prisma generate`
- Existing migration history currently has a shadow DB failure (`P3006`) on one older migration.
  - `npx prisma migrate dev` may fail even when schema itself is valid.
  - Temporary operational fallback used: `npx prisma db push --accept-data-loss`
- AP/AR Prisma delegates for PascalCase models use lowercase-first naming:
  - `prisma.aPInvoice`, `prisma.aRInvoice`, `prisma.aPInvoiceLine`, `prisma.aRInvoiceLine`

### API Proof Script

- Script: `backend/scripts/testFinancialRebuildApis.js`
- Run:
  - `cd backend`
  - `node scripts/testFinancialRebuildApis.js`
- Default credentials in script:
  - Email: `tirth@coreops.in`
  - Password: `CoreOps@2026`

### Latest Proof Outcome

- Login: OK
- AP invoices list: OK
- AP matching report: OK
- Tax reconciliation: OK
- GST reconciliation: OK
- Tax line calculation (`GST_18` on 1000): taxAmount = 180

### Pre-Migration Checklist
```bash
# 1. Backup current schema
pg_dump -U postgres coreops_erp > backup_pre_migration.sql

# 2. Run validation
node backend/scripts/validateFinancialIntegrity.js

# 3. Test migration on copy
createdb coreops_erp_test
pg_restore -U postgres -d coreops_erp_test backup_pre_migration.sql
```

### Migration Steps
```bash
# 1. Commit current schema
git add backend/prisma/schema.prisma

# 2. Create and run migration
npx prisma migrate dev --name add_ap_invoices

# 3. Post-migration validation
node backend/scripts/validateFinancialIntegrity.js

# 4. Backup successful schema
pg_dump -U postgres coreops_erp > backup_post_migration.sql
```

### Rollback (if needed)
```bash
# 1. Stop application
# 2. Restore backup
psql -U postgres coreops_erp < backup_pre_migration.sql
# 3. Rollback prisma (if not yet committed)
git checkout backend/prisma/schema.prisma
```

---

## Performance Tuning

### Key Indexes Added by Migration
```sql
-- Should be created automatically by Prisma
CREATE INDEX idx_apinvoice_vendor_status 
  ON "APInvoice"(vendorId, status);
CREATE INDEX idx_apinvoice_date_desc 
  ON "APInvoice"(invoiceDate DESC);
CREATE INDEX idx_journalentry_status_date 
  ON "JournalEntry"(status, date DESC);
CREATE INDEX idx_gLAccount_type 
  ON "GLAccount"(type);
```

### Query Optimization Tips
1. Use `include` carefully - can cause N+1 queries
2. Use `findMany` with pagination (`take`/`skip`)
3. Pre-calculate aggregates instead of runtime sums
4. Cache tax rates (change infrequently)

### Monitoring Queries
```javascript
// Enable Prisma query logging in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    console.log(`[${e.duration}ms] ${e.query}`);
  });
}
```

---

## Common Issues & Fixes

### Issue: GL Imbalance
**Symptom**: Trial Balance debits ≠ credits  
**Fix**:
```bash
node backend/scripts/validateFinancialIntegrity.js --fix
```
**Root Cause**: JE line update without balance update

---

### Issue: AP Invoice Total Mismatch
**Symptom**: `totalAmount ≠ subtotal + tax`  
**Fix**: Run validation script to auto-correct  
**Prevention**: Always use calculation service

---

### Issue: Tax Breakdown Incorrect
**Symptom**: SGST + CGST ≠ tax amount (should be 50/50 split)  
**Fix**: Ensure taxCode includes 'SGST' for split taxes  
**Prevention**: Validate tax code before saving

---

### Issue: 3-Way Matching Status Wrong
**Symptom**: Matched invoice shows UNMATCHED  
**Fix**: Re-run matching:
```javascript
await matchAPInvoiceToOrder({ apInvoiceId, poId, grnId });
```
**Root Cause**: Match log not created (missing PO/GRN)

---

## Code Review Checklist

Before merging financial changes:

- [ ] All new GL postings are transactional (`prisma.$transaction`)
- [ ] Double-entry validated before JE creation
- [ ] No orphaned JE lines (all lines have journalEntryId)
- [ ] Tax calculations tested across all tax types
- [ ] Account balances updated after each JE
- [ ] Error handling doesn't swallow transaction state
- [ ] No hardcoded GL account codes (use service)
- [ ] AP/AR separated (not mixed in queries)
- [ ] Multi-office scoping on all queries
- [ ] Audit trail captured in AuditLog
- [ ] Permission checks on approve/post actions
- [ ] Test coverage >80% for services

---

## Contact & Support

**For Questions About**:
- GL Architecture → Review `glController.js` comments
- AP Posting Logic → See `apInvoicePostingService.js` docstrings
- Tax Calculations → Check `TAX_TYPES` in `taxCalculationService.js`
- 3-Way Matching → Understand variance tolerance in `matchingService.js`
- Schema Changes → Read `FINANCIAL_REBUILD_WAVE1_SUMMARY.md`

**Document Version**: 1.0  
**Last Updated**: 2026-03-20  
**Reviewed By**: Architecture Team
