# 13: CRM Module

## 13.1 Module Overview
| Attribute | Value |
|-----------|-------|
| **Screens** | 5 |
| **Phase** | 5 |
| **Models** | Lead |
| **Key Feature** | Pipeline Kanban, activity tracking, lead scoring |

---

## 13.2 Screen: Leads List / Pipeline
**URL**: `/crm`  |  **Access**: Manager+, Staff

### Quick Stats
| Total Leads | New | Qualified | Proposal | Won This Month | Pipeline Value |

### View Modes
1. **Table**: Standard sortable list
2. **Kanban** (default): Pipeline stages as columns

### Kanban Pipeline
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│   NEW    │ │CONTACTED │ │QUALIFIED │ │ PROPOSAL │ │NEGOTIATION│
│  (15)    │ │   (8)    │ │   (6)    │ │   (4)    │ │   (2)    │
├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤
│┌────────┐│ │┌────────┐│ │┌────────┐│ │┌────────┐│ │┌────────┐│
││TechCorp ││ ││BuildPro ││ ││MegaInc ││ ││FastCo  ││ ││BigDeal ││
││₹25,000 ││ ││₹15,000 ││ ││₹80,000 ││ ││₹45,000 ││ ││₹120,000││
││Jane S.  ││ ││Mike C.  ││ ││Tom B.  ││ ││Jane S. ││ ││Mike C. ││
││Follow:Fri││ ││         ││ ││         ││ ││         ││ ││        ││
│└────────┘│ │└────────┘│ │└────────┘│ │└────────┘│ │└────────┘│
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
                                          Total Pipeline: ₹2,85,000
```
- Drag lead cards between columns to move through pipeline
- Card shows: company, value, assigned user, next follow-up

---

## 13.3 Screen: Lead Detail
**URL**: `/crm/:id`  |  **Access**: Manager+, Staff

### Entity Header
- Company, contact name, value, source, status badge
- Pipeline stage indicator (horizontal progress)
- Actions: [✏ Edit] [📞 Log Call] [📧 Email] [📝 Note] [✅ Won] [❌ Lost]

### Tabs
| Tab | Content |
|-----|---------|
| **Overview** | Contact info, company, source, tags, custom fields |
| **Activities** | Timeline: calls, emails, meetings, notes (logged chronologically) |
| **Linked Entities** | Sales orders, quotes, documents |
| **AI Insights** | Lead score, best time to contact, conversion probability |

### Log Activity
```
┌──────────────────────────────────────────────────────────────────┐
│ Log Activity                                                      │
│ Type: [📞 Call] [📧 Email] [🤝 Meeting] [📝 Note]               │
│                                                                  │
│ Description: ┌─────────────────────────────────────┐             │
│              │ Discussed pricing, will send proposal│             │
│              └─────────────────────────────────────┘             │
│ Next Follow-Up: [Feb 20, 2026]                                    │
│                                             [Log Activity]       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 13.4 Screen: Create Lead
**URL**: `/crm/create`  |  **Access**: Manager+, Staff

### Form
| Field | Type | Validation |
|-------|------|------------|
| Contact Name* | Text | Required |
| Company Name | Text | Optional |
| Email | Email | Valid format |
| Phone | Text | Optional |
| Source* | Dropdown | Website, Referral, Cold Call, Email, Social, Trade Show |
| Estimated Value | Currency | Optional |
| Assigned To | User autocomplete | Optional |
| Tags | Tag input | Optional |
| Notes | Textarea | Optional |

---

## 13.5 Screen: CRM Dashboard / Analytics
**URL**: `/crm/analytics`  |  **Access**: Manager+

### KPIs
| KPI | Calculation |
|-----|-------------|
| Conversion Rate | Won / Total leads % |
| Avg Deal Size | Total won value / Won count |
| Avg Time to Close | Avg days from New to Won |
| Pipeline Value | Sum of all active lead values |

### Charts
1. **Pipeline Funnel** (Funnel chart): New → Contacted → Qualified → Proposal → Won
2. **Leads by Source** (Donut): Where leads come from
3. **Monthly Conversions** (Bar): Won vs Lost per month
4. **Revenue Forecast** (Line): Predicted revenue based on pipeline probability
5. **Leaderboard** (Table): Sales reps by won deals

---

## 13.6 Screen: Lead Import
**URL**: `/crm/import`  |  **Access**: Manager+
- CSV import with column mapping
- Duplicate detection (by email/company)
- Merge or skip duplicates option
