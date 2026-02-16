# Phase Implementation Guides — CoreOps ERP v3.0

> **8 Phases | 16 Weeks | 120+ Screens**

---

# Phase 1: Foundation (Weeks 1-2)

## Goals
- Set up project infrastructure
- Implement authentication & JWT
- Build role-based access control
- Create design system base

## Deliverables
| # | Deliverable | Screens | Status |
|---|-------------|---------|--------|
| 1 | Project scaffolding (Vite + Express) | - | ⬜ |
| 2 | Environment setup (.env, DB, etc.) | - | ⬜ |
| 3 | User model & auth endpoints | - | ⬜ |
| 4 | Login page | Screen 1 | ⬜ |
| 5 | Registration page (multi-step) | Screen 2 | ⬜ |
| 6 | Forgot/reset password | Screens 3-4 | ⬜ |
| 7 | JWT middleware + refresh tokens | - | ⬜ |
| 8 | RBAC middleware (6 roles) | - | ⬜ |
| 9 | Design system CSS (colors, typography, spacing) | - | ⬜ |
| 10 | Layout component (sidebar, topbar) | - | ⬜ |
| 11 | Error handling (toast, boundary) | - | ⬜ |

## Reference Docs
- [01_system_architecture.md](./01_system_architecture.md) — Tech stack
- [02_design_system.md](./02_design_system.md) — CSS/UX specs
- [05_auth_identity.md](./05_auth_identity.md) — Auth screens
- [25_rbac_permissions.md](./25_rbac_permissions.md) — RBAC rules

---

# Phase 2: Core Modules (Weeks 3-5)

## Goals
- Build the 5 core modules that form the backbone
- Implement universal list/detail pattern
- Set up real-time notifications

## Deliverables
| # | Deliverable | Screens | Status |
|---|-------------|---------|--------|
| 1 | Organization management (CRUD) | 2 screens | ⬜ |
| 2 | Dashboard Hub (6 role dashboards) | 6 screens | ⬜ |
| 3 | Asset management (list, detail, create/edit) | 5 screens | ⬜ |
| 4 | Document management (browser, upload) | 3 screens | ⬜ |
| 5 | Analytics — Executive dashboard | 1 screen | ⬜ |
| 6 | Profile & Settings | 3 screens | ⬜ |
| 7 | Notification center | 2 screens | ⬜ |
| 8 | Socket.io setup for real-time | - | ⬜ |
| **Total** | | **~21 screens** | |

## Reference Docs
- [06_dashboard_hub.md](./06_dashboard_hub.md) — Dashboards
- [07_asset_management.md](./07_asset_management.md) — Assets (first 5 screens)
- [18_field_service.md](./18_field_service.md) — Contains Document management (Sections 19.x)
- [20_analytics_reports.md](./20_analytics_reports.md) — Analytics
- [22_administration.md](./22_administration.md) — Contains Profile (Sections 23.x)

---

# Phase 3: Maintenance & Inventory (Weeks 5-7)

## Goals
- Build the complete maintenance ticket system (4-view: table/card/calendar/kanban)
- Build dual-stream inventory
- Connect assets → tickets → inventory pipeline

## Deliverables
| # | Deliverable | Screens | Status |
|---|-------------|---------|--------|
| 1 | Maintenance tickets (list with 4 views) | 1 screen (4 views) | ⬜ |
| 2 | Ticket detail (timeline, parts, photos) | 1 screen | ⬜ |
| 3 | Create/edit ticket | 1 screen | ⬜ |
| 4 | Approval queue | 1 screen | ⬜ |
| 5 | Maintenance calendar (FullCalendar) | 1 screen | ⬜ |
| 6 | Preventive maintenance scheduler | 1 screen | ⬜ |
| 7 | Repair/replace calculator | 1 screen | ⬜ |
| 8 | Maintenance analytics | 1 screen | ⬜ |
| 9 | Inventory list (dual stream) | 1 screen | ⬜ |
| 10 | Inventory detail + movements | 1 screen | ⬜ |
| 11 | Create inventory item | 1 screen | ⬜ |
| 12 | Stock-in / stock-out | 2 screens | ⬜ |
| 13 | Low stock alerts | 1 screen | ⬜ |
| 14 | Inventory transfer | 1 screen | ⬜ |
| 15 | Stock valuation report | 1 screen | ⬜ |
| 16 | Asset QR codes + transfer | 2 screens | ⬜ |
| 17 | Asset map view | 1 screen | ⬜ |
| 18 | Asset import (CSV) | 1 screen | ⬜ |
| **Total** | | **~18 screens** | |

## Reference Docs
- [08_maintenance_cmms.md](./08_maintenance_cmms.md) — Maintenance
- [09_inventory_warehouse.md](./09_inventory_warehouse.md) — Inventory
- [07_asset_management.md](./07_asset_management.md) — Remaining asset screens

