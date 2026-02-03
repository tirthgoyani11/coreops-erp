# Phase 10: Vendor Management Module

## 10.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 5 (Screens 36-40) |
| **Purpose** | Supplier relationship management |
| **Key Feature** | MTBF reliability scoring |

---

## 10.2 Screen 36: Vendors List

**URL**: `/vendors`  
**Access**: Manager roles + Viewer (read-only)

### Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ Vendor Management                                       [+ Add Vendor] │
│ Manage suppliers and track reliability                                 │
├────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search vendors...  │ Category ▼ │ Rating ▼ │ Status ▼              │
├────────────────────────────────────────────────────────────────────────┤
│ Vendor          │ Category        │ MTBF    │ Rating │ Transactions    │
│ ────────────────┼─────────────────┼─────────┼────────┼──────────────── │
│ ABC Supply Co.  │ HVAC Parts      │ 2,500 h │ ⭐⭐⭐⭐⭐│ 45 ($125K)      │
│ XYZ Electronics │ Electronics     │ 1,800 h │ ⭐⭐⭐⭐ │ 23 ($67K)       │
│ FastParts Inc.  │ General         │ 1,200 h │ ⭐⭐⭐  │ 12 ($28K)       │
├────────────────────────────────────────────────────────────────────────┤
│ Total Vendors: 34 │ Active: 28 │ Avg MTBF: 1,950 hrs                   │
└────────────────────────────────────────────────────────────────────────┘
```

### Columns Explained
| Column | Description |
|--------|-------------|
| MTBF | Mean Time Between Failures for supplied parts |
| Rating | 1-5 stars based on MTBF, delivery, pricing |
| Transactions | Count and total value |

---

## 10.3 Screen 37: Vendor Detail

**URL**: `/vendors/:id`  
**Access**: Manager roles + Viewer (read-only)

### Header
```
┌────────────────────────────────────────────────────────────────────────┐
│ ABC Supply Co.                                  🟢 Active    ⭐⭐⭐⭐⭐   │
│ Primary Supplier - HVAC Parts                                          │
│ ────────────────────────────────────────────────────────────────────── │
│ Contact: John Doe │ john@abcsupply.com │ +1 (555) 123-4567            │
│ Address: 123 Industrial Park, New York, NY 10001                       │
│                                                                        │
│ [Edit] [Create PO] [View History] [Archive]                           │
└────────────────────────────────────────────────────────────────────────┘
```

### Tabs

#### Overview Tab
| Section | Fields |
|---------|--------|
| Contact Info | Primary contact, Phone, Email, Website |
| Address | Street, City, State, Country, ZIP |
| Banking | Bank, Account (masked), SWIFT/IFSC |
| Tax Info | Tax ID, GST/VAT number |
| Payment Terms | Net 30, Net 60, etc. |
| Category | Product/service categories |

#### Performance Tab (Key Feature)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Reliability Metrics                                                    │
├────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐           │
│ │ MTBF            │ │ On-Time Delivery│ │ Quality Score   │           │
│ │ 2,500 hours     │ │ 94%             │ │ 4.8/5.0         │           │
│ │ ▲ +200h vs avg  │ │                 │ │                 │           │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘           │
├────────────────────────────────────────────────────────────────────────┤
│ Part Failure Analysis                                                  │
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ [Line Chart showing failure rate over time by part category]       ││
│ └────────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────┤
│ Parts Supplied                                                         │
│ Part Name         │ Qty Supplied │ Avg MTBF │ Failure Rate │ Score    │
│ ──────────────────┼──────────────┼──────────┼──────────────┼───────── │
│ Compressor Belt   │ 150          │ 2,800 h  │ 2.1%         │ ⭐⭐⭐⭐⭐  │
│ Refrigerant       │ 200          │ N/A      │ 0%           │ ⭐⭐⭐⭐⭐  │
│ Circuit Board     │ 45           │ 1,500 h  │ 5.2%         │ ⭐⭐⭐⭐   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Transaction History Tab
| Date | Type | Reference | Amount | Status |
|------|------|-----------|--------|--------|
| Feb 1, 2026 | PO | PO-00189 | $2,450 | Paid |
| Jan 15, 2026 | PO | PO-00178 | $1,890 | Paid |
| Dec 28, 2025 | PO | PO-00165 | $3,200 | Paid |

#### Documents Tab
- Contracts
- Certificates (ISO, etc.)
- Insurance documents
- Product catalogs

---

## 10.4 Screen 38: Create Vendor

**URL**: `/vendors/create`  
**Access**: Super Admin, Regional Manager, Branch Manager (request)

### Form Sections

#### Company Information
| Field | Type | Validation |
|-------|------|------------|
| Company Name* | Text | Required |
| Legal Name | Text | If different |
| Tax ID* | Text | Required, validate format |
| Website | URL | Optional |
| Category* | Multi-select | At least one |

#### Primary Contact
| Field | Type | Validation |
|-------|------|------------|
| Contact Name* | Text | Required |
| Email* | Email | Required, valid format |
| Phone* | Tel | Required |
| Job Title | Text | Optional |

#### Address
| Field | Type | Validation |
|-------|------|------------|
| Street Address* | Text | Required |
| City* | Text | Required |
| State/Province* | Dropdown | Required |
| Country* | Dropdown | Required |
| Postal Code* | Text | Required |

#### Banking Details
| Field | Type | Validation |
|-------|------|------------|
| Bank Name | Text | Optional |
| Account Number | Text | Optional, encrypted |
| SWIFT/IFSC | Text | Optional |
| Currency | Dropdown | Default: USD |

#### Terms
| Field | Type | Options |
|-------|------|---------|
| Payment Terms* | Dropdown | Net 15, 30, 60, 90 |
| Credit Limit | Currency | Optional |
| Discount % | Number | Optional |

---

## 10.5 Screen 39: Reliability Dashboard

**URL**: `/vendors/reliability`  
**Access**: Manager roles + Viewer (read-only)

### MTBF Analytics Dashboard
```
┌────────────────────────────────────────────────────────────────────────┐
│ Vendor Reliability Analytics                                           │
│ Filter: [Category ▼] [Date Range ▼] [Location ▼]                      │
├────────────────────────────────────────────────────────────────────────┤
│ Top Performers                    │ Worst Performers                   │
│ ┌─────────────────────────────┐   │ ┌─────────────────────────────┐   │
│ │ 1. ABC Supply - 2,500h      │   │ │ 1. Cheap Parts - 800h       │   │
│ │ 2. Premium Co - 2,300h      │   │ │ 2. Budget Inc - 950h        │   │
│ │ 3. Quality Inc - 2,100h     │   │ │ 3. FastDeal - 1,100h        │   │
│ └─────────────────────────────┘   │ └─────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────┤
│ MTBF Trends by Vendor                                                  │
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ [Multi-line chart: MTBF over 12 months for top vendors]            ││
│ └────────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────┤
│ Cost per Failure                                                       │
│ Vendor          │ Parts Supplied │ Failures │ Cost per Failure │ Trend │
│ ────────────────┼────────────────┼──────────┼──────────────────┼────── │
│ ABC Supply      │ 450            │ 3        │ $125             │ ↓     │
│ XYZ Electronics │ 280            │ 8        │ $340             │ ↑     │
└────────────────────────────────────────────────────────────────────────┘
```

### MTBF Calculation
```
MTBF = Total Operating Hours / Number of Failures

