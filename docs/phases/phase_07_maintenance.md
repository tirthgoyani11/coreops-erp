# Phase 07: Maintenance Management Module

## 7.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 7 (Screens 19-25) |
| **Purpose** | Ticket lifecycle management |
| **Key Feature** | Approval workflows, Technician assignment |

---

## 7.2 Screen 19: Tickets List View

**URL**: `/maintenance`  
**Access**: All roles (scoped by permissions)

### View Modes

#### List View (Default)
```
┌────────────────────────────────────────────────────────────────────────┐
│ Maintenance Management                                  [+ New Ticket] │
├────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search tickets...  │ Status ▼ │ Priority ▼ │ Technician ▼ │ Date ▼ │
├────────────────────────────────────────────────────────────────────────┤
│ View: [📋 List] [📊 Kanban] [📅 Calendar]                              │
├────────────────────────────────────────────────────────────────────────┤
│ ID      │ Asset        │ Issue       │ Priority │ Status │ Assigned │  │
│ ────────┼──────────────┼─────────────┼──────────┼────────┼──────────┼  │
│ MT-0789 │ HVAC Unit    │ Compressor  │ 🔴 Crit  │ Open   │ John S.  │⋮ │
│ MT-0788 │ Server Rack  │ Fan noise   │ 🟡 High  │ In Prog│ Mike C.  │⋮ │
│ MT-0787 │ Forklift     │ Oil change  │ 🟢 Low   │ Done   │ -        │⋮ │
└────────────────────────────────────────────────────────────────────────┘
```

#### Kanban View
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    OPEN     │ │ IN PROGRESS │ │  COMPLETED  │ │   CLOSED    │
│     (5)     │ │     (3)     │ │     (12)    │ │     (45)    │
├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤
│ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │             │
│ │ MT-789  │ │ │ │ MT-786  │ │ │ │ MT-780  │ │ │             │
│ │ 🔴 HVAC │ │ │ │ 🟡 Print│ │ │ │ ✓ Done  │ │ │             │
│ │ John S. │ │ │ │ Mike C. │ │ │ │ $450    │ │ │             │
│ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │             │
│ ┌─────────┐ │ │             │ │             │ │             │
│ │ MT-788  │ │ │             │ │             │ │             │
│ └─────────┘ │ │             │ │             │ │             │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```
- Drag-and-drop to change status
- Color-coded by priority
- Click to expand details

#### Calendar View
- Month/Week/Day views
- Tickets by due date
- Click date to create ticket
- Color by priority

---

## 7.3 Screen 20: Ticket Detail View

**URL**: `/maintenance/:id`  
**Access**: All roles

### Header
```
┌────────────────────────────────────────────────────────────────────────┐
│ Ticket #MT-0789                     🔴 CRITICAL         Status: Open ▼│
│ ─────────────────────────────────────────────────────────────────────  │
│ Asset: HVAC Unit (COR-USA-NYC-HVAC-0042)                               │
│ Created: Feb 1, 2026 by Sarah Johnson                                  │
│                                                                        │
│ [Edit] [Assign] [Approve] [Close] [Delete]                            │
└────────────────────────────────────────────────────────────────────────┘
```

### Tabs

#### Details Tab
| Section | Content |
|---------|---------|
| Issue Info | Title, Description, Type, Severity |
| Assignment | Technician, Due Date, Priority |
| Financial | Estimated Cost, Approval Status |
| Asset Context | Link to asset, Last maintenance |

#### Timeline Tab
```
● Feb 3, 10:42 AM - Ticket created by Sarah Johnson
● Feb 3, 10:45 AM - Assigned to Mike Chen
● Feb 3, 11:00 AM - Status → In Progress (Timer started)
● Feb 3, 12:30 PM - Part consumed: Compressor Belt ($45)
● Feb 3, 02:15 PM - Photos uploaded (2 files)
● Feb 3, 02:30 PM - ⏱️ Work completed (3h 30m)
```

#### Parts & Costs Tab
| Part Name | SKU | Qty | Unit Price | Total |
|-----------|-----|-----|------------|-------|
| Compressor Belt | SP-0234 | 1 | $45.00 | $45.00 |
| Refrigerant | SP-0189 | 2 | $35.00 | $70.00 |
| **Labor** | - | 3.5h | $50/hr | $175.00 |
| **Total** | | | | **$290.00** |

#### Documents Tab
- Before photos
- After photos
- Invoices/Receipts
- Technical documents

#### Approvals Tab (if applicable)
```
Approval Workflow:
┌─────────────────────────────────────────────────────────────────┐
│ ✓ Branch Manager (John D.)    Approved on Feb 3, 11:00 AM      │
│ ⏳ Regional Manager            Pending (Est. Cost > $500)       │
│ ○ Finance                      Not required                     │
└─────────────────────────────────────────────────────────────────┘
```

#### Comments Tab
- Discussion thread
- @mention support
- File attachments

### Status Flow
```
Open → Assigned → In Progress → Pending Parts → Completed → Approved → Closed
         ↓                                          ↓
      Rejected ←─────────────────────────────── Rejected
