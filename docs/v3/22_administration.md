# 22: Administration Module

## 22.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 6 |
| **Phase** | 7 |
| **Models** | AuditLog, Workflow, CustomField, Webhook |
| **Key Feature** | System config, audit trail, custom fields, workflow builder, webhooks |

---

## 22.2 Screen: System Settings
**URL**: `/admin/settings`  |  **Access**: Admin

### Settings Sections
| Section | Settings |
|---------|----------|
| **General** | Company name, logo, timezone, fiscal year start, date format |
| **Authentication** | Password policy, session timeout, 2FA enforcement, self-registration |
| **Email** | SMTP config (host, port, user, password), email templates |
| **Notifications** | Default notification preferences, digest frequency |
| **Localization** | Default language, available languages, currency |
| **Approval Rules** | Approval limits per role, auto-approve thresholds |
| **Integrations** | API keys, webhook settings, third-party connections |
| **AI** | Gemini API key, AI features toggle, prediction frequency |
| **Backup** | Auto-backup schedule, retention period |
| **Security** | Rate limiting, CORS settings, allowed IPs |

---

## 22.3 Screen: Audit Logs
**URL**: `/admin/audit-logs`  |  **Access**: Admin

### Table
| Column | Type |
|--------|------|
| Timestamp | DateTime (sortable) |
| User | Avatar + name |
| Action | Badge (CREATE/UPDATE/DELETE/LOGIN) |
| Entity Type | Text |
| Entity ID | Link |
| Changes | Expandable (before → after) |
| IP Address | Text |

### Filters
- User, Action, Entity Type, Date Range
- Search in changes content

### Change Diff View (expanded row)
```
Field: status
  Before: "OPEN"
  After:  "IN_PROGRESS"

Field: assignedTo
  Before: null
  After:  "John Smith (john@company.com)"
```

---

## 22.4 Screen: Custom Fields Manager
**URL**: `/admin/custom-fields`  |  **Access**: Admin

### Layout
```
Select Entity: [Assets ▾] [Tickets ▾] [Vendors ▾] [Employees ▾]

┌──────────────────────────────────────────────────────────────────┐
│ Custom Fields for: Assets                    [+ Add Field]      │
├──────────────────────────────────────────────────────────────────┤
│ # │ Field Label      │ Type       │ Required │ Order │ Actions  │
│───│──────────────────│────────────│──────────│───────│──────────│
│ 1 │ Warranty Number  │ Text       │ No       │ 1     │ ✏ 🗑 ↕ │
│ 2 │ Floor Number     │ Number     │ Yes      │ 2     │ ✏ 🗑 ↕ │
│ 3 │ Asset Condition  │ Dropdown   │ No       │ 3     │ ✏ 🗑 ↕ │
│   │                  │ (Good/Fair │          │       │          │
│   │                  │  /Poor)    │          │       │          │
└──────────────────────────────────────────────────────────────────┘
```

### Add/Edit Custom Field
| Field | Type |
|-------|------|
| Label* | Text |
| Internal Name | Auto-generated (kebab-case) |
| Type* | Dropdown: Text, Number, Date, Dropdown, Checkbox, File, URL |
| Options | For Dropdown type: comma-separated |
| Required | Toggle |
| Default Value | Based on type |
| Help Text | Text (shown below field) |
| Order | Drag handle |

---

## 22.5 Screen: Workflow Builder
**URL**: `/admin/workflows`  |  **Access**: Admin

### Workflow List
| Name | Entity | Trigger | Steps | Active | Actions |
|------|--------|---------|-------|--------|---------|
| PO Approval | PurchaseOrder | On Create | 3 | ✅ | ✏ 🗑 |
| Ticket SLA | Ticket | On Status Change | 2 | ✅ | ✏ 🗑 |

