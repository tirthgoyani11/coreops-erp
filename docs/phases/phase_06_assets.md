# Phase 06: Asset Management Module - List & Overview

## 6.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 8 (Screens 11-18) |
| **Purpose** | Asset lifecycle management |
| **Key Feature** | GUAI (Global Unique Asset Identifier) |

---

## 6.2 Screen 11: Assets List View

**URL**: `/assets`  
**Access**: All roles (scoped by permissions)

### Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ Asset Management                                           [+ Add Asset]│
│ Track and manage all organizational assets                              │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search by GUAI, name, serial...  │ Location ▼ │ Status ▼ │ More │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ View: [📋 Table] [🗂️ Cards] [🗺️ Map]                    Export ▼      │
├────────────────────────────────────────────────────────────────────────┤
│ ☐ │ GUAI           │ Name          │ Location │ Status  │ Value    │⋮ │
│ ──┼────────────────┼───────────────┼──────────┼─────────┼──────────┼─ │
│ ☐ │ COR-USA-NYC-01 │ HVAC Unit     │ NYC HQ   │ 🟢 Active│ $12,450  │⋮ │
│ ☐ │ COR-USA-NYC-02 │ Server Rack   │ NYC HQ   │ 🟡 Maint │ $45,000  │⋮ │
│ ☐ │ COR-IND-MUM-01 │ Forklift      │ Mumbai   │ 🟢 Active│ $28,000  │⋮ │
├────────────────────────────────────────────────────────────────────────┤
│ Showing 1-10 of 245 assets                    ◀ 1 2 3 4 5 ... 25 ▶    │
└────────────────────────────────────────────────────────────────────────┘
```

### Filters Panel

| Filter | Type | Options |
|--------|------|---------|
| Search | Text | GUAI, Name, Serial Number |
| Location | Multi-select | Organization hierarchy |
| Category | Multi-select | Equipment, Vehicles, Electronics, etc. |
| Status | Multi-select | Active, Under Maintenance, Decommissioned |
| Purchase Date | Date Range | From - To |
| Value Range | Dual Slider | Min - Max |
| Assigned To | User Search | Filter by assigned user |

### View Modes

#### Table View (Default)
Columns:
- Checkbox (for bulk select)
- GUAI (clickable link)
- Asset Name
- Category Icon
- Location
- Status Badge
- Current Value
- Last Maintenance Date
- Actions (View, Edit, QR, More...)

#### Card View
```
┌─────────────────────────────┐
│ [Image]                     │
│ ─────────────────────────── │
│ HVAC Unit                   │
│ COR-USA-NYC-HVAC-0042       │
│ NYC Headquarters            │
│ ─────────────────────────── │
│ 🟢 Active    $12,450        │
│ [View] [QR]                 │
└─────────────────────────────┘
```

#### Map View
- Interactive map (Google Maps/Mapbox)
- Markers clustered by location
- Click marker → Asset popup

### Bulk Actions
When rows selected:
- Export Selected (CSV/Excel/PDF)
- Print QR Codes
- Transfer Selected
- Update Status
- Delete (Admin only)

### API Endpoints
```
GET /api/assets
  ?page=1
  &limit=20
  &search=HVAC
  &location=NYC
  &status=active
  &sortBy=createdAt
  &sortOrder=desc
