# 09: Inventory & Warehouse Module

## 9.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 10 |
| **Phase** | 2-3 |
| **Models** | Inventory |
| **Key Feature** | Dual-stream (Products + Spare Parts), low-stock alerts, movement tracking |
| **Existing** | Combined inventory list built |

---

## 9.2 Screen: Inventory List
**URL**: `/inventory`  |  **Access**: All (scoped)

### Quick Stats Row
| Stat | Description |
|------|-------------|
| Total Items | Count of all inventory items |
| Products | Items where type=PRODUCT |
| Spare Parts | Items where type=SPARE_PART |
| Low Stock | Items below reorder point |
| Total Value | Sum of (quantity × unitCost) |

### Tab Toggle
```
[All Items] [Products Only] [Spare Parts Only] [Low Stock ⚠]
```

### Table Columns
| Column | Type |
|--------|------|
| Checkbox | Select |
| SKU | Text (clickable) |
| Name | Text |
| Type | Badge (Product/Spare) |
| Category | Text |
| Quantity | Number (colored red if < reorderPoint) |
| Unit Cost | Currency |
| Total Value | Currency (qty × cost) |
| Location | Text (warehouse/shelf) |
| Status | Badge |
| Actions | View, Edit, Stock-In, Stock-Out |

### Filters
| Filter | Type |
|--------|------|
| Search | Text (SKU, Name) |
| Type | Toggle: All/Products/Spares |
| Category | Multi-select |
| Stock Level | Dropdown: All, Low Stock, Out of Stock, Overstocked |
| Location/Warehouse | Multi-select |
| Vendor | Autocomplete |
| Expiry | Date range |

---

## 9.3 Screen: Inventory Detail
**URL**: `/inventory/:id`  |  **Access**: All

### Entity Header
- Item name, SKU, type badge, status
- Current quantity (large font), unit, unit cost
- Reorder point indicator (gauge)
- Quick actions: [Stock In] [Stock Out] [Transfer] [Edit]

### Tabs
| Tab | Content |
|-----|---------|
| **Overview** | All fields, vendor info, images, custom fields |
| **Movement History** | Table: Date, Type (IN/OUT), Qty, Reference, User |
| **Usage Analytics** | Consumption trend chart, avg monthly usage, forecast |
| **Linked Entities** | POs that supplied this, tickets that consumed this |
| **Audit Trail** | All changes |

