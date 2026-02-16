# 06: Dashboard Hub Module

## 6.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 5 (one per role) |
| **Phase** | 1-2 |
| **Existing** | Basic dashboard with some KPIs |
| **Key Feature** | Drag-and-drop customizable widget grid |

---

## 6.2 Universal Dashboard Architecture

Every dashboard uses a **widget grid system** where users can:
1. Rearrange widgets by drag-and-drop (@dnd-kit)
2. Resize widgets (small/medium/large)
3. Toggle widget visibility
4. Save layout to user preferences
5. Reset to default layout

### Widget Types
| Widget | Size Options | Data Refresh |
|--------|-------------|--------------|
| KPI Card | 1/4 row | 30s (Socket.io) |
| Line/Area Chart | 1/2 or full row | 60s |
| Bar Chart | 1/2 or full row | 60s |
| Donut/Pie Chart | 1/4 or 1/2 row | 60s |
| Table Widget | 1/2 or full row | 30s |
| Activity Feed | 1/4 or 1/2 row | Real-time |
| Calendar Mini | 1/2 row | 60s |
| Map Widget | 1/2 or full row | 5min |
| Quick Actions | 1/4 row | Static |
| AI Insights | 1/2 row | 5min |

### Design Best Practices
- **5–7 visuals per dashboard** to limit cognitive overload
- **3-second rule**: users grasp critical information within 3 seconds
- Critical KPIs placed top-left, charts flow to the right and down
- Color coding: green = targets met, yellow = warning, red = variance/critical
- Mobile-responsive: top 2–3 KPIs prioritized on mobile views
- "Last updated" timestamps on every widget to build trust

---

## 6.3 Screen: Super Admin Dashboard
**URL**: `/dashboard`  |  **Role**: SUPER_ADMIN

