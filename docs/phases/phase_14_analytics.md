# Phase 14: Analytics Module

## 14.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 6 (Screens 57-62) |
| **Purpose** | Data visualization and reporting |
| **Key Feature** | Custom report builder |

---

## 14.2 Screen 57: Executive Analytics

**URL**: `/analytics/executive`  
**Access**: Manager roles + Viewer (read-only)

### Executive Dashboard
```
┌────────────────────────────────────────────────────────────────────────┐
│ Executive Analytics              [Export PDF] [Schedule Report]       │
│ Period: [Last 30 Days ▼]  Location: [All Locations ▼]                 │
├────────────────────────────────────────────────────────────────────────┤
│ KEY PERFORMANCE INDICATORS                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │ Revenue  │ │ Expenses │ │ Asset    │ │ Ticket   │ │ Inventory│     │
│ │ $245K    │ │ $182K    │ │ Util.    │ │ Resol.   │ │ Turnover │     │
│ │ ▲ 12%    │ │ ▼ 5%     │ │ 87%      │ │ 4.2 hrs  │ │ 2.3x     │     │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
├────────────────────────────────────────────────────────────────────────┤
│ TREND ANALYSIS                                                         │
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │ [Multi-line chart: Revenue, Expenses, Profit over 12 months]       ││
│ └────────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────┤
│ BREAKDOWN BY LOCATION                                                  │
│ ┌───────────────────────────────┐ ┌───────────────────────────────┐  │
│ │ [Bar chart: Revenue by loc]   │ │ [Pie: Expense distribution]   │  │
│ └───────────────────────────────┘ └───────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 14.3 Screen 58: Asset Analytics

**URL**: `/analytics/assets`  
**Access**: Manager roles + Viewer (read-only)

### Metrics
| Metric | Description |
|--------|-------------|
| Total Assets | Count and value |
| Utilization Rate | Active vs Under Maintenance |
| Depreciation Summary | Total depreciation YTD |
| Lifecycle Analysis | Age distribution |
| Category Distribution | By type |
| Location Distribution | By branch |

### Charts
1. **Asset Value Over Time** (Area chart)
2. **Assets by Status** (Donut)
3. **Age Distribution** (Histogram)
4. **Top 10 by Maintenance Cost** (Horizontal bar)
5. **Depreciation Forecast** (Line with projection)

---

## 14.4 Screen 59: Maintenance Analytics

**URL**: `/analytics/maintenance`  
**Access**: Manager roles + Viewer (read-only)

### Metrics
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total Tickets│ │ Avg Resolut. │ │ First-Time   │ │ Total Cost   │
│ 287 (MTD)    │ │ 4.2 hours    │ │ Fix Rate 78% │ │ $45,670      │
│ ▲ 15 vs LM   │ │ ▼ 0.5h       │ │ ▲ 3%         │ │ ▼ 8%         │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Charts
1. **Ticket Volume Trend** (Line - daily/weekly)
2. **Tickets by Status** (Stacked bar)
3. **Cost by Category** (Pie)
4. **Technician Performance** (Bar - tickets & time)
5. **MTBF by Asset Type** (Table with trend arrows)
6. **Response Time Distribution** (Box plot)

---

## 14.5 Screen 60: Inventory Analytics

**URL**: `/analytics/inventory`  
**Access**: Manager roles + Viewer (read-only)

### Metrics
| Metric | Calculation |
|--------|-------------|
| Total Value | Sum of (qty × unit cost) |
| Turnover Rate | Cost of goods sold / avg inventory |
| Days of Supply | Current stock / avg daily usage |
| Stock Accuracy | Physical count / system count |

### Charts
1. **Inventory Value Trend** (Line)
2. **Turnover by Category** (Bar)
3. **Top 10 Fast-Moving Items** (Horizontal bar)
4. **Slow-Moving Inventory** (Table - no movement 90+ days)
5. **Stock-Out Frequency** (Heatmap by item/month)
6. **Consumption by Ticket** (Sankey diagram)

---

## 14.6 Screen 61: Financial Analytics

**URL**: `/analytics/financial`  
**Access**: Manager roles + Viewer (assigned scope)

### P&L Summary
```
┌────────────────────────────────────────────────────────────────────────┐
│ Financial Performance                              Period: Q1 2026     │
├────────────────────────────────────────────────────────────────────────┤
│ Revenue                                                    $245,670    │
│   ├─ Product Sales                             $198,450               │
│   └─ Service Revenue                           $47,220                │
├────────────────────────────────────────────────────────────────────────┤
│ Cost of Goods Sold                                        ($89,340)   │
│ ───────────────────────────────────────────────────────────────────── │
│ Gross Profit                                              $156,330    │
├────────────────────────────────────────────────────────────────────────┤
│ Operating Expenses                                        ($98,560)   │
│   ├─ Maintenance                               $45,670                │
│   ├─ Payroll                                   $32,450                │
│   └─ Other Operating                           $20,440                │
├────────────────────────────────────────────────────────────────────────┤
│ Net Income                                                 $57,770    │
└────────────────────────────────────────────────────────────────────────┘
```

### Charts
1. **Revenue vs Expense Trend** (Dual-axis)
2. **Cash Flow** (Waterfall)
3. **Expense Breakdown** (Treemap)
4. **Budget vs Actual** (Grouped bar)
5. **Currency Exposure** (Pie - if multi-currency)

---

## 14.7 Screen 62: Report Builder

**URL**: `/analytics/builder`  
**Access**: Manager roles

### Builder Interface
```
┌────────────────────────────────────────────────────────────────────────┐
│ Custom Report Builder                              [Save] [Export]     │
├────────────────────────────────────────────────────────────────────────┤
│ Report Name: [Monthly Asset Summary                               ]   │
├────────────────────────────────────────────────────────────────────────┤
│ Data Source                                                            │
│ [Assets ▼]  [+ Add Data Source]                                       │
├────────────────────────────────────────────────────────────────────────┤
│ Fields                     │ Preview                                   │
│ ☑ GUAI                     │ ┌─────────────────────────────────────┐  │
│ ☑ Asset Name               │ │ GUAI    │ Name    │ Value  │ Status│  │
│ ☑ Current Value            │ │ ────────┼─────────┼────────┼───────│  │
│ ☑ Status                   │ │ COR-001 │ HVAC    │ $12,450│ Active│  │
│ ☐ Location                 │ │ COR-002 │ Server  │ $45,000│ Maint │  │
│ ☐ Purchase Date            │ └─────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│ Filters                                                                │
│ [Location] [=] [NYC] [+ Add Filter]                                   │
├────────────────────────────────────────────────────────────────────────┤
│ Group By: [Status ▼]   Sort By: [Value ▼] [Desc ▼]                    │
├────────────────────────────────────────────────────────────────────────┤
│ Visualization: ○ Table  ○ Bar Chart  ● Pie Chart  ○ Line Chart       │
├────────────────────────────────────────────────────────────────────────┤
│ Schedule: [None ▼]  Recipients: [Add email...]                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Features
- Drag-and-drop field selection
- Multiple data sources (join)
- Calculated fields
- Conditional formatting
- Multiple visualizations
- Save as template
- Schedule email delivery
- Export: PDF, Excel, CSV
