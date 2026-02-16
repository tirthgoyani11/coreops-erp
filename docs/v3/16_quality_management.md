# 16: Quality Management Module

## 16.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 3 |
| **Phase** | 6 |
| **Models** | QualityInspection |
| **Key Feature** | Inspection checklists, pass/fail/conditional results, linked to POs and work orders |

---

## 16.2 Screen: Inspections List
**URL**: `/quality`  |  **Access**: Manager+, Staff

### Quick Stats
| Total Inspections | Accepted | Rejected | Conditional | Pass Rate |

### Table Columns
- Inspection ID, Reference (PO/WO), Date, Inspector, Result (color badge), Items Checked, Actions

---

## 16.3 Screen: Inspection Detail / Form
**URL**: `/quality/:id`  |  **Access**: Manager+, Staff

### Checklist Table
```
┌──────────────────────────────────────────────────────────────────┐
│ Quality Inspection: QI-2024-0015                                  │
│ Reference: PO-2024-0042 (AcmeCo)       Inspector: John Smith    │
├──────────────────────────────────────────────────────────────────┤
│ # │ Parameter       │ Standard      │ Actual         │ Result   │
│───│─────────────────│───────────────│────────────────│──────────│
│ 1 │ Dimension (mm)  │ 100 ± 0.5    │ [  100.2  ]   │ ✅ Pass  │
│ 2 │ Weight (kg)     │ 5.0 ± 0.1    │ [  5.15   ]   │ ⚠ Cond. │
│ 3 │ Surface finish  │ Smooth, no   │ [Minor scr.]  │ ⚠ Cond. │
│ 4 │ Color           │ RAL 7035     │ [Matches   ]  │ ✅ Pass  │
│ 5 │ Functionality   │ Working      │ [Working   ]  │ ✅ Pass  │
├──────────────────────────────────────────────────────────────────┤
│ Overall Result: [⚠ CONDITIONAL]                                 │
│ Notes: Minor cosmetic issue, acceptable for use.                │
│ Attachments: [📸 Photo 1] [📸 Photo 2]                          │
│                                                                  │
│ [Save Draft] [Submit Inspection]                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 16.4 Screen: Create Inspection
**URL**: `/quality/create`  |  **Access**: Manager+, Staff

### Form
| Field | Type |
|-------|------|
| Reference Type* | Dropdown: Purchase Order, Work Order, Asset |
| Reference* | Entity autocomplete |
| Template | Inspection template (pre-fills checklist) |
| Checklist Items | Dynamic: Parameter, Standard, Actual, Result |
| Photos | Upload multiple |
| Notes | Textarea |

### Inspection Templates (predefined)
- Incoming Material Inspection
- In-Process Inspection
- Final Product Inspection
- Asset Condition Check

---

## 16.5 Quality Analytics
Available via `/analytics` module:
- First Pass Yield (FPY)
- Defect rate by vendor, product, category
- Inspection trend over time
- Top defect types (Pareto chart)


# 17: Project Management Module

## 17.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 5 |
| **Phase** | 6 |
| **Models** | Project, ProjectTask |
| **Key Feature** | Kanban boards, Gantt chart, time tracking, budget tracking |

---

## 17.2 Screen: Projects List
**URL**: `/projects`  |  **Access**: Manager+, Staff

### Quick Stats
| Total Projects | Active | On Hold | Completed | Total Budget |

### Table Columns
- Project ID, Name, Manager, Status, Progress %, Budget, Spent, Start Date, End Date, Members

---

## 17.3 Screen: Project Detail
**URL**: `/projects/:id`  |  **Access**: Manager+, Staff

### Entity Header
- Name, ID, manager, status, progress bar
- Budget: ₹50,000 spent of ₹75,000 (gauge)
- Actions: [✏ Edit] [+ Add Task] [📊 Report]

### Tabs
| Tab | Content |
|-----|---------|
| **Kanban Board** | Tasks as cards in columns: TODO → In Progress → Review → Done |
| **List View** | Tasks in table format |
| **Gantt Chart** | Timeline view with dependencies |
| **Milestones** | Milestone tracker with due dates |
| **Budget** | Budget vs expenses bar chart |
| **Team** | Member list with workload |
| **Files** | Project documents |

### Kanban Board
- Drag tasks between columns
- Filter by assignee, priority
- Click card → expand task detail side panel

### Gantt Chart
```
Task          │ Jan │ Feb │ Mar │ Apr │ May │
──────────────│─────│─────│─────│─────│─────│
Planning      │████ │     │     │     │     │
Design        │  ██████   │     │     │     │
Development   │     │████████████│     │     │
Testing       │     │     │     │████ │     │
Launch        │     │     │     │   ██│     │
```
- Horizontal bars showing duration
- Dependencies as arrows
- Drag to reschedule
- Today marker (red vertical line)

---

## 17.4 Screen: Task Detail
**URL**: `/projects/:id/tasks/:taskId`  |  **Side panel or full page**

### Fields
| Field | Type |
|-------|------|
| Title | Inline-editable text |
| Description | Markdown editor |
| Status | Dropdown |
| Priority | Dropdown |
| Assignee | User autocomplete |
| Due Date | Date picker |
| Estimated Hours | Number |
| Actual Hours | Number (timer or manual) |
| Parent Task | Task autocomplete |
| Dependencies | Multi-select tasks |
| Subtasks | Checklist items |
| Comments | Threaded discussion |
| Attachments | File upload |

---

## 17.5 Screen: Create Project
**URL**: `/projects/create`  |  **Access**: Manager+

### Form
| Field | Type |
|-------|------|
| Name* | Text |
| Description | Textarea |
| Manager* | User autocomplete |
| Members | Multi-select users |
| Start Date | Date |
| End Date | Date |
| Budget | Currency |
| Tags | Tag input |

---

## 17.6 Screen: Time Tracking
**URL**: `/projects/:id/time`  |  **Access**: All members

### Timesheet
| Date | Task | Planned | Actual | Notes |
|------|------|---------|--------|-------|
| Feb 1 | Design mockup | 4h | 3.5h | Completed |
| Feb 1 | API integration | 2h | 3h | Blocked by dependency |

### Timer Widget
- [▶ Start Timer] on any task
- Running timer shows in top bar
- Auto-logs when stopped
