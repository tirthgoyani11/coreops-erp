# Phase 02: User Roles & Permissions

## 2.1 Role Hierarchy

```
                    ┌───────────────────┐
                    │   SUPER ADMIN     │  Level 1
                    │   (Unlimited)     │  Global Access
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │  REGIONAL MANAGER │  Level 2
                    │  ($5,000 Limit)   │  Multi-Branch
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │   BRANCH MANAGER  │  Level 3
                    │   ($500 Limit)    │  Single Branch
                    └─────────┬─────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
     ┌────────┴────────┐             ┌────────┴────────┐
     │   TECHNICIAN    │  Level 4    │     VIEWER      │  Level 5
     │  (Tasks Only)   │             │  (Read-Only)    │
     └─────────────────┘             └─────────────────┘
```

---

## 2.2 Role 1: SUPER ADMIN

### Overview
| Attribute | Value |
|-----------|-------|
| **Role Code** | `SUPER_ADMIN` |
| **Hierarchy Level** | 1 (Highest) |
| **Access Scope** | Global - All organizations, all branches |
| **Approval Authority** | Unlimited |
| **Financial Visibility** | All transactions, all currencies |
| **User Management** | Full CRUD for all users |

### Permissions

#### Full Access (CRUD)
- System Settings
- All Organizations/Branches
- All Users (any role)
- All Assets (global)
- All Maintenance Tickets
- All Inventory
- All Vendors
- All Financial Data
- Audit Logs
- Backup/Restore

#### Exclusive Capabilities
- Create/delete organizations
- Assign any role to users
- Configure system settings
- Manage exchange rates
- Run database backups
- Access API documentation
- Configure global alerts
- View complete audit trail

### Dashboard Widgets
1. Global Asset Value (all locations)
2. System Health (uptime, DB status)
3. All Pending Approvals
4. User Activity Heatmap
5. Multi-Region Comparison
6. Currency Performance
7. Recent Audit Events
8. Top Vendors by MTBF
9. Critical Alerts
10. Quick Actions Panel

### Navigation Menu
```
📊 Dashboard (Admin)
📦 Assets (All)
🔧 Maintenance (All)
📊 Inventory (All)
🏢 Vendors (All)
💰 Financial (All)
🏛️ Organizations (Create/Manage)
👥 Users (All Roles)
📈 Analytics (Full)
⚙️ System Settings
   ├─ General Config
   ├─ Audit Logs
   ├─ Backup/Restore
   └─ API Docs
```

---

## 2.3 Role 2: REGIONAL MANAGER

### Overview
| Attribute | Value |
|-----------|-------|
| **Role Code** | `REGIONAL_MANAGER` |
| **Hierarchy Level** | 2 |
| **Access Scope** | Regional - Multiple assigned branches |
| **Approval Authority** | Up to $5,000 USD |
| **Financial Visibility** | Regional consolidated view |
| **User Management** | Create users within region |

### Permissions

#### Full Access (within Region)
- Regional Assets
- Regional Maintenance Tickets
- Regional Inventory
- All Vendors
- Regional Financial Data
- Regional Users (Branch Mgr + below)

#### Limited Access
- Cannot create organizations
- Cannot access other regions
- Cannot modify system settings
- Cannot view global audit logs

#### Approval Authority
- Approve maintenance up to $5,000
- Escalate higher amounts to Super Admin
- Approve inter-branch transfers
- Approve new vendor requests

### Dashboard Widgets
1. Regional Asset Count
2. Branch Comparison Chart
3. Pending Approvals (< $5K)
4. Regional Budget Status
5. Critical Tickets Alert
6. Cross-Branch Transfers
7. Vendor Performance
8. Regional Expenses Trend

### Navigation Menu
```
📊 Dashboard (Regional)
📦 Assets (Regional)
🔧 Maintenance (Regional)
   └─ Approvals Queue
📊 Inventory (Regional)
🏢 Vendors
💰 Financial (Regional)
🏛️ Branches (View/Compare)
👥 Users (Regional)
📈 Analytics (Regional)
```

---

## 2.4 Role 3: BRANCH MANAGER

### Overview
| Attribute | Value |
|-----------|-------|
| **Role Code** | `BRANCH_MANAGER` |
| **Hierarchy Level** | 3 |
| **Access Scope** | Branch - Single location only |
| **Approval Authority** | Up to $500 USD |
| **Financial Visibility** | Branch transactions only |
| **User Management** | Create technicians for branch |

### Permissions

#### Full Access (within Branch)
- Branch Assets
- Branch Maintenance Tickets
- Branch Inventory
- Branch Financial Data

#### Limited Access
- View-only for global vendors
- Cannot create organizations
- Cannot access other branches
- Request-based asset transfers

#### Approval Authority
- Approve maintenance up to $500
- Escalate higher amounts to Regional Mgr
- Request asset transfers
- Request new vendors

