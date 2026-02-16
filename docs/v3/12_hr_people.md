# 12: HR & People Module

## 12.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 6 |
| **Phase** | 5 |
| **Models** | Employee, Leave, Attendance |
| **Key Feature** | Org chart, leave management, attendance tracking, employee lifecycle |

---

## 12.2 Screen: Employee Directory
**URL**: `/hr/employees`  |  **Access**: Manager+ (limited for staff)

### Quick Stats
| Total Employees | Active | On Leave | New This Month | Departments |

### View Modes
1. **Table**: Standard sortable list
2. **Card**: Photo grid with name, department, designation
3. **Org Chart**: Interactive hierarchical tree

### Table Columns
- Employee ID, Photo, Name, Email, Department, Designation, Manager, Status, Join Date

---

## 12.3 Screen: Employee Detail
**URL**: `/hr/employees/:id`  |  **Access**: Manager+, Self

### Entity Header
- Photo, name, employee ID, designation, department
- Status badge, contact info
- Actions: [✏ Edit] [📧 Email] [📄 Documents]

### Tabs
| Tab | Content |
|-----|---------|
| **Profile** | Personal info, emergency contact, address |
| **Employment** | Department, designation, manager, join date, skills, certifications |
| **Compensation** | Salary breakdown, bank details (masked) |
| **Attendance** | Monthly calendar heatmap, check-in/out times |
| **Leave Balance** | Leave types with balances, history |
| **Documents** | ID proofs, certificates, offer letter |
| **Timeline** | Employment history, promotions, transfers |

---

## 12.4 Screen: Leave Management
**URL**: `/hr/leaves`  |  **Access**: All (own), Manager+ (team)

### My Leave Balance
```
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Casual │ │  Sick  │ │ Earned │ │ Comp   │
│  8/12  │ │  5/7   │ │  15/15 │ │  2/2   │
│ [████] │ │ [███░] │ │ [████] │ │ [████] │
└────────┘ └────────┘ └────────┘ └────────┘
```

### Apply Leave Form
| Field | Type |
|-------|------|
| Leave Type* | Dropdown |
| Start Date* | Date picker |
| End Date* | Date picker |
| Total Days | Auto-calculated |
| Reason | Textarea |
| Attachment | File (medical certificate for sick leave) |

### Manager View: Leave Calendar
- Team calendar showing who's on leave
- Color-coded by leave type
- Pending requests highlighted for approval
- [Approve] [Reject] inline buttons

---

## 12.5 Screen: Attendance
**URL**: `/hr/attendance`  |  **Access**: All (own), Manager+ (team)

### My Attendance
| Date | Check-In | Check-Out | Hours | Status |
|------|----------|-----------|-------|--------|
| Feb 1 | 9:02 AM | 6:15 PM | 9h 13m | ✅ Present |
| Feb 2 | 9:45 AM | 6:00 PM | 8h 15m | ⏰ Late |
| Feb 3 | - | - | - | ❌ Absent |

### Monthly Heatmap Calendar
- Green = Present, Yellow = Late, Red = Absent, Blue = Leave, Grey = Holiday
- Click day → view details

### Check-In/Out
- [Check In] button (records timestamp + optional GPS)
- [Check Out] button
- Mobile: geolocation captured

---

## 12.6 Screen: Org Chart
**URL**: `/hr/org-chart`  |  **Access**: All

### Interactive Tree
```
                    ┌──────────────┐
                    │  CEO         │
                    │  John Smith  │
                    └──────┬───────┘
              ┌────────────┼────────────┐
        ┌─────▼─────┐ ┌───▼──────┐ ┌───▼──────┐
        │ VP Ops    │ │ VP Sales │ │ VP Tech  │
        │ Jane D.  │ │ Mike C.  │ │ Tom B.   │
        └─────┬─────┘ └──────────┘ └─────┬────┘
         ┌────┼────┐                 ┌────┼────┐
      ┌──▼──┐ ┌──▼──┐           ┌──▼──┐ ┌──▼──┐
      │Mgr A│ │Mgr B│           │Dev 1│ │Dev 2│
      └─────┘ └─────┘           └─────┘ └─────┘
```
- Click node → show employee detail sidebar
- Expand/collapse branches
- Search employee → highlight in tree
- Zoom in/out, pan

---

## 12.7 Screen: Employee Onboarding Wizard
**URL**: `/hr/employees/create`  |  **Access**: Admin, Manager

### Steps
```
[1. Personal Info] → [2. Employment] → [3. Compensation] → [4. Documents] → [5. System Access] → [6. Review]
```
- Step 5: Create user account, assign role, send welcome email
- Step 6: Summary + [Create Employee] button

---

## 12.8 Employee Onboarding Workflow
```
┌────────────┐     ┌────────────┐     ┌────────────┐
│ Create     │────→│ Upload     │────→│ Set Up     │
│ Profile    │     │ Documents  │     │ System     │
└────────────┘     └────────────┘     │ Access     │
                                       └────┬───────┘
                                            │
                   ┌────────────────────────────┐
                   │   Send Welcome Email       │
                   │   + Onboarding Checklist    │
                   └─────────────┬──────────────┘
                                 │
                   ┌─────────────▼──────────────┐
                   │   Employee Active ✅         │
                   └────────────────────────────┘
```
