# 10: Procurement & Vendors Module

## 10.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 8 |
| **Phase** | 2-3 |
| **Models** | Vendor, PurchaseOrder |
| **Key Feature** | Three-Way Matching, Vendor Reliability Scoring, Procurement Pipeline |
| **Existing** | Vendor list built |

---

## 10.2 Screen: Vendors List
**URL**: `/vendors`  |  **Access**: All (scoped)

### Quick Stats
| Stat | Description |
|------|-------------|
| Total Vendors | All active vendors |
| Active | Currently trading |
| Top Rated | Rating ≥ 4.5 |
| Pending POs | Open POs to vendors |

### Table Columns
| Column | Type |
|--------|------|
| Vendor ID | Text (clickable) |
| Company Name | Text |
| Type | Badge (Supplier/Contractor/Service) |
| Contact Person | Text |
| Categories | Tag list |
| Rating | Stars (0-5) |
| Reliability | % bar (color coded) |
| Open POs | Number |
| Total Orders | Number |
| Status | Badge |
| Actions | View, Edit, New PO, Compare |

---

## 10.3 Screen: Vendor Detail
**URL**: `/vendors/:id`  |  **Access**: All

### Entity Header
- Company name, Vendor ID, type badge, status, rating stars
- Contact: person name, email, phone
- Quick: [✏ Edit] [📦 New PO] [📊 Compare] [📄 Contracts]

### Tabs
| Tab | Content |
|-----|---------|
| **Overview** | Address, tax ID, bank details, categories, notes |
| **Reliability Dashboard** | Delivery score, quality score, response time, defect rate — with trend charts |
| **Purchase Orders** | All POs with this vendor, status filter |
| **Contracts** | Active/expired contracts, renewal dates |
| **Documents** | Certificates, agreements, compliance docs |
| **Audit Trail** | Change history |

### Reliability Dashboard
```
┌──────────────────────────────────────────────────────────────────┐
│  📊 Vendor Reliability Score: 87/100                              │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ On-Time  │ │ Quality  │ │ Response │ │ Defect   │           │
│  │ Delivery │ │  Score   │ │   Time   │ │  Rate    │           │
│  │   92%    │ │   95%    │ │  2.3 days│ │   1.2%   │           │
│  │  [█████] │ │  [█████] │ │  [████░] │ │  [█████] │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  [Trend chart: reliability score over 12 months]                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10.4 Screen: Purchase Orders List
**URL**: `/purchase-orders`  |  **Access**: Manager+

### Quick Stats
| Total POs | Draft | Pending Approval | Ordered | Received | Total Value |

### Table Columns
| Column | Type |
|--------|------|
| PO Number | Text (clickable) |
| Vendor | Text |
| Status | Badge |
| Items Count | Number |
| Total Amount | Currency |
| Created By | User |
| Expected Delivery | Date |
| Payment Status | Badge |
| 3-Way Match | ✅/⚠/❌ icon |
| Actions | View, Edit, Approve, Receive |

### Filters
- Status, Vendor, Date Range, Amount Range, Payment Status, Created By

---

## 10.5 Screen: PO Detail
**URL**: `/purchase-orders/:id`  |  **Access**: Manager+

### Header
- PO number, vendor name, status, creation date
- Total amount (large), payment status
- Actions: [Approve] [Receive Goods] [Attach Invoice] [Print] [Cancel]

### Tabs
| Tab | Content |
|-----|---------|
| **Items** | Line items table: Description, Qty, Unit Price, Total, Received |
| **Goods Receipt** | Record received quantities against each line |
| **Invoice** | Attached invoice, OCR-extracted amount |
| **Three-Way Match** | PO vs Invoice vs Goods Receipt comparison |
| **Timeline** | Status changes, approvals, comments |

### Three-Way Match Display
```
┌──────────────────────────────────────────────────────────────────┐
│  Three-Way Match Status: ⚠ PARTIAL MISMATCH                     │
│                                                                  │
│  Item        │ PO Qty │ Received │ Invoiced │ Match             │
│  ────────────│────────│──────────│──────────│──────             │
│  HVAC Belts  │   10   │    10    │    10    │ ✅ Match          │
│  Air Filters │   20   │    18    │    20    │ ⚠ Qty mismatch   │
│  LED Bulbs   │   50   │    50    │    55    │ ❌ Invoice higher │
│                                                                  │
│  PO Total:  ₹1,200  │  Received: ₹1,080  │  Invoiced: ₹1,250   │
│                                                                  │
│  [Auto-Resolve] [Flag for Review] [Override & Approve]          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10.6 Screen: Create Purchase Order
**URL**: `/purchase-orders/create`  |  **Access**: Manager+