### Visual Workflow Builder
```
┌──────────────────────────────────────────────────────────────────┐
│ Workflow: PO Approval Process                                    │
│ Entity: Purchase Order  │  Trigger: On Create                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌──────────────┐     ┌┤──────────────┐     │
│  │ TRIGGER:    │────→│ CONDITION:   │────→│ ACTION:       │     │
│  │ PO Created  │     │ Amount >₹500 │ Yes │ Send to Mgr   │     │
│  └─────────────┘     └──────┬───────┘     │ for Approval  │     │
│                              │ No          └───────────────┘     │
│                              │                                   │
│                        ┌─────▼─────┐                            │
│                        │ AUTO:     │                            │
│                        │ Approve & │                            │
│                        │ Notify    │                            │
│                        └───────────┘                            │
│                                                                  │
│  [+ Add Step]  [Test Workflow]  [Save]                          │
└──────────────────────────────────────────────────────────────────┘
```

### Step Types
1. **Condition**: If field = value, amount > threshold
2. **Approval**: Send to specific role/user for approval
3. **Notification**: Send email/in-app notification
4. **Field Update**: Auto-update a field value
5. **Webhook**: Call external API
6. **Wait**: Delay before next step

---

## 22.6 Screen: Webhooks Manager
**URL**: `/admin/webhooks`  |  **Access**: Admin

### Webhook List
| Name | URL | Events | Last Triggered | Status | Actions |
|------|-----|--------|----------------|--------|---------|

### Create/Edit Webhook
| Field | Type |
|-------|------|
| Name* | Text |
| URL* | URL |
| Events | Multi-select (ticket.created, asset.updated, po.approved, etc.) |
| Headers | Key-value pairs |
| Secret | Text (for HMAC verification) |
| Active | Toggle |

### Test & Logs
- [Send Test] → sends sample payload
- Delivery log: timestamp, status code, response time, payload

---

## 22.7 Screen: Backup & Restore
**URL**: `/admin/backup`  |  **Access**: Admin

### Features
- Manual trigger: [Backup Now]
- Auto-backup schedule (daily/weekly)
- Backup list: date, size, download link
- Restore from backup (with confirmation)
- Export data as CSV/JSON


# 23: Profile & Settings Module

## 23.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 3 |
| **Phase** | 2 |

---

## 23.2 Screen: User Profile
**URL**: `/profile`  |  **Access**: All (own profile)

### Layout
```
┌──────────────────────────────────────────────────────────────────┐
│  ┌──────────┐                                                    │
│  │ [Avatar] │  John Smith                                        │
│  │  Change  │  john@company.com                                  │
│  └──────────┘  Role: Manager │ NYC Headquarters                  │
│                 Member since: Jan 2024                            │
├──────────────────────────────────────────────────────────────────┤
│  [Profile] [Security] [Preferences] [Activity]                  │
├──────────────────────────────────────────────────────────────────┤
│  Profile Tab:                                                    │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │ First Name*       │  │ Last Name*         │                  │
│  │ [John        ]    │  │ [Smith       ]     │                  │
│  └────────────────────┘  └────────────────────┘                 │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │ Email (read-only) │  │ Phone              │                  │
│  │ john@company.com  │  │ [+1 555-0123 ]     │                  │
│  └────────────────────┘  └────────────────────┘                 │
│                                              [Save Changes]     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 23.3 Screen: Security Settings
**URL**: `/profile/security`  |  **Access**: All

### Sections
| Section | Features |
|---------|----------|
| **Change Password** | Current password, new password (with strength meter), confirm |
| **Two-Factor Auth** | Enable/disable, QR code setup, recovery codes |
| **Active Sessions** | List of devices/sessions with [Logout] per session |
| **Login History** | Recent logins: date, IP, device, location |

---

## 23.4 Screen: User Preferences
**URL**: `/profile/preferences`  |  **Access**: All

### Settings
| Setting | Type | Options |
|---------|------|---------|
| Theme | Toggle | Light / Dark / System |
| Language | Dropdown | English, Hindi, Spanish, French, etc. |
| Date Format | Dropdown | DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD |
| Time Format | Toggle | 12-hour / 24-hour |
| Default Dashboard | Dropdown | Standard / Custom saved |
| Notification Sound | Toggle | On / Off |
| Compact View | Toggle | Denser table rows |
| Items Per Page | Dropdown | 10, 20, 50, 100 |
