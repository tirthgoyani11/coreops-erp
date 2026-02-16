# 07: Asset Management Module

## 7.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 9 |
| **Phase** | 2-3 |
| **Models** | Asset, Document |
| **Key Feature** | GUAI, QR codes, Depreciation, Asset Lifecycle |
| **Existing** | Asset List built |

---

## 7.2 Screen: Assets List
**URL**: `/assets`  |  **Access**: All roles (scoped)

### Layout (Universal List Pattern)
```
┌──────────────────────────────────────────────────────────────────┐
│  Asset Management                              [+ Add Asset]    │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                 │
│  │Total │ │Active│ │Maint.│ │Decomm│ │ Value│                  │
│  │1,247 │ │  998 │ │  142 │ │  107 │ │₹2.3M │                  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                 │
│                                                                  │
│  🔍 Search...  [Category ▾] [Status ▾] [Location ▾] [More ▾]   │
│  View: [📊 Table] [🗂 Card] [📅 Calendar] [🗺 Map]             │
├──────────────────────────────────────────────────────────────────┤
│  ☐ │ GUAI ↕          │ Name ↕      │ Location│ Status │Value ↕│⋯│
│  ──│─────────────────│─────────────│─────────│────────│───────│──│
│  ☐ │COR-USA-NYC-01   │HVAC Unit    │NYC HQ   │🟢Active│₹12.4K│⋯│
│  ☐ │COR-USA-NYC-02   │Server Rack  │NYC HQ   │🟡Maint.│₹45.0K│⋯│
│  ☐ │COR-IND-MUM-01   │Forklift     │Mumbai   │🟢Active│₹28.0K│⋯│
├──────────────────────────────────────────────────────────────────┤
│  Selected: 0  │ Showing 1-20 of 1,247   ◀ 1 2 3 ... 63 ▶      │
└──────────────────────────────────────────────────────────────────┘
```

### Filters
| Filter | Type | Options |
|--------|------|---------|
| Search | Text | GUAI, Name, Serial Number |
| Category | Multi-select | HVAC, Electrical, Vehicle, IT, etc. |
| Status | Multi-select | Active, Maintenance, Decommissioned, In Transit |
| Location | Tree-select | Organization → Branch → Specific |
| Value Range | Dual slider | Min—Max |
| Purchase Date | Date range | From—To |
| Assigned To | User search | Autocomplete |
| Warranty | Dropdown | Active, Expired, No Warranty |

### View Modes
1. **Table** (default): TanStack Table with sort, resize, pin columns
2. **Card**: Grid of asset cards with image, name, GUAI, status, value
3. **Calendar**: Assets plotted by next-maintenance date
4. **Map**: Interactive map with markers per location (cluster)

### Bulk Actions (when rows selected)
- Export Selected (CSV / Excel / PDF)
- Print QR Codes
- Transfer Selected
- Update Status
- Delete (Admin only)

---

## 7.3 Screen: Asset Detail
**URL**: `/assets/:id`  |  **Access**: All (read-only for Viewer)

### Entity Header
```
┌──────────────────────────────────────────────────────────────────┐
│ ← Assets                     Breadcrumb: Assets > HVAC Unit     │
├──────────────────────────────────────────────────────────────────┤
│ ┌──────┐   Industrial HVAC Unit              [🟢 Active]        │
│ │ [QR] │   GUAI: COR-USA-NYC-HVAC-0042                         │
│ │      │   NYC Headquarters, Floor 2, Room 201                   │
│ └──────┘   Assigned: John Smith | Category: HVAC                │
│            ─────────────────────────────────────────────         │
│            Value: ₹12,450  │  3 Tickets  │  Health: 87%         │
│            [✏ Edit] [📤 Transfer] [🖨 QR] [📋 History] [⋯]     │
└──────────────────────────────────────────────────────────────────┘
```

### Tabs
| Tab | Content |
|-----|---------|
| **Overview** | Basic info, specs, warranty, assignment (all inline-editable) |
| **Maintenance** | Timeline of all tickets with cost, duration, technician |
| **Financial** | Purchase details, depreciation chart, total cost of ownership |
| **Documents** | Manuals, warranties, photos, invoices (drag-drop upload) |
| **Audit Trail** | All changes with timestamp, user, before → after |
| **AI** | Health prediction, failure probability, suggested actions |

### Overview Tab Fields
| Section | Fields |
|---------|--------|
| Basic Info | Category, Subcategory, Manufacturer, Model, Serial Number |
| Location | Organization, Branch, Specific Location, Coordinates |
| Specifications | Custom key-value pairs (dynamically added) |
| Assignment | Assigned User, Department |
| Warranty | Start Date, Expiry Date, Provider, Terms |
| Custom Fields | Any custom fields defined for Assets |

### Financial Tab
- **Purchase Details**: Date, Price, Vendor, Invoice
- **Depreciation Chart**: Line chart showing value over time
- **Current Book Value**: Large display with depreciation info
- **Total Cost of Ownership**: Purchase + all maintenance costs
- **ROI Analysis**: If revenue-generating

### AI Tab
- **Health Score**: 0-100 gauge chart
- **Failure Prediction**: "12% chance of failure in next 30 days"
- **Suggested Actions**: "Schedule preventive maintenance before March 15"
- **Similar Asset Comparison**: Compare with similar assets' performance

---

## 7.4 Screen: Create Asset (Multi-Step Wizard)
**URL**: `/assets/create`  |  **Access**: Manager+

