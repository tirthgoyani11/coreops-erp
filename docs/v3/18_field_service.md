# 18: Field Service Module

## 18.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 4 |
| **Phase** | 6 |
| **Models** | Maintenance (extended), Employee |
| **Key Feature** | GPS dispatch, mobile-first work orders, route optimization |

---

## 18.2 Screen: Field Service Dashboard
**URL**: `/field-service`  |  **Access**: Manager+

### KPIs
| Technicians Active | Jobs Today | SLA Compliance | Avg Response Time |

### Dispatch Map
```
┌──────────────────────────────────────────────────────────────────┐
│ [Interactive Map]                                                 │
│                                                                  │
│  📍 Job #1: HVAC Repair — 123 Main St          🟢 In Progress   │
│  📍 Job #2: Elevator Inspection — 456 Oak Ave   🟡 Scheduled    │
│  📍 Job #3: Fire System — 789 Pine Blvd         ⏳ En Route     │
│                                                                  │
│  🔵 Tech: John Smith (2 jobs)                                    │
│  🟢 Tech: Mike Chen (1 job)                                      │
│  ⚪ Tech: Tom Brown (available)                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Job List (below map)
| Job | Asset | Location | Technician | Status | ETA |
|-----|-------|----------|------------|--------|-----|

---

## 18.3 Screen: Dispatch & Assign
**URL**: `/field-service/dispatch`  |  **Access**: Manager+

### Unassigned Jobs
- List of tickets requiring field service
- Drag to technician on map or assign from dropdown
- Auto-suggest nearest available technician

### Technician Availability
| Technician | Status | Current Jobs | Location | Next Available |
|------------|--------|-------------|----------|----------------|
| John Smith | 🟢 Active | 2 | Sector 5 | 3:00 PM |
| Mike Chen | 🟡 Busy | 1 | Sector 12 | 4:30 PM |
| Tom Brown | ⚪ Available | 0 | Office | Now |

---

## 18.4 Screen: Mobile Work Order (Technician View)
**URL**: `/field-service/job/:id`  |  **Access**: Technician (mobile-optimized)

### Mobile Layout
```
┌─────────────────────────┐
│ Job: HVAC Repair         │
│ 📍 123 Main St, Suite 4  │
│ [📞 Call Customer]       │
│ [🗺 Navigate]            │
├─────────────────────────┤
│ Status: [In Progress ▾] │
│                          │
│ Asset: COR-NYC-HVAC-042  │
│ [📷 Scan QR]             │
├─────────────────────────┤
│ Checklist:               │
│ ☑ Inspect compressor     │
│ ☑ Check refrigerant      │
│ ☐ Test airflow           │
│ ☐ Clean filters          │
├─────────────────────────┤
│ Parts Used:              │
│ [+ Add Part]             │
│ • Belt × 1 (₹85)        │
├─────────────────────────┤
│ Notes:                   │
│ [Tap to add notes...]    │
├─────────────────────────┤
│ Photos:                  │
│ [📸 Before] [📸 After]   │
├─────────────────────────┤
│ Time: ⏱ 2h 15m           │
│ [Complete Job]           │
└─────────────────────────┘
```

---

## 18.5 Screen: Field Service Analytics
**URL**: `/field-service/analytics`  |  **Access**: Manager+

### KPIs
| KPI | Description |
|-----|-------------|
| First-Time Fix Rate | % jobs completed on first visit |
| Avg Response Time | Time from assignment to arrival |
| Avg Resolution Time | Time from arrival to completion |
| Technician Utilization | % of working hours on jobs |
| Jobs per Day | Average jobs completed per tech per day |

### Charts
- Jobs by technician (bar)
- Response time trend (line)
- Jobs by area/region (map heatmap)
- Customer satisfaction (if feedback collected)


# 19: Document Management Module

## 19.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 3 |
| **Phase** | 2 |
| **Models** | Document |
| **Key Feature** | File browser, version control, entity linking, preview |

---

## 19.2 Screen: Document Browser
**URL**: `/documents`  |  **Access**: All (scoped)

### Layout (File Manager Style)
```
┌──────────────────────────────────────────────────────────────────┐
│  📁 Documents                              [📤 Upload] [📁 New] │
├──────────────────────────────────────────────────────────────────┤
│  📁 Path: / Home / Maintenance / 2026                           │
│                                                                  │
│  🔍 Search documents...    [Type ▾] [Tags ▾] [Date ▾]          │
├──────────────────────────────────────────────────────────────────┤
│ View: [📋 List] [🗂 Grid]                                       │
│                                                                  │
│  📁 Maintenance Manuals                    12 files │ Jan 15    │
│  📁 Warranty Documents                      8 files │ Feb 1     │
│  📄 HVAC-042-Manual.pdf         2.3 MB │ PDF  │ Jan 10         │
│  📄 Invoice-PO-042.pdf          1.1 MB │ PDF  │ Feb 1          │
│  🖼 Asset-Photo-NYC-01.jpg     800 KB │ Image │ Dec 15         │
└──────────────────────────────────────────────────────────────────┘
```

### Features
- Folder hierarchy navigation
- Breadcrumb path
- Drag-drop file upload
- File preview (PDF, images, text) in lightbox
- Download individual or bulk (zip)
- Search across file names and tags
- Filter by type (PDF, Image, Document, Spreadsheet)
- Version badge on files with multiple versions

---

## 19.3 Screen: Document Detail
**URL**: `/documents/:id`  |  **Access**: All (scoped)

### Details Panel
- File name, type, size, upload date, uploader
- Tags (editable)
- Linked entity (Asset, Ticket, PO, Vendor, etc.)
- Version history with download links
- Preview (embedded PDF viewer, image viewer)

---

## 19.4 Screen: Upload Document
**URL**: Modal (not separate page)  |  **Access**: All except Viewer

### Upload Form
| Field | Type |
|-------|------|
| File(s)* | Drag-drop or browse (multiple) |
| Folder | Folder picker |
| Tags | Tag input |
| Link to Entity | Optional: Type + search |
| Access Level | Public / Private / Restricted |
| Notes | Textarea |

### Upload Behavior
- Progress bar per file
- Auto-generates thumbnail for images
- Auto-extracts text from PDFs (for search indexing)
- Version handling: upload with same name → creates new version