## Key Libraries for this Phase
- `@dnd-kit` — Kanban drag-and-drop
- `FullCalendar + @fullcalendar/react` — Calendar views
- `TanStack Table` — Advanced table features
- `qrcode` (node), `qrcode.react` — QR generation

---

# Phase 4: Procurement & Financial (Weeks 7-9)

## Goals
- Build vendor management with reliability scoring
- Full purchase order lifecycle with 3-way matching
- Financial module with OCR invoice scanning
- Budget tracking

## Deliverables
| # | Deliverable | Screens | Status |
|---|-------------|---------|--------|
| 1 | Vendor list + detail (with reliability dashboard) | 2 screens | ⬜ |
| 2 | Create/edit vendor | 1 screen | ⬜ |
| 3 | Vendor comparison | 1 screen | ⬜ |
| 4 | Purchase orders (list + detail) | 2 screens | ⬜ |
| 5 | Create PO | 1 screen | ⬜ |
| 6 | Goods receipt | 1 screen | ⬜ |
| 7 | Three-way matching | 1 screen (tab) | ⬜ |
| 8 | Transaction list + detail | 2 screens | ⬜ |
| 9 | Record transaction | 1 screen | ⬜ |
| 10 | OCR invoice scanner | 1 screen | ⬜ |
| 11 | Budget vs actual report | 1 screen | ⬜ |
| 12 | Financial reports | 1 screen | ⬜ |
| 13 | Bank reconciliation | 1 screen | ⬜ |
| 14 | Currency management | 1 screen | ⬜ |
| **Total** | | **~16 screens** | |

## Reference Docs
- [10_procurement_vendors.md](./10_procurement_vendors.md) — Procurement
- [11_financial_accounting.md](./11_financial_accounting.md) — Financial

## Key Libraries
- `tesseract.js` — Client-side OCR
- `@google/generative-ai` — Gemini for invoice data extraction
- `recharts` / `chart.js` — Charts

---

# Phase 5: HR, CRM, Sales, Communication (Weeks 9-11)

## Goals
- HR module for employee management
- CRM with pipeline Kanban
- Basic sales order management
- Communication and notification system polish

## Deliverables
| # | Deliverable | Screens | Status |
|---|-------------|---------|--------|
| 1 | Employee directory (table + card + org chart) | 1 screen (3 views) | ⬜ |
| 2 | Employee detail | 1 screen | ⬜ |
| 3 | Employee onboarding wizard | 1 screen | ⬜ |
| 4 | Leave management | 1 screen | ⬜ |
| 5 | Attendance tracking | 1 screen | ⬜ |
| 6 | Org chart (interactive tree) | 1 screen | ⬜ |
| 7 | CRM lead pipeline (Kanban) | 1 screen | ⬜ |
| 8 | Lead detail | 1 screen | ⬜ |
| 9 | Create lead | 1 screen | ⬜ |
| 10 | CRM analytics | 1 screen | ⬜ |
| 11 | Lead import | 1 screen | ⬜ |
| 12 | Sales orders list | 1 screen | ⬜ |
| 13 | Sales order detail (with invoice PDF) | 1 screen | ⬜ |
| 14 | Create sales order | 1 screen | ⬜ |
| 15 | Sales analytics | 1 screen | ⬜ |
| 16 | Notification center polish | 1 screen | ⬜ |
| 17 | Notification settings | 1 screen | ⬜ |
| 18 | Global activity feed | 1 screen | ⬜ |
| **Total** | | **~18 screens** | |

## Reference Docs
- [12_hr_people.md](./12_hr_people.md) — HR
- [13_crm.md](./13_crm.md) — CRM
- [14_sales.md](./14_sales.md) — Sales
- [20_analytics_reports.md](./20_analytics_reports.md) — Communication (Sections 21.x)

---

# Phase 6: Manufacturing, Quality, Projects, Field Service (Weeks 11-13)

## Goals
- BOM management with cost calculator
- Work orders and material planning
- Quality inspections
- Project management with Gantt
- Field service dispatch

## Deliverables
| # | Deliverable | Screens | Status |
|---|-------------|---------|--------|
| 1 | BOM list | 1 screen | ⬜ |
| 2 | BOM builder (tree view + cost analysis) | 1 screen | ⬜ |
| 3 | Work orders (list + detail) | 2 screens | ⬜ |
| 4 | Material planner (MRP) | 1 screen | ⬜ |
| 5 | Quality inspections (list + form) | 2 screens | ⬜ |
| 6 | Projects list | 1 screen | ⬜ |
| 7 | Project detail (Kanban + Gantt) | 1 screen | ⬜ |
| 8 | Task detail | 1 screen | ⬜ |
| 9 | Create project | 1 screen | ⬜ |
| 10 | Time tracking | 1 screen | ⬜ |
| 11 | Field service dashboard (map) | 1 screen | ⬜ |
| 12 | Dispatch & assign | 1 screen | ⬜ |
| 13 | Mobile work order | 1 screen | ⬜ |
| 14 | Field service analytics | 1 screen | ⬜ |
| **Total** | | **~16 screens** | |

