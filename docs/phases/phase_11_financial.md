# Phase 11: Financial Management Module

## 11.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 7 (Screens 41-47) |
| **Purpose** | Multi-currency financial tracking |
| **Key Features** | OCR invoice scanning, Budget management |

---

## 11.2 Screen 41: Transactions List

**URL**: `/financial/transactions`  
**Access**: Manager roles + Viewer (read-only)

### Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ Financial Transactions                           [+ Record Transaction]│
├────────────────────────────────────────────────────────────────────────┤
│ Filter: [Type ▼] [Category ▼] [Location ▼] [Date Range] [Currency ▼]  │
├────────────────────────────────────────────────────────────────────────┤
│ Date       │ Reference  │ Description     │ Category  │ Amount   │ Curr│
│ ───────────┼────────────┼─────────────────┼───────────┼──────────┼──── │
│ Feb 3, 26  │ TXN-00456  │ HVAC Repair     │ Maintenan │ -$450.00 │ USD │
│ Feb 2, 26  │ TXN-00455  │ Office Supplies │ Operating │ -$120.00 │ USD │
│ Feb 1, 26  │ TXN-00454  │ Product Sale    │ Revenue   │ +$890.00 │ USD │
├────────────────────────────────────────────────────────────────────────┤
│ Period Summary: Revenue: $12,450 │ Expenses: $8,920 │ Net: +$3,530    │
└────────────────────────────────────────────────────────────────────────┘
```

### Transaction Categories
| Category | Type | Examples |
|----------|------|----------|
| Revenue | Income | Product sales, Services |
| Maintenance | Expense | Repairs, Parts, Labor |
| Operating | Expense | Utilities, Supplies |
| Payroll | Expense | Salaries, Benefits |
| Asset Purchase | CapEx | New equipment |
| Transfer | Neutral | Inter-branch moves |

---

## 11.3 Screen 42: Transaction Detail

**URL**: `/financial/:id`  
**Access**: Manager roles + Viewer (read-only)

### Content
| Section | Fields |
|---------|--------|
| Basic Info | Reference, Date, Amount, Currency |
| Classification | Category, Subcategory, Type |
| Related Records | Asset, Ticket, PO, Vendor |
| Payment | Method, Account, Status |
| Attachments | Invoice, Receipt, Documents |
| Approval | Approver, Date, Notes |
| Audit | Created by, Modified history |

---

## 11.4 Screen 43: Record Transaction

**URL**: `/financial/create`  
**Access**: Manager roles

### Form
| Field | Type | Validation |
|-------|------|------------|
| Transaction Type* | Radio | Income / Expense |
| Category* | Dropdown | Based on type |
| Amount* | Currency | Required, > 0 |
| Currency* | Dropdown | From supported |
| Date* | Date | Required |
| Description* | Text | Required |
| Reference | Text | Auto-generate or manual |
| Related Asset | Autocomplete | Optional |
| Related Ticket | Autocomplete | Optional |
| Vendor | Autocomplete | For expenses |
| Payment Method | Dropdown | Cash, Card, Bank, etc. |
| Attachments | File Upload | Invoice/Receipt |

---

## 11.5 Screen 44: OCR Invoice Scanner

**URL**: `/financial/ocr`  
**Access**: Manager roles

### Process Flow
```
┌────────────────────────────────────────────────────────────────────────┐
│ Invoice Scanner (Powered by Tesseract.js)                              │
├────────────────────────────────────────────────────────────────────────┤
│ Step 1: Upload                                                         │
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │                                                                    ││
│ │                  📄 Drop invoice image here                        ││
│ │                     or click to browse                             ││
│ │                                                                    ││
│ │                  Supported: JPG, PNG, PDF                          ││
│ └────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ Step 2: Processing                                                     │
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │  ████████████████████░░░░░░ 75%                                    ││
│ │  Extracting text...                                                ││
│ └────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ Step 3: Review & Confirm                                               │
├─────────────────────────────────┬──────────────────────────────────────┤
│ Extracted Data                  │ Original Image                       │
├─────────────────────────────────┤                                      │
│ Vendor: ABC Supply Co.    [✓]   │ ┌──────────────────────────────────┐│
│ Invoice #: INV-2024-00456 [✓]   │ │                                  ││
│ Date: Feb 1, 2026         [✓]   │ │  [Scanned Invoice Preview]       ││
│ Amount: $2,450.00         [✎]   │ │                                  ││
│ Currency: USD             [✓]   │ │                                  ││
│                                 │ └──────────────────────────────────┘│
│ Line Items:                     │                                      │
│ • Compressor Belt x10 - $450    │                                      │
│ • Refrigerant x20 - $700        │                                      │
│ • Labor - $1,300                │                                      │
├─────────────────────────────────┴──────────────────────────────────────┤
│ [Cancel]                          [Edit Fields]     [Create Transaction]│
└────────────────────────────────────────────────────────────────────────┘
```

### OCR Capabilities
- Text extraction from images
- Pattern matching for common fields
- Vendor auto-matching
- Amount parsing (handles formats: $1,234.56, 1.234,56)
- Date recognition
- Line item extraction (best effort)

---

## 11.6 Screen 45: Currency Converter

**URL**: `/financial/currency`  
**Access**: All manager roles

### Converter Interface
```
┌────────────────────────────────────────────────────────────────────────┐
│ Currency Converter                     [Manage Exchange Rates]         │
├────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐    ┌─────────────────────────┐            │
│ │ From: USD ▼             │ ⇄  │ To: EUR ▼               │            │
│ │ Amount: $1,000.00       │    │ Result: €923.45         │            │
│ └─────────────────────────┘    └─────────────────────────┘            │
│                                                                        │
│ Rate: 1 USD = 0.92345 EUR │ Updated: 2 hours ago                      │
├────────────────────────────────────────────────────────────────────────┤
│ Exchange Rate History                                                  │
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ [Line chart showing USD/EUR rate over 30 days]                     ││
│ └────────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────┤
│ Supported Currencies                                                   │
│ USD ($) │ EUR (€) │ GBP (£) │ INR (₹) │ JPY (¥) │ AUD │ CAD │ ...    │
└────────────────────────────────────────────────────────────────────────┘
```

### Exchange Rate Management (Admin)
- Set base currency per organization
- Manual rate entry or API integration
- Historical rate storage
- Rate alerts (significant movement)

---

## 11.7 Screen 46: Financial Reports

**URL**: `/financial/reports`  
**Access**: Manager roles + Viewer (read-only)

### Report Types
| Report | Description | Export |
|--------|-------------|--------|
| P&L Statement | Income vs Expenses | PDF, Excel |
| Expense by Category | Pie chart breakdown | PDF, Excel |
| Maintenance Costs | By asset/location | PDF, Excel |
| Vendor Spending | By vendor | PDF, Excel |
| Cash Flow | Inflows/Outflows | PDF, Excel |
| Tax Report | Category totals | PDF, Excel |

### Report Builder
- Date range selection
- Location/Branch filter
- Category filter
- Comparison periods
- Chart type selection
- Schedule recurring reports

---

## 11.8 Screen 47: Budget vs Actual

**URL**: `/financial/budget`  
**Access**: Manager roles + Viewer (read-only)

### Dashboard
```
┌────────────────────────────────────────────────────────────────────────┐
│ Budget vs Actual Analysis          Period: [Q1 2026 ▼] [NYC Office ▼] │
├────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │          OVERALL BUDGET STATUS                                   │   │
│ │          ███████████████░░░░░░░░░ 72% Used                       │   │
│ │          Budget: $50,000 │ Spent: $36,000 │ Remaining: $14,000  │   │
│ └─────────────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────┤
│ Category Breakdown                                                     │
│ Category        │ Budget    │ Actual    │ Variance  │ Status          │
│ ────────────────┼───────────┼───────────┼───────────┼──────────────── │
│ Maintenance     │ $20,000   │ $22,500   │ -$2,500   │ 🔴 Over 12.5%   │
│ Operating       │ $15,000   │ $8,000    │ +$7,000   │ 🟢 Under 47%    │
│ Payroll         │ $10,000   │ $10,000   │ $0        │ 🟡 On Budget    │
│ Supplies        │ $5,000    │ $3,500    │ +$1,500   │ 🟢 Under 30%    │
├────────────────────────────────────────────────────────────────────────┤
│ Variance Chart                                                         │
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ [Horizontal bar chart showing budget vs actual by category]        ││
│ └────────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────┤
│ Alerts & Recommendations                                               │
│ ⚠️ Maintenance budget exceeded by 12.5% - consider reallocation       │
│ ✓ Operating costs trending 30% under budget                           │
└────────────────────────────────────────────────────────────────────────┘
```

### Budget Configuration (Admin)
- Set annual/quarterly budgets
- Allocate by category
- Set warning thresholds (80%, 90%, 100%)
- Email alerts on threshold breach