```

---

## 7.4 Screen 21: Create Ticket Form

**URL**: `/maintenance/create`  
**Access**: All except Viewer

### Form Fields

#### Asset Selection
- Search by GUAI/Name
- QR Code scan button
- Selected asset preview card

#### Issue Information
| Field | Type | Validation |
|-------|------|------------|
| Title* | Text | Required, max 100 |
| Description* | Textarea | Required, max 500 |
| Issue Type* | Dropdown | Breakdown, Preventive, Inspection, etc. |
| Priority* | Radio | Critical, High, Medium, Low |
| Symptoms | Checkbox | Not working, Noise, Leak, etc. |

#### Assignment (Optional)
| Field | Type |
|-------|------|
| Assign To | Technician search |
| Due Date | Date picker |
| Estimated Duration | Hours input |

#### Financial (Optional)
| Field | Type |
|-------|------|
| Est. Labor Cost | Currency |
| Est. Parts Cost | Currency |
| Total (auto) | Display |

#### Attachments
- Photo upload (before images)
- Document upload

---

## 7.5 Screen 22: Approval Queue

**URL**: `/maintenance/approvals`  
**Access**: Super Admin, Regional Manager, Branch Manager

### Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ Pending Approvals (8)                                                  │
│ Filter: [Within My Limit ▼] [Branch ▼] [Date ▼]                       │
├────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ #MT-789 │ HVAC Repair │ NYC Office │ Est: $450                   │  │
│ │ Asset: Industrial HVAC Unit                                       │  │
│ │ Requested by: Sarah Johnson │ Feb 3, 2026                        │  │
│ │ ✓ Within your $500 limit                                         │  │
│ │                                              [Approve] [Reject]  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ #MT-790 │ Server Cooling │ LAX Office │ Est: $2,500              │  │
│ │ ⚠️ Requires Regional Manager approval                            │  │
│ │                                              [Escalate] [Reject] │  │
│ └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Approval Actions
- **Approve**: Sets status to Approved, notifies technician
- **Reject**: Requires reason, notifies requester
- **Escalate**: Sends to higher authority

---

## 7.6 Screen 23: Assignment Screen

**URL**: `/maintenance/:id/assign`  
**Access**: Super Admin, Regional Manager, Branch Manager

### Technician Selection
```
┌────────────────────────────────────────────────────────────────────────┐
│ Assign Technician for Ticket #MT-789                                   │
├────────────────────────────────────────────────────────────────────────┤
│ Available Technicians:                                                 │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ 👤 John Smith          │ 🟢 Available │ 2 active tickets         │  │
│ │    Specialization: HVAC, Electrical                               │  │
│ │    Avg Resolution: 2.5 hours │ Rating: ⭐⭐⭐⭐½                    │  │
│ │                                                        [Select]  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ 👤 Mike Chen           │ 🟡 Busy │ 4 active tickets               │  │
│ │    Specialization: Electronics, Plumbing                          │  │
│ │                                                        [Select]  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│ Assignment Details:                                                    │
│ Due Date: [Feb 5, 2026 ▼]  Priority: [High ▼]                         │
│ Notes: [                                                    ]         │
│                                                          [Confirm]    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7.7 Screen 24: Repair vs Replace Calculator

**URL**: `/maintenance/calculator`  
**Access**: Super Admin, Regional Manager, Branch Manager

### Calculator Interface
```
┌────────────────────────────────────────────────────────────────────────┐
│ Repair vs Replace Analysis                                             │
├────────────────────────────────────────────────────────────────────────┤
│ Asset: [Search or select...                                         ▼]│
├─────────────────────────────────┬──────────────────────────────────────┤
│ REPAIR OPTION                   │ REPLACE OPTION                       │
├─────────────────────────────────┼──────────────────────────────────────┤
│ Est. Repair Cost: [$450       ] │ New Asset Cost: [$15,000           ] │
│ Extended Life: [2 years       ] │ Expected Life: [10 years           ] │
│ Success Rate: [85% ▼          ] │ Warranty: [5 years                 ] │
│ Downtime: [2 days             ] │ Installation: [$500                ] │
├─────────────────────────────────┴──────────────────────────────────────┤
│                         RECOMMENDATION                                 │
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │                      ✓ REPAIR                                      ││
│ │                                                                    ││
│ │  Confidence: 78%                                                   ││
│ │                                                                    ││
│ │  • Repair cost is 3% of asset value                                ││
│ │  • Asset is mid-lifecycle (5 of 10 years)                          ││
│ │  • Low maintenance frequency (2 repairs/year)                      ││
│ │  • Vendor parts availability: Good                                 ││
│ └────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────┘
```

### Algorithm Factors
- Asset current value vs repair cost
- Asset age vs useful life
- Historical maintenance frequency
- Vendor part availability (MTBF)
- Downtime cost estimation
- Warranty considerations

---

## 7.8 Screen 25: Maintenance Analytics

**URL**: `/maintenance/analytics`  
**Access**: All except Technician

### Widgets & Charts
| Widget | Type | Description |
|--------|------|-------------|
| Total Tickets | Counter | Month/Quarter/Year |
| Avg Resolution Time | Counter | In hours |
| Total Cost | Currency | With trend |
| Pending Approvals | Counter | Alert if high |
| Ticket Volume | Line Chart | Daily/Weekly trend |
| Cost by Category | Pie Chart | Breakdown |
| Technician Performance | Bar Chart | Tickets & time |
| MTBF by Asset | Table | Mean time between failures |