### Default Layout
```
┌──────────────────────────────────────────────────────────────────┐
│  Good morning, John 👋         Last login: 2 hours ago           │
│  Here's your organization at a glance                            │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 📦 Assets│ │ 🔧 Tickets│ │ 💰 Revenue│ │ ⚠ Alerts │          │
│  │   1,247  │ │    89     │ │  ₹2.4Cr  │ │    12    │           │
│  │  +5 new  │ │ 23 open  │ │ +12% ▲   │ │ 3 crit.  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────┐ ┌────────────────────────────┐  │
│  │ Revenue & Expenses (12mo) │ │ Ticket Status Distribution │  │
│  │ [Line chart with 2 lines] │ │ [Donut chart]              │  │
│  │                            │ │ Open: 23 │ In Prog: 15    │  │
│  │                            │ │ Closed: 51                │  │
│  └────────────────────────────┘ └────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────┐ ┌────────────────────────────┐  │
│  │ Recent Activity Feed       │ │ Quick Actions              │  │
│  │ • Asset COR-NYC-01 trans.. │ │ [+ New Asset]              │  │
│  │ • Ticket MT-089 completed  │ │ [+ New Ticket]             │  │
│  │ • PO-042 approved by Jane  │ │ [+ New PO]                 │  │
│  │ • 3 items low stock alert  │ │ [📊 Generate Report]       │  │
│  └────────────────────────────┘ └────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────┐ ┌────────────────────────────┐  │
│  │ 💡 CoreAI Insights         │ │ Asset Health Overview      │  │
│  │ "3 assets predicted to     │ │ [Heatmap by location]      │  │
│  │  need maintenance in the   │ │ NYC: 92% │ SF: 87%         │  │
│  │  next 2 weeks" [View]      │ │ Mumbai: 95% │ London: 78%  │  │
│  └────────────────────────────┘ └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Widgets
| # | Widget | Default Size | Data Source |
|---|--------|-------------|-------------|
| 1 | Total Assets KPI | 1/4 | GET /assets/stats |
| 2 | Open Tickets KPI | 1/4 | GET /maintenance/stats |
| 3 | Revenue KPI | 1/4 | GET /analytics/financial |
| 4 | Active Alerts KPI | 1/4 | GET /notifications?priority=HIGH |
| 5 | Revenue/Expense Chart | 1/2 | GET /analytics/financial?type=monthly |
| 6 | Ticket Status Donut | 1/2 | GET /maintenance/stats?groupBy=status |
| 7 | Activity Feed | 1/2 | WebSocket: notification:new |
| 8 | Quick Actions | 1/2 | Static |
| 9 | AI Insights | 1/2 | GET /ai-insights |
| 10 | Asset Health Map | 1/2 | GET /analytics/assets?type=health |

---

## 6.4 Screen: Admin Dashboard
**URL**: `/dashboard`  |  **Role**: ADMIN

### Default Widgets
| # | Widget | Purpose |
|---|--------|---------|
| 1 | Organization Health KPI | Overall system status across all offices |
| 2 | User Activity KPI | Active users in the last 24 hours |
| 3 | Pending Approvals KPI | Count of pending approvals (red if > 10) |
| 4 | System Audit Trail | Recent audit log entries (last 50) |
| 5 | Office Comparison | Table: office names with Assets, Tickets, Revenue |
| 6 | Security Alerts | Failed logins, locked accounts, suspicious activity |
| 7 | Budget vs Actuals | All-office budget utilization gauge |
| 8 | Quick Actions | [+ New User] [+ New Office] [🔧 System Settings] [📊 Reports] |

---

## 6.5 Screen: Manager Dashboard
**URL**: `/dashboard`  |  **Role**: MANAGER

### Default Widgets
| # | Widget | Purpose |
|---|--------|---------|
| 1 | Branch Assets KPI | Total assets in managed branches |
| 2 | My Approvals KPI | Pending approvals count (red if > 5) |
| 3 | Budget Utilization | Budget used vs remaining (gauge) |
| 4 | Team Utilization | Staff workload distribution |
| 5 | Approval Queue | Table of pending approvals [Approve] [Reject] |
| 6 | Upcoming Maintenance | Calendar widget: next 7 days |
| 7 | Low Stock Alerts | Items below reorder point |
| 8 | Team Activity | Recent actions by team members |

---

## 6.6 Screen: Staff Dashboard
**URL**: `/dashboard`  |  **Role**: STAFF

### Default Layout
```
┌──────────────────────────────────────────────────────────────────┐
│  Welcome back, Mike 🔧                                            │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 🎫 My    │ │ ⏰ Overdue│ │ ✅ Done  │ │ 📦 Parts │           │
│  │ Tickets  │ │          │ │ This Week│ │ Requests │           │
│  │    7     │ │    2     │ │    12    │ │    3     │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ My Assigned Tickets                        [View All →]   │    │
│  │ ──────────────────────────────────────────────────────── │    │
│  │ 🔴 MT-089 │ HVAC Compressor Fail │ NYC-F2 │ Due Today  │    │
│  │ 🟡 MT-091 │ Elevator inspection  │ NYC-L1 │ Due Tmrw   │    │
│  │ 🟢 MT-094 │ Fire alarm test      │ NYC-F5 │ Due Fri    │    │
│  └──────────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────┐ ┌────────────────────────────┐  │
│  │ Today's Schedule           │ │ Quick Actions              │  │
│  │ [Calendar mini view]       │ │ [📸 Scan QR → Open Asset]  │  │
│  │ 9:00 - MT-089 HVAC repair  │ │ [+ Log Parts Used]        │  │
│  │ 14:00 - MT-091 Elevator    │ │ [+ Start Timer]           │  │
│  └────────────────────────────┘ └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Widgets
| # | Widget | Purpose |
|---|--------|---------|
| 1 | My Tickets KPI | Assigned maintenance tickets |
| 2 | Overdue KPI | Overdue tickets count (red badge) |
| 3 | Done This Week KPI | Completed tickets this week |
| 4 | Parts Requests KPI | Pending parts/inventory requests |
| 5 | My Assigned Tickets | Table of assigned tickets, sortable by priority |
| 6 | Today's Schedule | Calendar mini view of today's work |
| 7 | Quick Actions | [📸 Scan QR] [+ Log Parts] [+ Start Timer] |
| 8 | Recent Documents | Recently uploaded/modified docs |

---

## 6.7 Screen: Viewer Dashboard
**URL**: `/dashboard`  |  **Role**: VIEWER

### Default Widgets (Read-Only)
| # | Widget | Purpose |
|---|--------|---------|
| 1 | Asset Overview KPI | Total assets visible to viewer |
| 2 | Open Tickets KPI | Open tickets in viewer's scope |
| 3 | Asset Status Chart | Donut: Active/Maintenance/Decommissioned |
| 4 | Recent Tickets | Last 10 tickets (read-only) |
| 5 | Asset Map | Map of assets in viewer's locations |

---

## 6.8 Dashboard Customization System

### Save Layout API
```
PATCH /api/users/:id/preferences
Body: {
  dashboardLayout: {
    widgets: [
      { id: "kpi-assets", x: 0, y: 0, w: 3, h: 1, visible: true },
      { id: "kpi-tickets", x: 3, y: 0, w: 3, h: 1, visible: true },
      ...
    ]
  }
}
```

### Widget Toggle Panel
- Open from dashboard header: [⚙ Customize]
- Popover: List all available widgets with toggles
- Drag handle to reorder
- [Reset to Default] button