### Form
| Section | Fields |
|---------|--------|
| **Vendor** | Vendor autocomplete (or quick-create) |
| **Items** | Dynamic rows: Item (autocomplete), Description, Qty, Unit Price |
| **Shipping** | Expected delivery date, shipping address, shipping cost |
| **Payment** | Payment terms (Net 30/60/90), payment method |
| **Notes** | Internal notes, special instructions |
| **Attachments** | RFQ, specs documents |

### Auto-Calculations
- Line total = Qty × Unit Price
- Subtotal = sum of line totals
- Tax = subtotal × taxRate
- Total = Subtotal + Tax + Shipping - Discount

### Behavior
- "Save as Draft" → DRAFT status
- "Submit for Approval" → PENDING_APPROVAL status
- Under approval limit → auto-approved

---

## 10.7 Screen: Goods Receipt
**URL**: `/purchase-orders/:id/receive`  |  **Access**: Manager+, Staff

### Form
| PO Item | Ordered | Previously Received | Receiving Now | Condition |
|---------|---------|---------------------|--------------|-----------|
| HVAC Belts | 10 | 0 | [___] | [Good/Damaged] |
| Air Filters | 20 | 0 | [___] | [Good/Damaged] |
| LED Bulbs | 50 | 0 | [___] | [Good/Damaged] |

### Behavior
- Updates PO line receivedQty
- Auto stock-in to inventory
- If receivedQty < orderedQty → PO status = PARTIALLY_RECEIVED
- If fully received → PO status = RECEIVED
- Creates movement records in inventory
- Option to create quality inspection

---

## 10.8 Screen: Vendor Comparison
**URL**: `/vendors/compare`  |  **Access**: Manager+

### Layout
Select 2-4 vendors to compare side-by-side:

```
┌──────────────────────────────────────────────────────────────────┐
│  Vendor Comparison                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ AcmeCo       │ │ BuildRight   │ │ PartsPro     │            │
│  │ ⭐⭐⭐⭐½     │ │ ⭐⭐⭐⭐      │ │ ⭐⭐⭐⭐⭐    │            │
│  ├──────────────│ ├──────────────│ ├──────────────│            │
│  │ On-Time: 92% │ │ On-Time: 85% │ │ On-Time: 98% │            │
│  │ Quality: 95% │ │ Quality: 90% │ │ Quality: 97% │            │
│  │ Response: 2d │ │ Response: 4d │ │ Response: 1d │            │
│  │ Defect: 1.2% │ │ Defect: 3.5% │ │ Defect: 0.5% │            │
│  │ Avg Price: $$ │ │ Avg Price: $ │ │ Avg Price: $$ │            │
│  │ Orders: 42   │ │ Orders: 15   │ │ Orders: 28   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  [Radar chart comparing all metrics]                            │
│                                                                  │
│  💡 CoreAI: "PartsPro offers the best reliability but moderate   │
│  pricing. AcmeCo is the value pick for bulk orders."             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10.9 Procurement Workflow Diagram

```
┌────────────┐     ┌────────────┐     ┌──────────┐
│ Need       │────→│ Create PO  │────→│ Approve  │
│ Identified │     │ (Draft)    │     │ PO       │
└────────────┘     └────────────┘     └────┬─────┘
                                            │
                   ┌───────────────────────────┐
                   │         ORDERED            │
                   └─────────────┬─────────────┘
                                 │
             ┌───────────────────┼───────────────────┐
             │                   │                   │
       ┌─────▼─────┐     ┌──────▼──────┐     ┌──────▼──────┐
       │ Goods     │     │ Invoice     │     │ Quality     │
       │ Receipt   │     │ Received    │     │ Inspection  │
       └─────┬─────┘     └──────┬──────┘     └──────┬──────┘
             │                   │                   │
             └───────────────────┼───────────────────┘
                                 │
                          ┌──────▼──────┐
                          │ Three-Way   │
                          │ Match       │
                          └──────┬──────┘
                                 │
                   ┌─────────────┼─────────────┐
                   │             │             │
              ✅ Match      ⚠ Partial     ❌ Mismatch
                   │             │             │
              ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
              │ Payment │  │ Review  │  │ Dispute │
              │ Process │  │ & Fix   │  │ Resolve │
              └────┬────┘  └─────────┘  └─────────┘
                   │
              ┌────▼────┐
              │  CLOSED  │
              └─────────┘
```
