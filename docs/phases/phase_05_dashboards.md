# Phase 05: Dashboard Module

## 5.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 5 (one per role) |
| **Screen Numbers** | 6-10 |
| **Purpose** | Role-specific data visualization |

---

## 5.2 Dashboard Routing Logic

```typescript
// Redirect to appropriate dashboard based on role
const getDashboardRoute = (role: string) => {
  switch (role) {
    case 'SUPER_ADMIN': return '/dashboard/admin';
    case 'REGIONAL_MANAGER': return '/dashboard/regional';
    case 'BRANCH_MANAGER': return '/dashboard/branch';
    case 'TECHNICIAN': return '/dashboard/tech';
    case 'VIEWER': return '/dashboard/viewer';
    default: return '/dashboard';
  }
};
```

---

## 5.3 Screen 6: Super Admin Dashboard

**URL**: `/dashboard/admin`  
**Access**: SUPER_ADMIN only

### Layout Grid (12 columns)
```
┌────────────────────────────────────────────────────────────────────┐
│ Row 1: Key Metrics (4 cards x 3 cols each)                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│ │ Assets   │ │ Tickets  │ │ Approvals│ │ Health   │               │
│ │ $5.2M    │ │ 87 Active│ │ 12 Pend  │ │ 99.9%    │               │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
├────────────────────────────────────────────────────────────────────┤
│ Row 2: Charts (3 charts x 4 cols each)                             │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│ │Asset Distrib.│ │Monthly Costs │ │Inv. Turnover │                │
│ │  (Pie)       │ │  (Line)      │ │  (Bar)       │                │
│ └──────────────┘ └──────────────┘ └──────────────┘                │
├────────────────────────────────────────────────────────────────────┤
│ Row 3: Tables & Actions                                            │
│ ┌────────────────────────────────────┐ ┌────────────────────────┐ │
│ │ Recent Audit Log (8 cols)          │ │ Quick Actions (4 cols) │ │
│ │ User | Action | Time               │ │ + Create Org           │ │
│ │ ──────────────────                 │ │ + Add User             │ │
│ │ John | Login  | 2m ago             │ │ + Run Backup           │ │
│ │ ...                                │ │ + Generate Report      │ │
│ └────────────────────────────────────┘ └────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### Widgets Specification

| Widget | Data Source | Refresh | Component |
|--------|-------------|---------|-----------|
| Global Asset Value | `GET /api/analytics/assets/total` | 5 min | `<StatCard>` |
| Active Tickets | `GET /api/maintenance/count?status=open,in_progress` | 1 min | `<StatCard>` |
| Pending Approvals | `GET /api/maintenance/approvals/count` | 1 min | `<StatCard>` |
| System Health | `GET /api/health` | 30 sec | `<HealthCard>` |
| Asset Distribution | `GET /api/analytics/assets/by-location` | 5 min | `<PieChart>` |
| Monthly Costs | `GET /api/analytics/costs/monthly` | 5 min | `<LineChart>` |
| Inventory Turnover | `GET /api/analytics/inventory/turnover` | 5 min | `<BarChart>` |
| Recent Audit | `GET /api/audit-logs?limit=10` | 1 min | `<Table>` |

---

## 5.4 Screen 7: Regional Manager Dashboard

**URL**: `/dashboard/regional`  
**Access**: SUPER_ADMIN, REGIONAL_MANAGER

### Layout
```
┌────────────────────────────────────────────────────────────────────┐
│ Header: Region Selector ▼ [Mumbai Region]     Date Range: [▼]     │
├────────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│ │ Regional │ │ Pending  │ │ Budget   │ │ Critical │               │
│ │ Assets   │ │ Approvals│ │ 78%      │ │ Tickets  │               │
│ │ 1,245    │ │ 8 (<$5K) │ │ Used     │ │ 3        │               │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
├────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────┐ ┌─────────────────────────────┐│
│ │ Branch Comparison               │ │ Regional Expenses Trend     ││
│ │ (Grouped Bar Chart)             │ │ (Line Chart)                ││
│ │                                 │ │                             ││
│ └─────────────────────────────────┘ └─────────────────────────────┘│
├────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ Approval Queue                                                   ││
│ │ ┌──────────────────────────────────────────────────────────────┐ ││
│ │ │ #MT-789 | HVAC Repair | $2,500 | NYC Branch | [Approve][Reject]││
│ │ └──────────────────────────────────────────────────────────────┘ ││
│ └──────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

---

## 5.5 Screen 8: Branch Manager Dashboard

**URL**: `/dashboard/branch`  
**Access**: SUPER_ADMIN, REGIONAL_MANAGER, BRANCH_MANAGER

### Widgets

| Widget | Description | Action |
|--------|-------------|--------|
| Asset Health | Donut: Operational vs Maintenance | Click to Assets |
| Today's Tickets | Count of new + in-progress | Click to Maintenance |
| Approval Queue | Tickets under $500 | Inline Approve/Reject |
| Inventory Status | Items below threshold | Click to Alerts |
| MTD Expenses | vs Budget bar | Click to Financial |
| Technician Load | Active assignments | Click to Assignment |

---

## 5.6 Screen 9: Technician Dashboard

**URL**: `/dashboard/tech`  
**Access**: All roles (but shows only technician's data)

### Mobile-First Layout
```
┌─────────────────────────────────────┐
│ My Open Tickets: 4                  │
├─────────────────────────────────────┤
│ TODAY'S PRIORITY                    │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🔴 CRITICAL                     │ │
│ │ HVAC Unit Failure               │ │
│ │ Building A, Floor 2             │ │
│ │ Est: 2 hours                    │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │       START WORK            │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🟡 HIGH                         │ │
│ │ Printer Maintenance             │ │
│ │ Office 201                      │ │
│ │ [View Details]                  │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ COMPLETED THIS WEEK: 12             │
├─────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐ │
│ │ 📷 SCAN QR    │ │ ➕ NEW TICKET │ │
│ └───────────────┘ └───────────────┘ │
└─────────────────────────────────────┘
```

### Design Requirements
- Large touch targets (min 48px)
- High contrast colors
- Offline indicator
- Pull-to-refresh
- Swipe actions on tickets

---

## 5.7 Screen 10: Viewer Dashboard

**URL**: `/dashboard/viewer`  
**Access**: All roles (shows viewer's assigned scope)

### Read-Only Features
- All data is display-only
- No action buttons
- Export options prominent
- Focus on reporting tools

---

## 5.8 Dashboard Components

### StatCard Component
```tsx
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;  // Percentage change
  changeLabel?: string;
  onClick?: () => void;
}
```

### Chart Components
- Use Recharts library
- Responsive containers
- Consistent color theme
- Loading skeletons
- Empty state handling

---

## 5.9 Data Refresh Strategy

| Data Type | Refresh Interval | Method |
|-----------|------------------|--------|
| Real-time alerts | 30 seconds | Polling / WebSocket |
| Ticket counts | 1 minute | Polling |
| Charts | 5 minutes | Polling |
| Static data | On mount | API call |
