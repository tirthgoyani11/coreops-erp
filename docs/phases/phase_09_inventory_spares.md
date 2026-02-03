# Phase 09: Inventory Module - Spare Parts

## 9.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 6 (Screens 30-35) |
| **Purpose** | Maintenance parts inventory |
| **Key Feature** | Ticket-based consumption tracking |

---

## 9.2 Screen 30: Spare Parts List

**URL**: `/inventory/spares`  
**Access**: All roles (Technicians: read-only)

### Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ Spare Parts Inventory                                  [+ Add Part]    │
│ Maintenance parts and consumables                                      │
├────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search by SKU, name...  │ Category ▼ │ Compatibility ▼ │ Stock ▼   │
├────────────────────────────────────────────────────────────────────────┤
│ SKU         │ Part Name      │ Compatible   │ Stock │ Cost   │ Status │
│ ────────────┼────────────────┼──────────────┼───────┼────────┼─────── │
│ SPR-0001    │ Compressor Belt│ HVAC         │ 12    │ $45.00 │ 🟢     │
│ SPR-0002    │ Oil Filter     │ Vehicles     │ 🔴 3  │ $22.00 │ 🔴 Low │
│ SPR-0003    │ Circuit Board  │ Electronics  │ 8     │ $189.00│ 🟡     │
├────────────────────────────────────────────────────────────────────────┤
│ Total Parts: 234 │ Total Value: $45,678 │ Low Stock: 12 │ Reorder: 5 │
└────────────────────────────────────────────────────────────────────────┘
```

### Special Features
- **Compatibility Filter**: Filter by asset type/category
- **Interchangeability**: List equivalent parts
- **Lead Time Display**: Days until replenishment
- **Vendor Link**: Quick order from preferred vendor

---

## 9.3 Screen 31: Spare Part Detail

**URL**: `/inventory/spares/:id`  
**Access**: All roles (Technicians: read-only)

### Tabs

#### Overview Tab
| Field | Description |
|-------|-------------|
| SKU | Auto-generated (SPR-XXXX) |
| Part Name | Display name |
| Part Number | Manufacturer part # |
| Category | Part category |
| Compatible Assets | List of asset types/models |
| Specifications | Technical specs |
| Reorder Point | Alert threshold |
| Lead Time | Days to receive |

#### Vendor Information Tab
| Vendor | Part # | Price | Lead Time | MTBF | Preferred |
|--------|--------|-------|-----------|------|-----------|
| ABC Supply | VND-123 | $45.00 | 3 days | 2,500 hrs | ⭐ |
| XYZ Parts | XYZ-456 | $42.00 | 7 days | 1,800 hrs | |

#### Usage History Tab
```
● Feb 3, 2026 - Consumed 1 unit (Ticket #MT-789)
● Jan 28, 2026 - Consumed 2 units (Ticket #MT-765)
● Jan 15, 2026 - Stock-In 20 units (PO #PO-456)
```

#### Interchangeable Parts Tab
- List of equivalent/substitute parts
- Price comparison
- Availability status

---

## 9.4 Screen 32: Stock-In (Spares)

**URL**: `/inventory/spares/stock-in`  
**Access**: Manager roles

### Same as Product Stock-In with additional fields:
| Field | Type |
|-------|------|
| Vendor Part Number | Text |
| Batch/Lot Number | Text |
| Expiry Date | Date (if applicable) |
| Certificate Upload | File (calibration, etc.) |

---

## 9.5 Screen 33: Consumption Log

**URL**: `/inventory/consumption`  
**Access**: All roles (Technicians: own records)

### Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ Parts Consumption Log                                                  │
│ Track all spare parts used in maintenance                              │
├────────────────────────────────────────────────────────────────────────┤
│ Filter: [Date Range] [Technician ▼] [Part ▼] [Asset ▼]                │
├────────────────────────────────────────────────────────────────────────┤
│ Date       │ Ticket   │ Part           │ Qty │ Technician │ Asset     │
│ ───────────┼──────────┼────────────────┼─────┼────────────┼────────── │
│ Feb 3, 26  │ MT-789   │ Compressor Belt│ 1   │ John S.    │ HVAC-042  │
│ Feb 3, 26  │ MT-789   │ Refrigerant    │ 2   │ John S.    │ HVAC-042  │
│ Feb 2, 26  │ MT-788   │ Oil Filter     │ 1   │ Mike C.    │ FORK-001  │
├────────────────────────────────────────────────────────────────────────┤
│ Total Consumed (MTD): 156 items │ Total Cost: $4,567                  │
└────────────────────────────────────────────────────────────────────────┘
```

### Consumption Entry (from Ticket)
When technician adds part to ticket:
1. Search part by SKU/Name
2. Enter quantity
3. Auto-deduct from inventory
4. Link to ticket
5. Log created automatically

---

## 9.6 Screen 34: Low Stock Alerts

**URL**: `/inventory/alerts`  
**Access**: Manager roles + Viewer (read-only)

### Alert Dashboard
```
┌────────────────────────────────────────────────────────────────────────┐
│ Inventory Alerts                                      [Configure Alerts]│
├────────────────────────────────────────────────────────────────────────┤
│ 🔴 CRITICAL (5)         │ 🟡 WARNING (12)         │ ℹ️ INFO (3)        │
├────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ 🔴 OUT OF STOCK: Oil Filter (SPR-0002)                           │  │
│ │    Current: 0 │ Reorder Point: 5 │ Avg Usage: 8/month            │  │
│ │    Preferred Vendor: ABC Supply │ Lead Time: 3 days              │  │
│ │                                           [Create PO] [Dismiss]  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ 🟡 LOW STOCK: Compressor Belt (SPR-0001)                         │  │
│ │    Current: 3 │ Reorder Point: 10 │ Days Until Stockout: 5       │  │
│ │                                          [Create PO] [Snooze]    │  │
│ └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Alert Types
| Type | Trigger | Action |
|------|---------|--------|
| Out of Stock | Qty = 0 | Urgent notification |
| Critical Low | Qty < 20% of reorder | Dashboard alert |
| Below Reorder | Qty < Reorder Point | Email + Dashboard |
| Expiring Soon | Within 30 days | Warning notification |
| Slow Moving | No usage in 90 days | Review suggestion |

---

## 9.7 Screen 35: Inventory Transfer

**URL**: `/inventory/transfer`  
**Access**: Manager roles (Branch Mgr: request)

### Transfer Form
```
┌────────────────────────────────────────────────────────────────────────┐
│ Create Inventory Transfer                                              │
├────────────────────────────────────────────────────────────────────────┤
│ Transfer Type: ○ Products  ● Spare Parts                               │
├────────────────────────────────────────────────────────────────────────┤
│ From Location*: [NYC Headquarters ▼]                                   │
│ To Location*:   [LA Office ▼]                                          │
├────────────────────────────────────────────────────────────────────────┤
│ Items to Transfer:                                                     │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ [Add Item +]                                                     │  │
│ ├──────────────────────────────────────────────────────────────────┤  │
│ │ SKU: SPR-0001 │ Compressor Belt │ Available: 12 │ Transfer: [5]  │  │
│ │ SKU: SPR-0003 │ Circuit Board   │ Available: 8  │ Transfer: [2]  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│ Transfer Date*: [Feb 5, 2026]                                          │
│ Reason*: [Stock Balancing ▼]                                           │
│ Notes: [                                                        ]      │
├────────────────────────────────────────────────────────────────────────┤
│ Approval Required: Yes (Cross-branch transfer)                         │
│                                                   [Cancel] [Submit]    │
└────────────────────────────────────────────────────────────────────────┘
```

### Transfer Workflow
```
Request → Approval → Shipped → In Transit → Received → Complete
```

### Status Updates
- Source updates to "Shipped"
- Items marked as "In Transit" (not available)
- Destination confirms receipt
- Inventory updated at both locations
