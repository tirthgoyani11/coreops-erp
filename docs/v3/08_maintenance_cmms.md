# 08: Maintenance CMMS Module

## 8.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 8 |
| **Phase** | 2-3 |
| **Models** | Maintenance, Comment |
| **Key Feature** | 4-view (Table/Card/Calendar/Kanban), Approval workflow, SLA tracking |
| **Existing** | Ticket List built |

---

## 8.2 Screen: Tickets List
**URL**: `/maintenance`  |  **Access**: All (scoped)

### Quick Stats Row
| Stat | Color | Source |
|------|-------|--------|
| Total Tickets | Neutral | Count all |
| Open | Blue | status=OPEN |
| In Progress | Yellow | status=IN_PROGRESS |
| Overdue | Red | dueDate < now & status ≠CLOSED |
| Completed This Month | Green | status=COMPLETED & month |

### Filters
| Filter | Type |
|--------|------|
| Search | Text (ID, Title, Asset GUAI) |
| Status | Multi-select |
| Priority | Multi-select (Low, Medium, High, Critical) |
| Type | Multi-select (Corrective, Preventive, Predictive, Emergency) |
| Assigned To | User autocomplete |
| Created By | User autocomplete |
| Asset | Asset autocomplete |
| Due Date | Date range |
| Organization | Tree-select |

### 4-View Toggle
1. **Table**: Standard sortable/filterable table
2. **Card**: Grid cards showing priority color, title, asset, due date
3. **Calendar** (FullCalendar): Tickets on due dates, drag to reschedule
4. **Kanban** (@dnd-kit): Columns = Status (Open → Approved → In Progress → Completed → Closed). Drag cards between columns to change status.

### Kanban Layout
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  OPEN    │ │ APPROVED │ │IN PROGRESS│ │COMPLETED │ │  CLOSED  │
│  (12)    │ │   (5)    │ │   (8)    │ │   (15)   │ │  (41)    │
├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤
│┌────────┐│ │┌────────┐│ │┌────────┐│ │┌────────┐│ │          │
││🔴 MT-89││ ││🟡 MT-91││ ││🟢 MT-93││ ││  MT-87 ││ │          │
││HVAC Fail││ ││Elevator ││ ││Fire Alm││ ││Plumbing││ │          │
││NYC F2   ││ ││NYC L1  ││ ││NYC F5  ││ ││NYC F1  ││ │          │
││Due Today││ ││Due Tmrw ││ ││Due Fri ││ ││Jan 28  ││ │          │
│└────────┘│ │└────────┘│ │└────────┘│ │└────────┘│ │          │
│┌────────┐│ │          │ │          │ │          │ │          │
││🟡 MT-90││ │          │ │          │ │          │ │          │
││Server   ││ │          │ │          │ │          │ │          │
│└────────┘│ │          │ │          │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## 8.3 Screen: Ticket Detail
**URL**: `/maintenance/:id`  |  **Access**: All (actions restricted by role)

### Entity Header
```
┌──────────────────────────────────────────────────────────────────┐
│ ← Maintenance                                                    │
├──────────────────────────────────────────────────────────────────┤
│ Ticket MT-2024-0089               [🔴 CRITICAL]  [Status: OPEN]│
│ HVAC Compressor Failure — Building A, Floor 2                    │
│ ────────────────────────────────────────────────────────         │
│ Asset: COR-NYC-HVAC-042 │ Created: Feb 1 │ Due: Feb 3          │
│ Created by: Jane Smith  │ Assigned: John Smith                  │
│ Est. Cost: ₹450         │ SLA: ⏱ 4h remaining                  │
│                                                                  │
│ [✅ Approve] [👤 Assign] [▶ Start] [⏹ Complete] [⋯ More]       │
└──────────────────────────────────────────────────────────────────┘
```

### Tabs
| Tab | Content |
|-----|---------|
| **Timeline** | Chronological activity feed (status changes, comments, parts, photos) |
| **Details** | Full description, type, priority, category, custom fields |
| **Parts Used** | Table: Part, Qty, Unit Cost, Total — with [+ Add Part] |
| **Before/After** | Photo comparison (before work / after work) |
| **Checklist** | Task checklist with checkboxes |
| **Linked Entities** | Related POs, invoices, other tickets |

### Timeline Tab
```
┌──────────────────────────────────────────────────────────────────┐
│ ● Feb 1, 10:30 AM — Jane Smith created ticket                   │
│   "Compressor making loud noise and not cooling properly"        │
│                                                                  │
│ ● Feb 1, 11:00 AM — Manager approved                            │
│   Approved by: Mike Johnson                                      │
│                                                                  │
│ ● Feb 1, 11:15 AM — Assigned to John Smith                      │
│                                                                  │
│ ● Feb 1, 2:00 PM — John Smith started work                      │
│   📸 [Before photo attached]                                     │
│                                                                  │
│ ● Feb 1, 4:30 PM — Parts consumed                               │
│   Compressor Belt × 1 (₹85)  │  Refrigerant R-410A × 2 (₹120)   │
│                                                                  │
│ ● Feb 1, 5:00 PM — Comment by John Smith                        │
│   "Replaced compressor belt and recharged refrigerant.            │
│    System running normally now."                                  │
│   📸 [After photo attached]                                      │
└──────────────────────────────────────────────────────────────────┘
```