Example:
- Part A supplied: 100 units
- Average usage: 50 hours each = 5,000 total hours
- Failures reported: 2
- MTBF = 5,000 / 2 = 2,500 hours
```

---

## 10.6 Screen 40: Vendor Comparison

**URL**: `/vendors/compare`  
**Access**: Manager roles + Viewer (read-only)

### Comparison Tool
```
┌────────────────────────────────────────────────────────────────────────┐
│ Compare Vendors                                                        │
│ Select vendors to compare side-by-side                                 │
├────────────────────────────────────────────────────────────────────────┤
│ [Add Vendor +] [Add Vendor +] [Add Vendor +]                          │
├─────────────────────┬─────────────────────┬─────────────────────┬─────┤
│ ABC Supply          │ XYZ Electronics     │ FastParts Inc       │     │
├─────────────────────┼─────────────────────┼─────────────────────┼─────┤
│ Rating              │                     │                     │     │
│ ⭐⭐⭐⭐⭐ (4.9)        │ ⭐⭐⭐⭐ (4.2)         │ ⭐⭐⭐ (3.5)          │     │
├─────────────────────┼─────────────────────┼─────────────────────┼─────┤
│ MTBF                │                     │                     │     │
│ 2,500 hours ✓       │ 1,800 hours         │ 1,200 hours         │ Best│
├─────────────────────┼─────────────────────┼─────────────────────┼─────┤
│ Avg Price           │                     │                     │     │
│ $45.00              │ $42.00 ✓            │ $38.00 ✓            │ Low │
├─────────────────────┼─────────────────────┼─────────────────────┼─────┤
│ Delivery Time       │                     │                     │     │
│ 3 days ✓            │ 5 days              │ 7 days              │ Fast│
├─────────────────────┼─────────────────────┼─────────────────────┼─────┤
│ On-Time %           │                     │                     │     │
│ 94% ✓               │ 88%                 │ 75%                 │ Best│
├─────────────────────┼─────────────────────┼─────────────────────┼─────┤
│ Recommendation      │                     │                     │     │
│ ⭐ BEST OVERALL     │ Good Alternative    │ Budget Option       │     │
└─────────────────────┴─────────────────────┴─────────────────────┴─────┘
```

### Comparison Criteria
- MTBF (weighted 30%)
- Pricing (weighted 25%)
- Delivery Time (weighted 20%)
- On-Time Delivery % (weighted 15%)
- Return/Defect Rate (weighted 10%)
