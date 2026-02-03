# Phase 13: User Management Module

## 13.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 4 (Screens 53-56) |
| **Purpose** | User administration |
| **Key Feature** | Role-based access assignment |

---

## 13.2 Screen 53: Users List

**URL**: `/users`  
**Access**: Super Admin, Regional Manager (region), Branch Manager (branch)

### Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ User Management                                          [+ Add User] │
├────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search users...  │ Role ▼ │ Location ▼ │ Status ▼                  │
├────────────────────────────────────────────────────────────────────────┤
│ User             │ Email              │ Role           │ Location │ ⋮ │
│ ─────────────────┼────────────────────┼────────────────┼──────────┼── │
│ 👤 John Smith    │ john@corp.com      │ Super Admin    │ Global   │ ⋮ │
│ 👤 Sarah Johnson │ sarah@corp.com     │ Regional Mgr   │ Americas │ ⋮ │
│ 👤 Mike Chen     │ mike@corp.com      │ Technician     │ NYC      │ ⋮ │
│ 👤 Emma Wilson   │ emma@corp.com      │ Viewer         │ London   │ ⋮ │
├────────────────────────────────────────────────────────────────────────┤
│ Total Users: 156 │ Active: 142 │ Inactive: 14                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Role Filter
Each role displays with color badge:
- 🔴 Super Admin (red)
- 🟠 Regional Manager (orange)
- 🟡 Branch Manager (yellow)
- 🟢 Technician (green)
- 🔵 Viewer (blue)

---

## 13.3 Screen 54: User Detail

**URL**: `/users/:id`  
**Access**: Admins managing the user

### Profile Header
```
┌────────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                          │
│ │  Avatar  │  John Smith                         🟢 Active            │
│ │          │  Regional Manager - Americas                             │
│ └──────────┘  john.smith@corpops.com                                  │
│                                                                        │
│ [Edit Profile] [Reset Password] [Permissions] [Deactivate]           │
└────────────────────────────────────────────────────────────────────────┘
```

### Tabs

#### Profile Tab
| Field | Value |
|-------|-------|
| Full Name | John Smith |
| Email | john.smith@corpops.com |
| Phone | +1 (555) 123-4567 |
| Role | Regional Manager |
| Location Scope | Americas (NYC, LA, Chicago) |
| Department | Operations |
| Reports To | Mary Director |
| Hire Date | Jan 15, 2024 |
| Last Login | Feb 3, 2026 10:45 AM |

#### Permissions Tab
- Role-based permissions displayed
- Custom overrides if any
- Scope limitations

#### Activity Tab
| Date/Time | Action | Details |
|-----------|--------|---------|
| Feb 3, 10:45 AM | Login | IP: 192.168.1.100 |
| Feb 3, 10:50 AM | Approved Ticket | #MT-789 ($450) |
| Feb 2, 04:30 PM | Created Asset | GUAI: COR-USA-NYC-001 |

#### Assigned Items Tab
- Assets assigned to user
- Open tickets assigned
- Pending approvals

---

## 13.4 Screen 55: Create User

**URL**: `/users/create`  
**Access**: Admins (role hierarchy enforced)

### Form
| Field | Type | Validation |
|-------|------|------------|
| First Name* | Text | Required |
| Last Name* | Text | Required |
| Email* | Email | Required, unique |
| Phone | Tel | Optional |
| Role* | Dropdown | Based on creator's role |
| Location Scope* | Dropdown/Multi | Based on role |
| Department | Dropdown | Optional |
| Reports To | User search | Optional |
| Send Invitation | Toggle | Default: Yes |
| Welcome Message | Textarea | Optional |

### Role Creation Rules
| Creating User | Can Create |
|---------------|------------|
| Super Admin | All roles |
| Regional Manager | Branch Manager, Technician, Viewer |
| Branch Manager | Technician, Viewer |
| Technician | None |
| Viewer | None |

---

## 13.5 Screen 56: Edit User

**URL**: `/users/:id/edit`  
**Access**: Admins managing the user

### Editable Fields
- All profile fields
- Role change (with confirmation)
- Location scope change
- Status (Active/Inactive)

### Special Actions
- **Reset Password**: Send reset email
- **Revoke Sessions**: Force logout all devices
- **Transfer Assignments**: Before deactivation