### Step 1: Basic Information
| Field | Type | Validation |
|-------|------|------------|
| Asset Name* | Text | Required, max 100 |
| Category* | Dropdown | Required |
| Subcategory | Dependent dropdown | Based on category |
| Manufacturer | Autocomplete | From existing |
| Model | Text | Optional |
| Serial Number | Text | Unique check (debounced) |
| Description | Textarea | Max 500 chars |
| Images | File upload | Multiple, max 5MB each |

### Step 2: Location & Assignment
| Field | Type | Validation |
|-------|------|------------|
| Organization* | Dropdown | Required |
| Branch* | Dependent dropdown | Required |
| Specific Location | Text | Floor/Room/Area |
| GPS Coordinates | Map picker | Optional |
| Assigned User | User autocomplete | Optional |
| Department | Dropdown | Optional |

### Step 3: Financial & Warranty
| Field | Type | Validation |
|-------|------|------------|
| Purchase Date* | Date picker | Required, ≤ today |
| Purchase Price* | Currency input | Required, > 0 |
| Currency* | Dropdown | From org currencies |
| Vendor* | Vendor autocomplete | Or quick-create |
| Invoice Number | Text | Optional |
| Invoice Upload | File | OCR auto-extract |
| Warranty Start | Date | Defaults to purchase date |
| Warranty End | Date | Must be after start |
| Warranty Provider | Text | Optional |

### Step 4: Depreciation
| Field | Type | Options |
|-------|------|---------|
| Method* | Dropdown | Straight-line, Declining Balance, None |
| Useful Life* | Number (years) | Required if method ≠ None |
| Salvage Value | Currency | Default: 0 |
| Preview | Chart display | Auto-calculated depreciation curve |

### Step 5: Review & Confirm
- Summary of all entered data
- GUAI preview (auto-generated)
- "GUAI will be: COR-USA-NYC-HVAC-0042"
- [← Back] [Create Asset] buttons

### GUAI Generation
```
{ORG_CODE}-{COUNTRY_ISO}-{CITY_CODE}-{CATEGORY}-{SEQUENCE}
Example: COR-USA-NYC-HVAC-0042
```
- Auto-generated on server side
- Never changes after creation
- Used in QR codes

---

## 7.5 Screen: Edit Asset
**URL**: `/assets/:id/edit`  |  **Access**: Manager+

- Same form as Create but pre-filled
- GUAI field is read-only (cannot change)
- Location change triggers Transfer workflow (redirect to transfer screen)
- "Reason for change" field added for audit trail
- Shows change preview before saving

---

## 7.6 Screen: Asset Transfer
**URL**: `/assets/:id/transfer`  |  **Access**: Manager+

### Transfer Form
| Field | Type |
|-------|------|
| Current Location | Display (read-only) |
| Transfer Type* | Dropdown: Inter-branch, Sell, Dispose, Scrap |
| Destination Organization* | Dropdown |
| Destination Branch* | Dependent dropdown |
| Transfer Date* | Date picker |
| Reason* | Dropdown + text |
| Asset Condition | Star rating (1-5) + notes |
| Before Photos | File upload |
| Approval Required | Auto-determined (display) |

### Transfer Workflow
```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│ Transfer     │────→│ Manager      │────→│ Asset Status:  │
│ Requested    │     │ Approves     │     │ "IN_TRANSIT"   │
└─────────────┘     └──────────────┘     └───────┬───────┘
                                                   │
                                                   ▼
                    ┌──────────────┐     ┌───────────────┐
                    │ GUAI Updated │←────│ Destination    │
                    │ Location Set │     │ Confirms       │
                    └──────────────┘     └───────────────┘
```

---

## 7.7 Screen: QR Code View
**URL**: `/assets/:id/qr`  |  **Access**: All

### Features
- Large QR code display
- Contains GUAI + direct link to asset detail
- Size: Small (2cm), Medium (4cm), Large (6cm)
- Format: PNG, SVG, PDF
- Customization: Company logo overlay, color
- **Bulk Print**: Select multiple assets → generate label sheet (PDF)

---

## 7.8 Screen: Depreciation Calculator
**URL**: `/assets/:id/depreciation`  |  **Access**: Manager+

### Calculator
| Input | Pre-filled |
|-------|------------|
| Purchase Price | From asset |
| Purchase Date | From asset |
| Depreciation Method | From asset settings |
| Useful Life (years) | From asset settings |
| Salvage Value | From asset settings |

### Output
- **Current Book Value** (large number display)
- **Depreciation Schedule Table**: Year, Opening Value, Depreciation, Closing Value
- **Visual Chart**: Line/area chart showing value decline
- **Export**: PDF or Excel

---

## 7.9 Screen: Asset Map View
**URL**: `/assets/map`  |  **Access**: All

### Features
- Interactive map (Leaflet/Mapbox)
- Markers clustered by location
- Color-coded by status (green/yellow/red)
- Click marker → popup with asset summary
- "View Detail" link in popup
- Filter by category, status on map
- Heatmap overlay toggle (asset density)

---

## 7.10 Screen: Asset Import
**URL**: `/assets/import`  |  **Access**: Admin

### CSV Import Wizard
1. **Upload**: Drag-drop CSV/Excel file
2. **Map Columns**: Match CSV headers to asset fields
3. **Validate**: Show validation results (errors highlighted)
4. **Preview**: First 10 rows preview
5. **Import**: Progress bar with results (created/skipped/errors)

### Template Download
- Downloadable CSV template with all fields
- Sample data included