### Movement History Layout
```
┌──────────────────────────────────────────────────────────────────┐
│ Date         │ Type     │ Qty  │ Reference    │ User    │Balance │
│──────────────│──────────│──────│──────────────│─────────│────────│
│ Feb 1, 2026  │ 🟢 IN   │ +50  │ PO-042       │ Jane S. │ 150   │
│ Jan 28, 2026 │ 🔴 OUT  │ -2   │ MT-089       │ John S. │ 100   │
│ Jan 15, 2026 │ 🟢 IN   │ +100 │ PO-039       │ Jane S. │ 102   │
│ Jan 10, 2026 │ 🔴 OUT  │ -5   │ MT-085       │ Mike C. │ 2     │
│ Jan 5, 2026  │ 🟡 ADJ  │ +7   │ Stock Count  │ Admin   │ 7     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9.4 Screen: Create Inventory Item
**URL**: `/inventory/create`  |  **Access**: Manager+

### Form Fields
| Field | Type | Validation |
|-------|------|------------|
| Item Name* | Text | Required, max 100 |
| Type* | Radio | Product / Spare Part |
| SKU | Text | Auto-generated or manual (unique) |
| Category* | Dropdown | Required |
| Description | Textarea | Optional |
| Unit* | Dropdown | pcs, kg, ltr, meter, box, etc. |
| Unit Cost* | Currency | Required, > 0 |
| Initial Quantity | Number | Default: 0 |
| Reorder Point* | Number | Required, > 0 |
| Reorder Quantity | Number | Suggested reorder amount |
| Location/Warehouse | Text | Shelf/bin location |
| Vendor | Vendor autocomplete | Primary supplier |
| Expiry Date | Date | For perishable items |
| Images | File upload | Multiple |

### SKU Auto-Generation
```
Format: {TYPE}-{CATEGORY}-{SEQUENCE}
Product: PRD-ELEC-0042
Spare:   SPR-HVAC-0089
```

---

## 9.5 Screen: Stock-In
**URL**: `/inventory/:id/stock-in`  |  **Access**: Manager+, Staff

### Form
| Field | Type |
|-------|------|
| Item | Display (pre-selected) |
| Quantity* | Number (> 0) |
| Reference | Text (PO number, delivery note) |
| Vendor | Auto-filled from PO if linked |
| Batch Number | Text |
| Expiry Date | Date |
| Unit Cost | Currency (for cost update) |
| Invoice | File upload |
| Notes | Textarea |

### Behavior
- Increases item quantity
- Updates lastStockIn date
- Creates movement record
- If linked to PO → updates PO receivedQty
- Triggers notification if item was in low-stock

---

## 9.6 Screen: Stock-Out / Consumption
**URL**: `/inventory/:id/stock-out`  |  **Access**: Manager+, Technician

### Form
| Field | Type |
|-------|------|
| Item | Display (pre-selected) |
| Quantity* | Number (> 0, ≤ available qty) |
| Reference | Text or auto-link (Ticket number) |
| Consumed For | Dropdown: Maintenance Ticket, Project, Direct Use |
| Link Entity | Entity search (ticket/project autocomplete) |
| Notes | Textarea |

### Behavior
- Decreases item quantity
- Creates movement record
- If linked to ticket → adds to partsUsed
- If quantity drops below reorderPoint → low-stock notification
- If quantity hits 0 → out-of-stock alert

---

## 9.7 Screen: Inventory Transfer
**URL**: `/inventory/:id/transfer`  |  **Access**: Manager+

### Form
| Field | Type |
|-------|------|
| Item | Display |
| From Location* | Display (current) |
| To Location* | Location picker |
| Quantity* | Number (> 0, ≤ available) |
| Reason | Dropdown + text |
| Transfer Date | Date (default today) |

---

## 9.8 Screen: Low Stock Alerts
**URL**: `/inventory/low-stock`  |  **Access**: Manager+

### Layout
```
┌──────────────────────────────────────────────────────────────────┐
│  ⚠ Low Stock Alerts (12 items)                   [Auto Reorder] │
├──────────────────────────────────────────────────────────────────┤
│ Item        │ Current │ Reorder Pt │ Deficit │ Vendor  │ Action  │
│─────────────│─────────│────────────│─────────│─────────│─────────│
│ HVAC Belts  │   2     │    10      │   -8    │ AcmeCo  │[Order]  │
│ LED Bulbs   │   5     │    20      │   -15   │ LightCo │[Order]  │
│ Air Filters │   0     │    15      │   -15   │ AcmeCo  │[Order]  │
└──────────────────────────────────────────────────────────────────┘
```

### Auto-Reorder Feature
- One-click: creates draft PO with reorder quantity from preferred vendor
- Batch reorder: select multiple → single PO per vendor

---

## 9.9 Screen: Stock Valuation Report
**URL**: `/inventory/valuation`  |  **Access**: Manager+

### Report
| Category | Items | Quantity | Total Value |
|----------|-------|----------|-------------|
| Electronics | 45 | 1,200 | ₹45,000 |
| HVAC Parts | 32 | 800 | ₹28,000 |
| Safety | 18 | 500 | ₹12,000 |
| **TOTAL** | **95** | **2,500** | **₹85,000** |

### Charts
- **By Category** (Donut): Value distribution
- **Trend** (Line): Monthly stock value over 12 months
- **Slow Moving** (Table): Items with no movement in 90+ days

---

## 9.10 Screen: Inventory Import
**URL**: `/inventory/import`  |  **Access**: Admin

### CSV Import Wizard (same pattern as Asset Import)
1. Upload CSV/Excel
2. Map columns to fields
3. Validate data
4. Preview
5. Import with progress bar

### Barcode Integration
- Scan barcode → search by SKU
- If found → open detail
- If not found → create new with scanned SKU