### Dashboard Widgets
1. Branch Asset Health (Operational vs Maintenance)
2. Today's Tickets
3. Approval Queue (< $500)
4. Inventory Status
5. MTD Expenses vs Budget
6. Technician Workload

### Navigation Menu
```
📊 Dashboard (Branch)
📦 Assets (Branch)
🔧 Maintenance (Branch)
   ├─ Approvals Queue
   └─ Assign Technicians
📊 Inventory (Branch)
🏢 Vendors (View)
💰 Financial (Branch)
👥 Users (Branch Technicians)
📈 Analytics (Branch)
```

---

## 2.5 Role 4: TECHNICIAN

### Overview
| Attribute | Value |
|-----------|-------|
| **Role Code** | `TECHNICIAN` |
| **Hierarchy Level** | 4 |
| **Access Scope** | Assigned tasks and related assets |
| **Approval Authority** | None |
| **Financial Visibility** | None |
| **User Management** | None |

### Permissions

#### Allowed Actions
- View assigned assets
- Create maintenance tickets
- Update ticket status (Start, Progress, Complete)
- Consume spare parts
- Upload photos/documents
- Scan QR codes
- Add comments to tickets

#### Restricted
- Cannot approve tickets
- Cannot see financial data
- Cannot manage inventory (except consume)
- Cannot create/transfer assets
- Cannot access analytics
- Cannot manage users

### Dashboard Widgets (Mobile-First)
1. My Open Tickets (count)
2. Today's Schedule
3. Parts Availability
4. Completed This Week

### Navigation Menu (Simplified)
```
📊 My Dashboard
🎫 My Tickets
   ├─ Assigned
   ├─ In Progress
   └─ Completed
📦 View Assets (Assigned)
🔧 Create Ticket
📦 Parts Catalog (View)
🔔 Notifications
```

---

## 2.6 Role 5: VIEWER / AUDITOR

### Overview
| Attribute | Value |
|-----------|-------|
| **Role Code** | `VIEWER` |
| **Hierarchy Level** | 5 |
| **Access Scope** | Assigned data (read-only) |
| **Approval Authority** | None |
| **Financial Visibility** | As assigned (read-only) |
| **User Management** | None |

### Permissions

#### Read-Only Access
- Assigned assets
- Assigned tickets
- Assigned inventory
- Assigned financial data
- Audit logs (assigned scope)

#### Allowed Actions
- Generate reports
- Export data (CSV, Excel, PDF)
- View audit trails
- Print asset lists

#### Restricted
- Cannot create anything
- Cannot update anything
- Cannot delete anything
- Cannot approve anything

### Dashboard Widgets
1. Assets in Scope
2. Recent Activities
3. Transaction Summary
4. Compliance Status

### Navigation Menu
```
📊 Dashboard (Viewer)
📦 Assets (Read-only)
🔧 Tickets (Read-only)
📊 Inventory (Read-only)
💰 Financial (Read-only)
📈 Reports
   ├─ Generate
   └─ Export
🔔 Notifications
```

---

## 2.7 Role Comparison Table

| Capability | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|------------|:-----------:|:------------:|:----------:|:----------:|:------:|
| View All Data | ✓ | Region | Branch | Assigned | Assigned |
| Create Assets | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit Assets | ✓ | ✓ | ✓ | ✗ | ✗ |
| Delete Assets | ✓ | ✓ | ✗ | ✗ | ✗ |
| Transfer Assets | ✓ | ✓ | Request | ✗ | ✗ |
| Create Tickets | ✓ | ✓ | ✓ | ✓ | ✗ |
| Approve Tickets | Unlimited | $5,000 | $500 | ✗ | ✗ |
| Assign Technicians | ✓ | ✓ | ✓ | ✗ | ✗ |
| Manage Inventory | ✓ | ✓ | ✓ | Consume | ✗ |
| View Financial | ✓ | ✓ | ✓ | ✗ | Read |
| Create Users | ✓ | Region | Branch | ✗ | ✗ |
| System Settings | ✓ | ✗ | ✗ | ✗ | ✗ |
| Audit Logs | Full | Region | Branch | ✗ | Assigned |
| Export Data | ✓ | ✓ | ✓ | ✗ | ✓ |

---

## 2.8 Implementation Notes

### Role Guard Component
```tsx
// Usage in routes
<RoleGuard allowedRoles={['SUPER_ADMIN', 'REGIONAL_MANAGER']}>
  <ProtectedComponent />
</RoleGuard>
```

### Backend Middleware
```javascript
// auth.middleware.js
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};
```

### Scope Filtering
- Super Admin: No filter (sees all)
- Regional Manager: Filter by `office.region`
- Branch Manager: Filter by `office._id`
- Technician: Filter by `assignedTo === user._id`
- Viewer: Filter by assigned scope array