### Add Comment
```
┌──────────────────────────────────────────────────────────────────┐
│ 💬 Add Comment                                                    │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Type your comment... @mention a user                        │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ [📎 Attach] [📸 Photo]                     [Post Comment]       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8.4 Screen: Create Ticket
**URL**: `/maintenance/create`  |  **Access**: All (except Viewer)

### Form Fields
| Field | Type | Validation |
|-------|------|------------|
| Title* | Text | Required, max 200 |
| Description* | Rich text (Markdown) | Required |
| Asset* | Asset autocomplete (search GUAI/name) | Required |
| Type* | Dropdown | Corrective, Preventive, Predictive, Emergency |
| Priority* | Dropdown | Low, Medium, High, Critical |
| Due Date | Date picker | Optional, defaults to SLA |
| Estimated Cost | Currency input | Optional |
| Estimated Hours | Number | Optional |
| Assign To | User autocomplete (Technicians filtered) | Optional (Manager assigns) |
| Checklist | Dynamic list | Optional, add multiple items |
| Attachments | File upload | Multiple, max 10MB each |

### SLA Auto-Calculation
| Priority | Response Time | Resolution Time |
|----------|---------------|-----------------|
| Critical | 1 hour | 4 hours |
| High | 4 hours | 24 hours |
| Medium | 8 hours | 72 hours |
| Low | 24 hours | 7 days |

---

## 8.5 Screen: Approval Queue
**URL**: `/maintenance/approvals`  |  **Access**: Manager+

### Layout
```
┌──────────────────────────────────────────────────────────────────┐
│  Pending Approvals (8)                            [Approve All]  │
├──────────────────────────────────────────────────────────────────┤
│ │Ticket ID │ Title          │ Asset    │ Cost   │ By      │Action│
│ │MT-089    │ HVAC Compressor│ NYC-042  │ ₹450   │ Jane S. │✅ ❌│
│ │MT-091    │ Elevator Insp. │ NYC-L1   │ ₹200   │ Mike C. │✅ ❌│
│ │MT-092    │ Fire System    │ SF-003   │ ₹1,200 │ Tom B.  │✅ ❌│
└──────────────────────────────────────────────────────────────────┘
```

- **Quick approve**: ✅ button → instant approve with undo toast
- **Reject**: ❌ button → modal with rejection reason
- **Bulk approve**: Select multiple → [Approve Selected]
- Auto-approve for tickets under role's approval limit

---

## 8.6 Screen: Maintenance Calendar
**URL**: `/maintenance/calendar`  |  **Access**: All

### Calendar Features (FullCalendar)
- **Views**: Month, Week, Day, Agenda
- **Events**: Tickets plotted by due date
- **Color coding**: Red (overdue), Yellow (due today), Green (upcoming)
- **Drag-and-drop**: Reschedule tickets by dragging
- **Click event**: Opens ticket detail in side panel
- **Recurring events**: Preventive maintenance schedules shown repeating
- **Today indicator**: Bold red line on current time

---

## 8.7 Screen: Repair/Replace Calculator
**URL**: `/maintenance/:id/calculator`  |  **Access**: Manager+

### Input
| Field | Value |
|-------|-------|
| Repair Cost Estimate | ₹450 |
| Asset Current Value | ₹8,200 |
| Asset Age | 3.5 years |
| Total Maintenance Spent | ₹2,100 |
| Remaining Useful Life | 4.5 years |
| Replacement Cost | ₹12,000 |

### Output
```
┌──────────────────────────────────────────────────────────────────┐
│  📊 Repair vs Replace Analysis                                    │
│                                                                  │
│  Total Cost of Ownership (if repair): ₹10,750                    │
│  Total Cost of Ownership (if replace): ₹12,000                   │
│                                                                  │
│  ✅ RECOMMENDATION: REPAIR                                       │
│  Repairing saves ₹1,250 and extends asset life by ~4.5 years     │
│                                                                  │
│  [Bar chart comparing repair vs replace costs]                   │
│                                                                  │
│  💡 CoreAI: "Based on similar HVAC units, this asset typically   │
│  needs 2 more repairs in the next 4.5 years, estimated ₹800."    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8.8 Screen: Maintenance Analytics
**URL**: `/maintenance/analytics`  |  **Access**: Manager+

### KPIs
| KPI | Calculation |
|-----|-------------|
| MTBF (Mean Time Between Failures) | Total uptime / Number of failures |
| MTTR (Mean Time To Repair) | Total repair time / Number of repairs |
| First-Time Fix Rate | Tickets fixed on first attempt / Total tickets |
| SLA Compliance Rate | Tickets resolved within SLA / Total tickets |
| Avg Cost Per Ticket | Total maintenance cost / Number of tickets |
| Backlog | Open + In-Progress tickets count |

### Charts
1. **Tickets by Month** (Bar chart): Monthly ticket volume
2. **Cost Trend** (Line chart): Monthly maintenance spending
3. **By Category** (Donut): HVAC 35%, Electrical 25%, Plumbing 20%, etc.
4. **By Technician** (Horizontal bar): Tickets completed per technician
5. **SLA Performance** (Gauge): Current SLA compliance %

---

## 8.9 Screen: Preventive Maintenance Scheduler
**URL**: `/maintenance/scheduler`  |  **Access**: Manager+

### Schedule List
| Asset | Frequency | Last Done | Next Due | Status |
|-------|-----------|-----------|----------|--------|
| HVAC-042 | Monthly | Jan 15 | Feb 15 | 🟡 Due |
| Elevator-01 | Quarterly | Dec 1 | Mar 1 | 🟢 OK |
| Fire System | Yearly | Jun 1 | Jun 1 | 🟢 OK |

### Create Schedule
| Field | Type |
|-------|------|
| Asset* | Select |
| Frequency* | Daily/Weekly/Monthly/Quarterly/Yearly |
| Checklist | Dynamic items |
| Auto-assign to | User select |
| Auto-create ticket | Toggle (days before due) |
| Notification | Toggle (remind X days before) |
