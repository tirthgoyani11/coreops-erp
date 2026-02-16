# 15: Manufacturing / BOM Module

## 15.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 4 |
| **Phase** | 6 |
| **Models** | BillOfMaterial, WorkOrder |
| **Key Feature** | BOM cost calculator, work orders, material requisition |

---

## 15.2 Screen: BOM List
**URL**: `/manufacturing/bom`  |  **Access**: Manager+

### Table Columns
- BOM ID, Product Name, Version, Materials Count, Total Cost, Cycle Time, Status, Actions

---

## 15.3 Screen: BOM Detail / Builder
**URL**: `/manufacturing/bom/:id`  |  **Access**: Manager+

### Entity Header
- BOM ID, product name, version, status badge
- Actions: [✏ Edit] [📋 Copy] [📦 Create Work Order]

### Tabs
| Tab | Content |
|-----|---------|
| **Materials** | Tree of raw materials with quantities, scrap rates |
| **Operations** | Steps: workstation, duration, cost per operation |
| **Cost Analysis** | Material cost + labor cost = total per unit |
| **Versions** | Version history with diffs |

### BOM Tree View
```
📦 Finished Product: Steel Table
├── 🔧 Steel Frame Assembly
│   ├── 📄 Steel Tubes × 4 (₹8 each) = ₹32
│   ├── 📄 Welding Rods × 10 (₹0.50 each) = ₹5
│   └── 📄 Screws × 20 (₹0.10 each) = ₹2
├── 🔧 Table Top
│   ├── 📄 Wood Panel × 1 (₹45) = ₹45
│   └── 📄 Laminate × 1 (₹15) = ₹15
├── 📄 Paint × 0.5 ltr (₹20/ltr) = ₹10
└── 📄 Packaging × 1 (₹5) = ₹5
                              ─────────
                     Material Cost: ₹114
                     Labor Cost:     ₹30
                     Total per Unit: ₹144
```

---

## 15.4 Screen: Work Orders
**URL**: `/manufacturing/work-orders`  |  **Access**: Manager+, Staff

### Table Columns
- Work Order ID, BOM/Product, Planned Qty, Completed Qty, Status, Start Date, End Date, Assigned To

### Work Order Detail
- Header: WO ID, product, quantity, status
- **Materials Tab**: Required vs Issued materials
- **Production Tab**: Log completed units, record output
- **Quality Tab**: Link to quality inspection
- **Timeline**: Status changes

### Create Work Order
| Field | Type |
|-------|------|
| BOM* | BOM autocomplete |
| Quantity* | Number |
| Start Date | Date |
| Expected End Date | Date |
| Assign To | User |
| Priority | Dropdown |
| Notes | Textarea |

- Auto-checks material availability against inventory
- [Issue Materials] → deducts from inventory

---

## 15.5 Screen: Material Planner
**URL**: `/manufacturing/planner`  |  **Access**: Manager+

### MRP (Material Requirements Planning)
| Material | Required | In Stock | Deficit | Action |
|----------|----------|----------|---------|--------|
| Steel Tubes | 400 | 350 | -50 | [Create PO] |
| Wood Panels | 100 | 120 | +20 | Sufficient |
| Paint | 50 ltr | 30 ltr | -20 ltr | [Create PO] |

- Input: List of planned work orders
- Output: Material requirements vs available stock
- One-click PO creation for deficit items
