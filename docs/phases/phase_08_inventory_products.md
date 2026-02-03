# Phase 08: Inventory Module - Products

## 8.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 4 (Screens 26-29) |
| **Purpose** | Revenue-generating product inventory |
| **Key Feature** | Auto-generated SKU, Stock tracking |

---

## 8.2 Dual-Stream Inventory Concept

```
┌─────────────────────────────────────────────────────────────────────┐
│                     INVENTORY MANAGEMENT                            │
├────────────────────────────────┬────────────────────────────────────┤
│         PRODUCTS               │         SPARE PARTS                │
│      (Revenue Stream)          │        (Cost Center)               │
├────────────────────────────────┼────────────────────────────────────┤
│ • Sold to customers            │ • Used for maintenance             │
│ • Tracked as sales             │ • Consumed on tickets              │
│ • Revenue metrics              │ • Cost allocation                  │
│ • SKU: PRD-XXXX                │ • SKU: SPR-XXXX                    │
│ • Stock-In via Purchase        │ • Stock-In via Purchase            │
│ • Stock-Out via Sales          │ • Stock-Out via Consumption        │
└────────────────────────────────┴────────────────────────────────────┘
```

---

## 8.3 Screen 26: Product List

**URL**: `/inventory/products`  
**Access**: Manager roles + Viewer (read-only)

### Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ Products Inventory                                     [+ Add Product] │
│ Track and manage products for sale                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search by SKU, name...  │ Category ▼ │ Stock Status ▼ │ Location ▼ │
├────────────────────────────────────────────────────────────────────────┤
│ SKU         │ Product Name    │ Category │ Stock │ Unit Price │ Value │
│ ────────────┼─────────────────┼──────────┼───────┼────────────┼────── │
│ PRD-0001    │ Wireless Router │ Electron │ 45    │ $89.99     │ $4,050│
│ PRD-0002    │ Office Chair    │ Furniture│ 🔴 2  │ $199.00    │ $398  │
│ PRD-0003    │ LED Monitor     │ Electron │ 28    │ $299.00    │ $8,372│
├────────────────────────────────────────────────────────────────────────┤
│ Total Products: 156 │ Total Value: $245,678 │ Low Stock: 8            │
└────────────────────────────────────────────────────────────────────────┘
```

### Stock Status Indicators
| Level | Color | Condition |
|-------|-------|-----------|
| Healthy | 🟢 Green | Stock > 50% of max |
| Moderate | 🟡 Yellow | Stock 20-50% of max |
| Low | 🔴 Red | Stock < 20% or below reorder point |
| Out of Stock | ⚫ Black | Stock = 0 |

---

## 8.4 Screen 27: Product Detail

**URL**: `/inventory/products/:id`  
**Access**: Manager roles + Viewer (read-only)

### Tabs

#### Overview Tab
| Field | Description |
|-------|-------------|
| SKU | Auto-generated (PRD-XXXX) |
| Product Name | Display name |
| Category | Product category |
| Description | Full description |
| Unit of Measure | Each, Box, Case, etc. |
| Reorder Point | Auto-alert threshold |
| Max Stock | Maximum inventory level |

#### Stock Levels Tab
| Location | In Stock | Reserved | Available | Reorder |
|----------|----------|----------|-----------|---------|
| NYC HQ | 45 | 5 | 40 | No |
| LA Office | 🔴 2 | 0 | 2 | **Yes** |
| Total | 47 | 5 | 42 | - |

#### Transaction History Tab
```
● Feb 3, 2026 - Stock-Out: 3 units (Sale #INV-00234)
● Feb 1, 2026 - Stock-In: 50 units (PO #PO-00189)
● Jan 28, 2026 - Transfer: 10 units (NYC → LA)
```

#### Pricing Tab
- Unit Cost (avg/FIFO)
- Selling Price
- Margin percentage
- Price history chart

---

## 8.5 Screen 28: Stock-In (Products)

**URL**: `/inventory/products/stock-in`  
**Access**: Manager roles

### Form
| Field | Type | Validation |
|-------|------|------------|
| Product* | Autocomplete | Required |
| Quantity* | Number | > 0 |
| Unit Cost* | Currency | > 0 |
| Purchase Order | Reference | Link to PO |
| Location* | Dropdown | Receiving location |
| Received Date* | Date | Default: Today |
| Invoice Number | Text | Optional |
| Invoice Upload | File | OCR extraction |
| Notes | Textarea | Optional |

### OCR Integration
- Scan invoice image
- Auto-extract: Vendor, Items, Quantities, Prices
- Confirm/Edit before saving

---

## 8.6 Screen 29: Stock-Out (Products)

**URL**: `/inventory/products/stock-out`  
**Access**: Manager roles

### Form
| Field | Type | Validation |
|-------|------|------------|
| Product* | Autocomplete | Required |
| Quantity* | Number | Cannot exceed available |
| Reason* | Dropdown | Sale, Transfer, Damage, Expired |
| Reference | Text | Invoice/Transfer ID |
| Location* | Dropdown | Source location |
| Date* | Date | Default: Today |
| Customer | Autocomplete | If sale reason |
| Notes | Textarea | Optional |

---

## 8.7 API Endpoints

```
GET    /api/inventory/products          # List with filters
GET    /api/inventory/products/:id      # Detail
POST   /api/inventory/products          # Create
PUT    /api/inventory/products/:id      # Update
DELETE /api/inventory/products/:id      # Delete (Admin)
POST   /api/inventory/products/stock-in  # Add stock
POST   /api/inventory/products/stock-out # Remove stock
```
