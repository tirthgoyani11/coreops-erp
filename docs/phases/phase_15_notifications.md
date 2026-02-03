# Phase 15: Notifications Module

## 15.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 3 (Screens 63-65) |
| **Purpose** | Real-time alerts and communication |
| **Key Feature** | Multi-channel delivery |

---

## 15.2 Screen 63: Notifications Center

**URL**: `/notifications`  
**Access**: All roles

### Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ Notifications                      [Mark All Read] [Settings ⚙️]      │
├────────────────────────────────────────────────────────────────────────┤
│ Filter: [All ▼] [Unread ▼] [Type ▼]                                   │
├────────────────────────────────────────────────────────────────────────┤
│ TODAY                                                                  │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ 🔴 NEW  Approval Required - Ticket #MT-789               10:45 AM ││
│ │         HVAC Repair request for $450 needs your approval.         ││
│ │         [Approve] [Reject] [View Details]                         ││
│ └────────────────────────────────────────────────────────────────────┘│
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ 🟡 NEW  Low Stock Alert - Oil Filter (SPR-0002)           9:30 AM ││
│ │         Stock level (3) below reorder point (10).                 ││
│ │         [Create PO] [Dismiss]                                     ││
│ └────────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────┤
│ YESTERDAY                                                              │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ ✓      Ticket Completed - #MT-786                         4:30 PM ││
│ │         John Smith completed the printer maintenance.             ││
│ └────────────────────────────────────────────────────────────────────┘│
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ ✓      Asset Transfer Approved - HVAC Unit                2:15 PM ││
│ │         Transfer to LA Office has been approved.                  ││
│ └────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────┘
```

### Notification Types
| Type | Icon | Priority | Action |
|------|------|----------|--------|
| Approval Required | 🔴 | Critical | Approve/Reject |
| Low Stock | 🟡 | High | Create PO |
| Ticket Assigned | 🔵 | Medium | View Ticket |
| Ticket Completed | ✅ | Low | View |
| Transfer Request | 📦 | Medium | Review |
| System Alert | ⚠️ | Varies | View |
| Comment Mention | 💬 | Medium | Reply |

### Real-Time Updates
- WebSocket connection for instant updates
- Badge counter in header
- Sound notification (configurable)
- Desktop push notifications (if enabled)

---

## 15.3 Screen 64: Notification Settings (User)

**URL**: `/settings/notifications`  
**Access**: All roles

### Settings Interface
```
┌────────────────────────────────────────────────────────────────────────┐
│ Notification Preferences                                               │
├────────────────────────────────────────────────────────────────────────┤
│ DELIVERY CHANNELS                                                      │
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ In-App Notifications           [✓ Enabled]                        ││
│ │ Email Notifications            [✓ Enabled]                        ││
│ │ Desktop Push                   [○ Disabled]     [Enable]          ││
│ │ SMS (if available)             [○ Disabled]                       ││
│ └────────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────┤
│ NOTIFICATION TYPES                                                     │
│                                    In-App    Email    Immediate        │
│ Approval Requests                   [✓]       [✓]       [✓]           │
│ Ticket Assigned                     [✓]       [✓]       [✓]           │
│ Ticket Updates                      [✓]       [○]       [○]           │
│ Low Stock Alerts                    [✓]       [✓]       [○]           │
│ Asset Transfers                     [✓]       [✓]       [○]           │
│ System Announcements                [✓]       [✓]       [○]           │
│ Comment Mentions                    [✓]       [✓]       [✓]           │
│ Weekly Summary                      [✓]       [✓]       [○]           │
├────────────────────────────────────────────────────────────────────────┤
│ QUIET HOURS                                                            │
│ Enable Quiet Hours: [✓]                                                │
│ From: [22:00] To: [07:00]  Timezone: [EST ▼]                          │
│ (Only critical notifications during quiet hours)                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                               [Save]   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 15.4 Screen 65: Alert Configuration (Admin)

**URL**: `/admin/alerts`  
**Access**: Super Admin, Regional Manager (region scope)

### System Alert Rules
```
┌────────────────────────────────────────────────────────────────────────┐
│ Alert Configuration                                   [+ Create Rule] │
├────────────────────────────────────────────────────────────────────────┤
│ ACTIVE RULES                                                           │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ Low Stock Alert                                      [✓ Active]   ││
│ │ Trigger: Inventory quantity < reorder_point                        ││
│ │ Recipients: Branch Manager, Purchasing Team                        ││
│ │ Channels: In-App, Email                                            ││
│ │                                             [Edit] [Disable]       ││
│ └────────────────────────────────────────────────────────────────────┘│
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ Critical Ticket SLA                                  [✓ Active]   ││
│ │ Trigger: Critical ticket open > 4 hours                           ││
│ │ Recipients: Regional Manager, Branch Manager                       ││
│ │ Channels: In-App, Email, SMS                                       ││
│ │                                             [Edit] [Disable]       ││
│ └────────────────────────────────────────────────────────────────────┘│
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ Budget Threshold                                     [✓ Active]   ││
│ │ Trigger: Expenses > 90% of budget                                  ││
│ │ Recipients: Branch Manager, Finance                                ││
│ │ Channels: In-App, Email                                            ││
│ └────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────┘
```

### Create Rule Form
| Field | Type | Options |
|-------|------|---------|
| Rule Name* | Text | Required |
| Condition Type* | Dropdown | Inventory, Ticket, Budget, Asset, Custom |
| Condition* | Builder | Field, Operator, Value |
| Severity | Dropdown | Low, Medium, High, Critical |
| Recipients* | Multi-select | Roles, Users, or Groups |
| Channels | Checkbox | In-App, Email, SMS |
| Frequency | Dropdown | Once, Daily Digest, Immediate |
| Scope | Dropdown | Global, Region, Branch |
