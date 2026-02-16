# 20: Analytics & Reports Module

## 20.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 6 |
| **Phase** | 2 |
| **Key Feature** | Cross-module analytics, custom report builder, scheduled exports |

---

## 20.2 Screen: Executive Analytics
**URL**: `/analytics`  |  **Access**: Admin, Manager

### Top-Level KPIs (customizable row)
| KPI | Source |
|-----|--------|
| Total Revenue | Financial module |
| Total Assets Value | Assets (sum current values) |
| Open Maintenance | Tickets (open count) |
| Procurement Spend | POs (total this month) |
| Team Utilization | HR (active/total) |
| AI Alert Count | CoreAI anomalies |

### Charts
1. **Revenue vs Expenses** (Line, 12 months)
2. **Asset Health by Location** (Heatmap/bar)
3. **Ticket Volume Trend** (Area chart)
4. **Inventory Value Trend** (Line)
5. **Top 5 Cost Centers** (Horizontal bar)
6. **Budget vs Actual** (Grouped bar)

### Export
- PDF report with all charts
- Excel with raw data
- Schedule: daily/weekly/monthly auto-email

---

## 20.3 Screen: Asset Analytics
**URL**: `/analytics/assets`  |  **Access**: Manager+

### KPIs
| KPI | Description |
|-----|-------------|
| Total Assets | Count |
| Total Value | Sum of current values |
| Avg Age | Average asset age in years |
| Depreciation This Year | Total depreciation amount |
| Health Score Avg | Average AI health score |

### Charts
1. **Assets by Category** (Donut)
2. **Assets by Status** (Donut)
3. **Asset Value by Location** (Bar)
4. **Depreciation Trend** (Line, monthly)
5. **Top 10 Costliest Assets** (Table)
6. **Assets Predicted to Fail** (AI-generated list)

---

## 20.4 Screen: Maintenance Analytics
**URL**: `/analytics/maintenance`  |  **Access**: Manager+

### KPIs
- MTBF, MTTR, First-Time Fix Rate, SLA Compliance, Backlog, Avg Cost/Ticket

### Charts
1. **Tickets by Month** (Bar)
2. **Cost Trend** (Line)
3. **By Priority** (Donut)
4. **By Category** (Horizontal bar)
5. **By Technician** (Table with completion stats)
6. **SLA Performance** (Gauge)
7. **Repair vs Replace** (Cumulative analysis)

---

## 20.5 Screen: Inventory Analytics
**URL**: `/analytics/inventory`  |  **Access**: Manager+

### KPIs
- Total Items, Total Value, Low Stock Count, Turnover Rate, Slow-Moving Count

### Charts
1. **Stock Value by Category** (Donut)
2. **Movement Trend** (Line: stock-in vs stock-out)
3. **Low Stock Items** (Table with reorder actions)
4. **Slow Moving Items** (>90 days no movement)
5. **Top Consumed Items** (Bar)

---

## 20.6 Screen: Financial Analytics
**URL**: `/analytics/financial`  |  **Access**: Manager+

### KPIs
- Revenue (MTD/YTD), Expenses, Net Profit, Gross Margin %, Pending Payments

### Charts
1. **P&L Monthly** (Grouped bar: income vs expense)
2. **Expense Breakdown** (Donut by category)
3. **Cash Flow** (Line)
4. **Budget Variance** (Bar)
5. **Accounts Receivable Aging** (Stacked bar)

---

## 20.7 Screen: Custom Report Builder
**URL**: `/analytics/builder`  |  **Access**: Manager+

### Builder Interface
```
┌──────────────────────────────────────────────────────────────────┐
│  📊 Report Builder                                [Save] [Run]  │
├──────────────────────────────────────────────────────────────────┤
│  Data Source: [Assets ▾]                                         │
│                                                                  │
│  Columns: [Drag fields here]                                    │
│  ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐              │
│  │ Name   │ │ Category │ │ Value  │ │ Status   │              │
│  └────────┘ └──────────┘ └────────┘ └──────────┘              │
│                                                                  │
│  Filters: Category = "HVAC" AND Status = "ACTIVE"               │
│  Group By: [Location ▾]                                         │
│  Sort By: [Value ▾] [Descending ▾]                              │
│                                                                  │
│  Visualization: [📊 Table] [📈 Chart] [📉 Graph]                │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PREVIEW:                                                 │    │
│  │ Location │ Count │ Total Value │ Avg Value              │    │
│  │ NYC      │  45   │ ₹450,000    │ ₹10,000               │    │
│  │ SF       │  32   │ ₹320,000    │ ₹10,000               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Export PDF] [Export Excel] [Schedule Email] [Save as Template] │
└──────────────────────────────────────────────────────────────────┘
```

### Available Data Sources
- Assets, Tickets, Inventory, Vendors, POs, Transactions, Employees, Leads, Projects

### Saved Reports
- List of saved custom reports
- Share with team
- Schedule auto-generation


# 21: Communication Module

## 21.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 3 |
| **Phase** | 5 |
| **Key Feature** | Notification center, real-time alerts, @mentions, entity-linked comments |

---

## 21.2 Screen: Notification Center
**URL**: `/notifications`  |  **Access**: All

### Layout
```
┌──────────────────────────────────────────────────────────────────┐
│  🔔 Notifications                    [Mark All Read] [Settings] │
├──────────────────────────────────────────────────────────────────┤
│  [All] [Unread (5)] [Approvals] [Tickets] [System] [AI]        │
├──────────────────────────────────────────────────────────────────┤
│  TODAY                                                           │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 🟡 🔧 Ticket MT-089 assigned to you                      │    │
│  │    HVAC Compressor − NYC HQ │ 2 hours ago  [View →]      │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │ 🟡 ✅ PO-042 approved by Mike Johnson                    │    │
│  │    AcmeCo − ₹1,200 │ 3 hours ago  [View →]              │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │ ⚪ 💡 CoreAI: Asset HVAC-042 predicted maintenance       │    │
│  │    87% probability of failure in 2 weeks  [Investigate →]│    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  YESTERDAY                                                       │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ ⚪ @Jane mentioned you in Ticket MT-085                   │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Behavior
- Real-time via Socket.io (new notifications appear instantly)
- Bell icon badge shows unread count
- Click notification → navigate to entity
- Swipe left to dismiss (mobile)

---

## 21.3 Screen: Notification Settings
**URL**: `/notifications/settings`  |  **Access**: All

### Preference Matrix
| Event | In-App | Email | Push |
|-------|--------|-------|------|
| Ticket assigned to me | ✅ | ✅ | ✅ |
| Ticket status changed | ✅ | ☐ | ☐ |
| Approval pending | ✅ | ✅ | ✅ |
| Low stock alert | ✅ | ✅ | ☐ |
| AI prediction | ✅ | ☐ | ☐ |
| @mention | ✅ | ✅ | ✅ |
| System announcement | ✅ | ✅ | ☐ |

### Quiet Hours
- Enable quiet hours: [7 PM — 8 AM]
- Exceptions: Critical/Emergency always notify

---

## 21.4 Screen: Activity Feed (Global)
**URL**: `/activity`  |  **Access**: Manager+

### Features
- Global activity stream across all modules
- Filter by module, user, action type
- Real-time updates
- Each entry: icon, description, user avatar, timestamp, link
