# Phase 16: Administration Module

## 16.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 4 (Screens 66-69) |
| **Purpose** | System configuration and management |
| **Access** | Super Admin only (mostly) |

---

## 16.2 Screen 66: System Settings

**URL**: `/admin/settings`  
**Access**: Super Admin only

### Settings Categories

#### General Settings
| Setting | Type | Description |
|---------|------|-------------|
| System Name | Text | Organization name displayed |
| Logo | File Upload | Company logo |
| Timezone | Dropdown | Default timezone |
| Date Format | Dropdown | MM/DD/YYYY, DD/MM/YYYY, etc. |
| Currency Display | Dropdown | Symbol position, decimals |
| Session Timeout | Number | Minutes of inactivity |

#### Security Settings
| Setting | Type | Description |
|---------|------|-------------|
| Password Policy | Config | Min length, complexity |
| Two-Factor Auth | Toggle | Enable 2FA requirement |
| Login Attempts | Number | Max failed attempts |
| Lockout Duration | Number | Minutes |
| Session Limit | Number | Max concurrent sessions |

#### Email Settings
| Setting | Type | Description |
|---------|------|-------------|
| SMTP Host | Text | Email server |
| SMTP Port | Number | Port (25, 465, 587) |
| Username | Text | SMTP username |
| Password | Password | SMTP password (encrypted) |
| From Email | Email | Default sender |
| From Name | Text | Sender name |
| Test Email | Button | Send test email |

#### Integration Settings
| Setting | Type | Description |
|---------|------|-------------|
| Google Maps API | Text | API key |
| Exchange Rate API | Text | API key for currencies |
| OCR Service | Dropdown | Tesseract / Cloud OCR |
| Backup Storage | Config | Local / Cloud (S3, etc.) |

---

## 16.3 Screen 67: Audit Logs

**URL**: `/admin/audit`  
**Access**: Super Admin (all), Regional/Branch Manager (scoped)

### Audit Log Viewer
```
┌────────────────────────────────────────────────────────────────────────┐
│ Audit Logs                                              [Export Logs] │
├────────────────────────────────────────────────────────────────────────┤
│ Filter: [User ▼] [Action ▼] [Resource ▼] [Date Range]                 │
├────────────────────────────────────────────────────────────────────────┤
│ Timestamp        │ User        │ Action   │ Resource      │ Details   │
│ ─────────────────┼─────────────┼──────────┼───────────────┼────────── │
│ Feb 3, 10:45 AM  │ John Smith  │ LOGIN    │ Auth          │ IP: 192...│
│ Feb 3, 10:50 AM  │ John Smith  │ APPROVE  │ Ticket MT-789 │ $450      │
│ Feb 3, 11:02 AM  │ Sarah J.    │ CREATE   │ Asset COR-001 │ HVAC Unit │
│ Feb 3, 11:15 AM  │ Mike Chen   │ UPDATE   │ Ticket MT-786 │ Status... │
│ Feb 3, 11:30 AM  │ System      │ ALERT    │ Inventory     │ Low stock │
├────────────────────────────────────────────────────────────────────────┤
│ Showing 1-50 of 12,456 logs                    ◀ Page 1 of 250 ▶     │
└────────────────────────────────────────────────────────────────────────┘
```

### Logged Actions
| Category | Actions |
|----------|---------|
| Auth | Login, Logout, Password Reset, Failed Login |
| Assets | Create, Update, Delete, Transfer |
| Maintenance | Create, Approve, Reject, Assign, Complete |
| Inventory | Stock-In, Stock-Out, Transfer, Consume |
| Financial | Transaction Create, OCR Scan, Report Export |
| Users | Create, Update, Role Change, Deactivate |
| System | Settings Change, Backup, Restore |

### Log Detail View
```json
{
  "id": "LOG-2024-00456",
  "timestamp": "2024-02-03T10:50:00Z",
  "user": {
    "id": "USR-001",
    "name": "John Smith",
    "role": "BRANCH_MANAGER"
  },
  "action": "APPROVE",
  "resource": "MAINTENANCE_TICKET",
  "resourceId": "MT-789",
  "details": {
    "estimatedCost": 450,
    "approvalLimit": 500,
    "decision": "approved"
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "location": "NYC Office"
}
```

---

## 16.4 Screen 68: Backup & Restore

**URL**: `/admin/backup`  
**Access**: Super Admin only

### Backup Management
```
┌────────────────────────────────────────────────────────────────────────┐
│ Backup & Restore                                                       │
├────────────────────────────────────────────────────────────────────────┤
│ QUICK ACTIONS                                                          │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐  │
│ │ 📥 Create Backup   │ │ 📤 Restore        │ │ ⚙️ Schedule        │  │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│ RECENT BACKUPS                                                         │
│ Date/Time           │ Type       │ Size     │ Status   │ Actions      │
│ ────────────────────┼────────────┼──────────┼──────────┼───────────── │
│ Feb 3, 2026 03:00 AM│ Scheduled  │ 2.4 GB   │ ✓ Success│ [↓] [🗑️]    │
│ Feb 2, 2026 03:00 AM│ Scheduled  │ 2.3 GB   │ ✓ Success│ [↓] [🗑️]    │
│ Feb 1, 2026 10:30 AM│ Manual     │ 2.3 GB   │ ✓ Success│ [↓] [🗑️]    │
│ Jan 31, 2026 03:00  │ Scheduled  │ 2.2 GB   │ ✓ Success│ [↓] [🗑️]    │
├────────────────────────────────────────────────────────────────────────┤
│ BACKUP SCHEDULE                                                        │
│ Frequency: [Daily ▼]  Time: [03:00 ▼]  Retention: [30 days ▼]        │
│ Storage: [Local + AWS S3 ▼]                                           │
└────────────────────────────────────────────────────────────────────────┘
```

### Backup Options
- Full database backup
- Incremental backup
- Configuration-only backup
- Files/Documents backup
- Encrypted backup (password protected)

### Restore Process
1. Select backup file
2. Pre-restore validation
3. Optional: Backup current state first
4. Confirmation (requires password)
5. Restore with progress indicator
6. Post-restore verification

---

## 16.5 Screen 69: API Documentation

**URL**: `/admin/api`  
**Access**: Super Admin, Regional Manager (read-only)

### Interactive API Docs (Swagger/OpenAPI)
```
┌────────────────────────────────────────────────────────────────────────┐
│ API Documentation                               [Download OpenAPI Spec]│
├────────────────────────────────────────────────────────────────────────┤
│ Authentication                                                    [-] │
│ ├─ POST /api/auth/login             Login and get JWT token           │
│ ├─ POST /api/auth/logout            Invalidate current session        │
│ ├─ POST /api/auth/refresh           Refresh access token              │
│ └─ POST /api/auth/forgot-password   Request password reset            │
├────────────────────────────────────────────────────────────────────────┤
│ Assets                                                            [+] │
├────────────────────────────────────────────────────────────────────────┤
│ Maintenance                                                       [+] │
├────────────────────────────────────────────────────────────────────────┤
│ Inventory                                                         [+] │
├────────────────────────────────────────────────────────────────────────┤
│ Vendors                                                           [+] │
├────────────────────────────────────────────────────────────────────────┤
│ Financial                                                         [+] │
├────────────────────────────────────────────────────────────────────────┤
│ Organizations                                                     [+] │
├────────────────────────────────────────────────────────────────────────┤
│ Users                                                             [+] │
└────────────────────────────────────────────────────────────────────────┘
```

### Features
- Try-it-out (test endpoints)
- Request/Response examples
- Authentication testing
- Rate limiting info
- Error code reference