## Reference Docs
- [15_manufacturing_bom.md](./15_manufacturing_bom.md) — Manufacturing
- [16_quality_management.md](./16_quality_management.md) — Quality + Projects
- [18_field_service.md](./18_field_service.md) — Field Service

## Key Libraries
- `gantt-task-react` or custom — Gantt charts
- `leaflet` + `react-leaflet` — Maps
- `d3` — Tree visualization for BOM

---

# Phase 7: Administration & CoreAI (Weeks 13-15)

## Goals
- Build all administration tools
- Integrate CoreAI Engine with Gemini
- Setup wizard for first-time users
- Webhooks & workflow builder

## Deliverables
| # | Deliverable | Screens | Status |
|---|-------------|---------|--------|
| 1 | System settings | 1 screen | ⬜ |
| 2 | Audit logs | 1 screen | ⬜ |
| 3 | Custom fields manager | 1 screen | ⬜ |
| 4 | Workflow builder (visual) | 1 screen | ⬜ |
| 5 | Webhooks manager | 1 screen | ⬜ |
| 6 | Backup & restore | 1 screen | ⬜ |
| 7 | 2FA setup | 1 screen | ⬜ |
| 8 | Setup wizard (first run) | 1 screen (6 steps) | ⬜ |
| 9 | AI command palette (Ctrl+K) | 1 screen (modal) | ⬜ |
| 10 | Predictive insights dashboard | 1 screen | ⬜ |
| 11 | AI anomaly alerts | 1 screen | ⬜ |
| 12 | AI configuration | 1 screen | ⬜ |
| 13 | Custom report builder | 1 screen | ⬜ |
| **Total** | | **~13 screens** | |

## Reference Docs
- [22_administration.md](./22_administration.md) — Admin + Profile
- [24_coreai_engine.md](./24_coreai_engine.md) — CoreAI
- [05_auth_identity.md](./05_auth_identity.md) — 2FA, Setup Wizard
- [20_analytics_reports.md](./20_analytics_reports.md) — Custom Report Builder

## Key Libraries
- `@google/generative-ai` — Gemini API
- `reactflow` — Visual workflow builder
- `monaco-editor` — Code/config editor

---

# Phase 8: Polish, Optimization & Launch (Weeks 15-16)

## Goals
- Performance optimization
- E2E testing
- Mobile responsiveness polish
- Security audit
- Deployment preparation

## Deliverables
| # | Deliverable | Details |
|---|-------------|---------|
| 1 | Performance audit | Lighthouse score > 90, bundle analysis |
| 2 | Code splitting | Lazy load all module routes |
| 3 | Mobile responsive | All screens work on 375px+ |
| 4 | Keyboard navigation | All features accessible via keyboard |
| 5 | Accessibility (a11y) | WCAG 2.1 AA compliance |
| 6 | Security audit | OWASP top 10 check, rate limiting, input sanitization |
| 7 | E2E tests | Cypress/Playwright for critical flows |
| 8 | API documentation | Swagger/OpenAPI auto-generated |
| 9 | User guide | In-app help tooltips, docs site |
| 10 | Deployment config | Docker, CI/CD, environment configs |
| 11 | Data migration | From v2 to v3 migration scripts |
| 12 | Load testing | k6 or Artillery for API load tests |

## Testing Checklist
- [ ] Auth flow: register → verify → login → 2FA → logout
- [ ] RBAC: each role can only access permitted features
- [ ] CRUD: create/read/update/delete for all entities
- [ ] Workflows: PO approval, ticket lifecycle, asset transfer
- [ ] Real-time: notifications appear live, Kanban drag works
- [ ] AI: NLP query returns results, predictions display
- [ ] Export: PDF/CSV/Excel for all reports
- [ ] Mobile: responsive on phone/tablet
- [ ] Offline: graceful degradation when server down
- [ ] Multi-tenant: data isolation between organizations

## Reference Docs
- [01_system_architecture.md](./01_system_architecture.md) — Deployment section
- [02_design_system.md](./02_design_system.md) — Responsive/accessibility specs

---

# Summary: Screen Count by Phase

| Phase | Weeks | Screens | Cumulative |
|-------|-------|---------|------------|
| 1. Foundation | 1-2 | 4 | 4 |
| 2. Core Modules | 3-5 | 21 | 25 |
| 3. Maintenance & Inventory | 5-7 | 18 | 43 |
| 4. Procurement & Financial | 7-9 | 16 | 59 |
| 5. HR, CRM, Sales | 9-11 | 18 | 77 |
| 6. Manufacturing, Quality, Projects | 11-13 | 16 | 93 |
| 7. Administration & CoreAI | 13-15 | 13 | 106 |
| 8. Polish & Launch | 15-16 | - | 106+ |
| **Total** | **16 weeks** | **~106 unique screens** | |

> Note: Some screens have multiple view modes (table/card/calendar/kanban/map), bringing the effective "screen count" to ~120+ distinct UI states.
