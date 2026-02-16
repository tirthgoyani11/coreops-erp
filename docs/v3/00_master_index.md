# CoreOps ERP v3.0 — Master Documentation Index

> **120+ Screens | 20 Modules | 8 Implementation Phases | 16 Weeks**
> Last Updated: February 15, 2026 — All versions, references, and cross-links verified ✅

---

## Document Map

### Foundation & Architecture
| # | Document | Purpose |
|---|----------|---------|
| 00 | [00_master_index.md](./00_master_index.md) | This file — master navigation |
| 01 | [01_system_architecture.md](./01_system_architecture.md) | Tech stack, system diagram, folder structure, environment vars, deployment |
| 02 | [02_design_system.md](./02_design_system.md) | UX principles, color palette, typography, layouts, states, animations, a11y |
| 03 | [03_database_models.md](./03_database_models.md) | All 44 Mongoose schemas & entity relationships |
| 04 | [04_api_reference.md](./04_api_reference.md) | All 307+ REST + WebSocket API endpoints |
| 25 | [25_rbac_permissions.md](./25_rbac_permissions.md) | Complete RBAC permission matrix (6 roles × 20 modules) |

### Module Documentation
| # | Document | Module | Screens | Phase |
|---|----------|--------|---------|-------|
| 05 | [05_auth_identity.md](./05_auth_identity.md) | Auth & Identity | 6 | 1 |
| 06 | [06_dashboard_hub.md](./06_dashboard_hub.md) | Dashboard Hub | 5 | 2 |
| 07 | [07_asset_management.md](./07_asset_management.md) | Asset Management | 9 | 2-3 |
| 08 | [08_maintenance_cmms.md](./08_maintenance_cmms.md) | Maintenance CMMS | 8 | 3 |
| 09 | [09_inventory_warehouse.md](./09_inventory_warehouse.md) | Inventory & Warehouse | 10 | 3 |
| 10 | [10_procurement_vendors.md](./10_procurement_vendors.md) | Procurement & Vendors | 8 | 4 |
| 11 | [11_financial_accounting.md](./11_financial_accounting.md) | Financial & Accounting | 8 | 4 |
| 12 | [12_hr_people.md](./12_hr_people.md) | HR & People | 6 | 5 |
| 13 | [13_crm.md](./13_crm.md) | CRM | 5 | 5 |
| 14 | [14_sales.md](./14_sales.md) | Sales | 4 | 5 |
| 15 | [15_manufacturing_bom.md](./15_manufacturing_bom.md) | Manufacturing / BOM | 4 | 6 |
| 16 | [16_quality_management.md](./16_quality_management.md) | Quality + Projects | 3+5 | 6 |
| 17 | [17_project_management.md](./17_project_management.md) | ↳ redirect → 16 | — | 6 |
| 18 | [18_field_service.md](./18_field_service.md) | Field Service + Documents | 4+3 | 6, 2 |
| 19 | [19_document_management.md](./19_document_management.md) | ↳ redirect → 18 | — | 2 |
| 20 | [20_analytics_reports.md](./20_analytics_reports.md) | Analytics + Communication | 6+3 | 2, 5 |
| 21 | [21_communication.md](./21_communication.md) | ↳ redirect → 20 | — | 5 |
| 22 | [22_administration.md](./22_administration.md) | Administration + Profile | 6+3 | 7 |
| 23 | [23_profile_settings.md](./23_profile_settings.md) | ↳ redirect → 22 | — | 2 |
| 24 | [24_coreai_engine.md](./24_coreai_engine.md) | CoreAI Engine | 4 | 7-8 |

### References & Implementation
| # | Document | Purpose |
|---|----------|---------|
| 25 | [25_rbac_permissions.md](./25_rbac_permissions.md) | Permission matrix, data scoping, approval limits |
| 26 | [26_phase_guides.md](./26_phase_guides.md) | All 8 implementation phases with deliverables & timelines |

---

## How to Use This Documentation

1. **Start here** → You're reading `00_master_index.md`
2. **Architecture overview** → `01_system_architecture.md` (tech stack, system diagram, env vars)
3. **Design reference** → `02_design_system.md` (colors, typography, component patterns, states)
4. **Building a module** → Read the module doc (05-24) + phase guide (`26_phase_guides.md`)
5. **Database schema** → `03_database_models.md` (44 Mongoose schemas with field specs)
6. **API reference** → `04_api_reference.md` (307+ endpoints with request/response specs)
7. **Permissions** → `25_rbac_permissions.md` (what each role can access)

---

## Quick Stats

| Metric | Count |
|--------|-------|
| Total Modules | 20 |
| Total Screens | ~120 (including multi-view modes) |
| Screens Already Built | 22 |
| Screens New in v3 | ~98 |
| Database Models | 44 |
| API Endpoints | 307+ |
| WebSocket Events | 30+ |
| User Roles | 6 (Super Admin → Admin → Manager → Technician → Staff → Viewer) |
| Implementation Phases | 8 |
| Estimated Timeline | 16 weeks |

---

## File Organization Notes

Some smaller modules are combined into single files for readability:
- **16** contains Quality + Projects (both Phase 6)
- **18** contains Field Service + Document Management
- **20** contains Analytics + Communication
- **22** contains Administration + Profile/Settings

Files 17, 19, 21, 23 are redirect stubs pointing to their combined parent doc.