```

---

## 6.3 Screen 12: Asset Detail View

**URL**: `/assets/:id`  
**Access**: All roles (read-only for Technician/Viewer)

### Header Section
```
┌────────────────────────────────────────────────────────────────────────┐
│ ┌─────────┐                                                            │
│ │ [QR]    │  Industrial HVAC Unit                                      │
│ │         │  GUAI: COR-USA-NYC-HVAC-0042          🟢 Active            │
│ └─────────┘  Location: NYC Headquarters, Building A, Floor 2           │
│                                                                        │
│ [Edit] [Transfer] [Print QR] [Maintenance History] [Delete]           │
└────────────────────────────────────────────────────────────────────────┘
```

### Tab Navigation
```
[ Overview ] [ Maintenance ] [ Financial ] [ Documents ] [ Audit Trail ]
```

#### Overview Tab
| Section | Fields |
|---------|--------|
| **Basic Info** | Category, Subcategory, Manufacturer, Model, Serial Number |
| **Location** | Organization, Branch, Specific Location, Coordinates |
| **Specifications** | Custom key-value pairs |
| **Assignment** | Assigned User, Department |
| **Warranty** | Start Date, Expiry Date, Provider, Contact |

#### Maintenance Tab
```
Timeline View:
┌─────────────────────────────────────────────────────────────────┐
│ ● Feb 1, 2026 - Ticket #MT-789                                  │
│   Compressor repair - Completed                                 │
│   Technician: John Smith | Cost: $450                          │
│   [View Ticket]                                                 │
├─────────────────────────────────────────────────────────────────┤
│ ● Jan 15, 2026 - Ticket #MT-456                                 │
│   Preventive maintenance - Completed                           │
│   Technician: Mike Chen | Cost: $120                           │
└─────────────────────────────────────────────────────────────────┘
```

#### Financial Tab
| Section | Content |
|---------|---------|
| Purchase Details | Date, Price, Vendor, Invoice |
| Depreciation | Method, Chart, Current Value, Projected End |
| Total Costs | Purchase + Maintenance breakdown |
| ROI Analysis | If revenue-generating |

#### Documents Tab
- Manuals, Warranties, Photos, Invoices
- Upload with drag-drop
- Preview in lightbox

#### Audit Trail Tab
- All changes with timestamp, user, before/after

---

## 6.4 Screen 13: Create Asset Form

**URL**: `/assets/create`  
**Access**: Super Admin, Regional Manager, Branch Manager

### Multi-Step Wizard

#### Step 1: Basic Information
| Field | Type | Validation |
|-------|------|------------|
| Asset Name* | Text | Required, max 100 chars |
| Category* | Dropdown | Required |
| Subcategory | Dropdown | Dependent on category |
| Manufacturer | Autocomplete | From existing |
| Model | Text | Optional |
| Serial Number | Text | Unique check |
| Description | Textarea | Max 500 chars |
| Image | File Upload | Optional, multiple |

#### Step 2: Location Assignment
| Field | Type | Validation |
|-------|------|------------|
| Organization* | Dropdown | Required |
| Branch* | Dropdown | Based on org |
| Specific Location | Text | Building, Floor, Room |
| GPS Coordinates | Map Picker | Optional |
| Assigned User | User Search | Optional |
| Department | Dropdown | Optional |

#### Step 3: Financial Information
| Field | Type | Validation |
|-------|------|------------|
| Purchase Date* | Date Picker | Required, not future |
| Purchase Price* | Currency Input | Required, > 0 |
| Currency* | Dropdown | From supported |
| Vendor* | Autocomplete | Or create new |
| Invoice Number | Text | Optional |
| Invoice Upload | File | OCR auto-extract |
| Warranty Period | Number + Unit | Optional |

#### Step 4: Depreciation Setup
| Field | Type | Options |
|-------|------|---------|
| Depreciation Method* | Dropdown | Straight-line, Declining Balance, None |
| Useful Life* | Number (years) | Required |
| Salvage Value | Currency | Default: 0 |
| Preview Chart | Display | Auto-calculate |

#### Step 5: Review & Confirm
- Summary of all data
- GUAI Preview (auto-generated)
- Terms checkbox
- Submit button

### GUAI Generation Logic
```
Format: {ORG_CODE}-{COUNTRY}-{CITY}-{CATEGORY}-{SEQUENCE}
Example: COR-USA-NYC-HVAC-0042

- ORG_CODE: 3 letters from organization name
- COUNTRY: ISO 3166-1 alpha-3
- CITY: 3 letters abbreviation
- CATEGORY: 4 letters from category
- SEQUENCE: 4 digits, zero-padded
```

---

## 6.5 Screen 14: Edit Asset Form

**URL**: `/assets/:id/edit`  
**Access**: Super Admin, Regional Manager, Branch Manager

### Key Differences from Create
- GUAI is read-only (cannot change)
- Location change triggers Transfer workflow
- Change log displayed
- "Reason for change" field (for audit)

---

## 6.6 Screen 15: Asset Transfer

**URL**: `/assets/:id/transfer`  
**Access**: Super Admin, Regional Manager, Branch Manager (request)

### Transfer Form
| Field | Type |
|-------|------|
| Current Location | Display (read-only) |
| Transfer Type | Dropdown: Inter-branch, Sell, Dispose, Scrap |
| Destination* | Organization/Branch picker |
| Transfer Date* | Date picker |
| Reason* | Dropdown + Text |
| Condition | Star rating + notes |
| Photos | Before-transfer images |
| Approval Required | Auto-determined |

### Approval Workflow
```
Request Created → Manager Approves → Asset "In Transit" 
→ Destination Confirms → GUAI Updated → Complete
```

---

## 6.7 Screen 16: QR Code View

**URL**: `/assets/:id/qr`  
**Access**: All roles

### Features
- Large QR code display
- Size options: Small, Medium, Large
- Format: PNG, SVG, PDF
- Bulk print (multiple assets)
- Customization: Logo, colors, labels

---

## 6.8 Screen 17: Depreciation Calculator

**URL**: `/assets/:id/depreciation`  
**Access**: Super Admin, Regional Manager, Branch Manager, Viewer (read-only)

### Calculator Interface
| Input | Type |
|-------|------|
| Purchase Price | Currency (pre-filled) |
| Purchase Date | Date (pre-filled) |
| Method | Dropdown |
| Useful Life | Years |
| Salvage Value | Currency |

### Output
- Current Book Value (large display)
- Depreciation Schedule Table
- Visual Chart (line/area)
- Export to PDF/Excel

---

## 6.9 Screen 18: Maintenance History

**URL**: `/assets/:id/history`  
**Access**: All roles

### Timeline Features
- Chronological list of all tickets
- Filter by status, date, technician
- Each entry: ID, Issue, Cost, Duration
- Link to full ticket detail
- Summary statistics: Total tickets, Total cost, Avg time
