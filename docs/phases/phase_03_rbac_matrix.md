# Phase 03: Role-Based Access Control (RBAC) Matrix

## 3.1 Legend

| Symbol | Meaning |
|--------|---------|
| ✓ | Full access (Create, Read, Update, Delete) |
| R | Read-only access |
| C | Create only |
| U | Update only |
| $X | Conditional - up to monetary limit |
| Req | Can request (requires approval from higher role) |
| Own | Own records only |
| Scope | Limited to organizational scope |
| ✗ | No access (feature hidden) |

---

## 3.2 Authentication Module

| Screen | URL | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-----|:-----------:|:------------:|:----------:|:----------:|:------:|
| Login | `/login` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Forgot Password | `/forgot-password` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reset Password | `/reset-password` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Registration | `/register` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Setup Wizard | `/setup` | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## 3.3 Dashboard Module

| Screen | URL | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-----|:-----------:|:------------:|:----------:|:----------:|:------:|
| Super Admin Dashboard | `/dashboard/admin` | ✓ | ✗ | ✗ | ✗ | ✗ |
| Regional Dashboard | `/dashboard/regional` | ✓ | ✓ | ✗ | ✗ | ✗ |
| Branch Dashboard | `/dashboard/branch` | ✓ | ✓ | ✓ | ✗ | ✗ |
| Technician Dashboard | `/dashboard/tech` | ✓ | ✓ | ✓ | ✓ | ✗ |
| Viewer Dashboard | `/dashboard/viewer` | ✓ | ✓ | ✓ | ✗ | ✓ |

---

## 3.4 Asset Management Module

| Screen | URL | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-----|:-----------:|:------------:|:----------:|:----------:|:------:|
| Assets List | `/assets` | ✓ All | ✓ Region | ✓ Branch | R Assigned | R Assigned |
| Asset Detail | `/assets/:id` | ✓ | ✓ | ✓ | R | R |
| Create Asset | `/assets/create` | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit Asset | `/assets/:id/edit` | ✓ | ✓ | ✓ | ✗ | ✗ |
| Delete Asset | - | ✓ | ✓ | ✗ | ✗ | ✗ |
| Asset Transfer | `/assets/:id/transfer` | ✓ | ✓ | Req | ✗ | ✗ |
| QR Code View | `/assets/:id/qr` | ✓ | ✓ | ✓ | ✓ | R |
| Depreciation | `/assets/:id/depreciation` | ✓ | ✓ | ✓ | ✗ | R |
| Maintenance History | `/assets/:id/history` | ✓ | ✓ | ✓ | R | R |

---

## 3.5 Maintenance Module

| Screen | URL | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-----|:-----------:|:------------:|:----------:|:----------:|:------:|
| Tickets List | `/maintenance` | ✓ All | ✓ Region | ✓ Branch | R Assigned | R Assigned |
| Ticket Detail | `/maintenance/:id` | ✓ | ✓ | ✓ | ✓ Own | R |
| Create Ticket | `/maintenance/create` | ✓ | ✓ | ✓ | ✓ | ✗ |
| Approval Queue | `/maintenance/approvals` | ✓ All | ✓ $5K | ✓ $500 | ✗ | ✗ |
| Assignment Screen | `/maintenance/:id/assign` | ✓ | ✓ | ✓ | ✗ | ✗ |
| Update Status | - | ✓ | ✓ | ✓ | ✓ Own | ✗ |
| Consume Parts | - | ✓ | ✓ | ✓ | ✓ Own | ✗ |
| Upload Photos | - | ✓ | ✓ | ✓ | ✓ Own | ✗ |
| Repair/Replace Calc | `/maintenance/calculator` | ✓ | ✓ | ✓ | ✗ | R |
| Maintenance Analytics | `/maintenance/analytics` | ✓ | ✓ | ✓ | ✗ | R |

---

## 3.6 Inventory Module - Products

| Screen | URL | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-----|:-----------:|:------------:|:----------:|:----------:|:------:|
| Product List | `/inventory/products` | ✓ All | ✓ Region | ✓ Branch | ✗ | R |
| Product Detail | `/inventory/products/:id` | ✓ | ✓ | ✓ | ✗ | R |
| Stock-In | `/inventory/products/stock-in` | ✓ | ✓ | ✓ | ✗ | ✗ |
| Stock-Out | `/inventory/products/stock-out` | ✓ | ✓ | ✓ | ✗ | ✗ |

---

## 3.7 Inventory Module - Spare Parts

| Screen | URL | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-----|:-----------:|:------------:|:----------:|:----------:|:------:|
| Spare Parts List | `/inventory/spares` | ✓ All | ✓ Region | ✓ Branch | R | R |
| Spare Part Detail | `/inventory/spares/:id` | ✓ | ✓ | ✓ | R | R |
| Stock-In | `/inventory/spares/stock-in` | ✓ | ✓ | ✓ | ✗ | ✗ |
| Consumption Log | `/inventory/consumption` | ✓ | ✓ | ✓ | ✓ Own | R |
| Low Stock Alerts | `/inventory/alerts` | ✓ | ✓ | ✓ | ✗ | R |
| Inventory Transfer | `/inventory/transfer` | ✓ | ✓ | Req | ✗ | ✗ |

---

## 3.8 Vendor Module

| Screen | URL | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-----|:-----------:|:------------:|:----------:|:----------:|:------:|
| Vendors List | `/vendors` | ✓ | ✓ | ✓ | ✗ | R |
| Vendor Detail | `/vendors/:id` | ✓ | ✓ | ✓ | ✗ | R |
| Create Vendor | `/vendors/create` | ✓ | ✓ | Req | ✗ | ✗ |
| Edit Vendor | `/vendors/:id/edit` | ✓ | ✓ | ✗ | ✗ | ✗ |
| Delete Vendor | - | ✓ | ✗ | ✗ | ✗ | ✗ |
| Reliability Dashboard | `/vendors/reliability` | ✓ | ✓ | ✓ | ✗ | R |
| Vendor Comparison | `/vendors/compare` | ✓ | ✓ | ✓ | ✗ | R |

---

## 3.9 Financial Module

| Screen | URL | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-----|:-----------:|:------------:|:----------:|:----------:|:------:|
| Transactions List | `/financial/transactions` | ✓ All | ✓ Region | ✓ Branch | ✗ | R Assigned |
| Transaction Detail | `/financial/:id` | ✓ | ✓ | ✓ | ✗ | R |
| Record Transaction | `/financial/create` | ✓ | ✓ | ✓ | ✗ | ✗ |
| OCR Scanner | `/financial/ocr` | ✓ | ✓ | ✓ | ✗ | ✗ |
| Currency Converter | `/financial/currency` | ✓ | ✓ | R | ✗ | R |
| Financial Reports | `/financial/reports` | ✓ All | ✓ Region | ✓ Branch | ✗ | R Assigned |
| Budget vs Actual | `/financial/budget` | ✓ All | ✓ Region | ✓ Branch | ✗ | R |

---

## 3.10 Organization Module

| Screen | URL | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-----|:-----------:|:------------:|:----------:|:----------:|:------:|
| Organizations List | `/organizations` | ✓ All | ✓ Region | ✓ Branch | ✗ | R |
| Organization Detail | `/organizations/:id` | ✓ | ✓ | ✓ | ✗ | R |
| Create Organization | `/organizations/create` | ✓ | ✗ | ✗ | ✗ | ✗ |
| Edit Organization | `/organizations/:id/edit` | ✓ | ✓ Region | ✓ Branch | ✗ | ✗ |
| Organization Settings | `/organizations/:id/settings` | ✓ | ✓ Region | ✓ Branch | ✗ | ✗ |
| Location Map | `/organizations/map` | ✓ | ✓ | ✓ | R | R |

---

## 3.11 User Management Module

| Screen | URL | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-----|:-----------:|:------------:|:----------:|:----------:|:------:|
| Users List | `/users` | ✓ All | ✓ Region | ✓ Branch | ✗ | ✗ |
| User Detail | `/users/:id` | ✓ | ✓ | ✓ | ✗ | ✗ |
| Create User | `/users/create` | ✓ Any Role | ✓ ≤ Branch Mgr | ✓ Technician | ✗ | ✗ |
| Edit User | `/users/:id/edit` | ✓ | ✓ Region | ✓ Branch | ✗ | ✗ |
| Delete User | - | ✓ | ✗ | ✗ | ✗ | ✗ |
| Reset Password | - | ✓ | ✓ Region | ✓ Branch | ✗ | ✗ |

---

## 3.12 Analytics Module

| Screen | URL | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-----|:-----------:|:------------:|:----------:|:----------:|:------:|
| Executive Analytics | `/analytics/executive` | ✓ | ✓ Region | ✓ Branch | ✗ | R Assigned |
| Asset Analytics | `/analytics/assets` | ✓ | ✓ | ✓ | ✗ | R |
| Maintenance Analytics | `/analytics/maintenance` | ✓ | ✓ | ✓ | ✗ | R |
| Inventory Analytics | `/analytics/inventory` | ✓ | ✓ | ✓ | ✗ | R |
| Financial Analytics | `/analytics/financial` | ✓ All | ✓ Region | ✓ Branch | ✗ | R Assigned |
| Report Builder | `/analytics/builder` | ✓ | ✓ | ✓ | ✗ | R |

---

## 3.13 Notifications Module

| Screen | URL | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-----|:-----------:|:------------:|:----------:|:----------:|:------:|
| Notifications Center | `/notifications` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notification Settings | `/settings/notifications` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Alert Configuration | `/admin/alerts` | ✓ | ✓ Region | ✗ | ✗ | ✗ |

---

## 3.14 Administration Module

| Screen | URL | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-----|:-----------:|:------------:|:----------:|:----------:|:------:|
| System Settings | `/admin/settings` | ✓ | ✗ | ✗ | ✗ | ✗ |
| Audit Logs | `/admin/audit` | ✓ All | ✓ Region | ✓ Branch | ✗ | R Assigned |
| Backup & Restore | `/admin/backup` | ✓ | ✗ | ✗ | ✗ | ✗ |
| API Documentation | `/admin/api` | ✓ | ✓ | R | ✗ | ✗ |

---

## 3.15 Profile Module

| Screen | URL | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-----|:-----------:|:------------:|:----------:|:----------:|:------:|
| User Profile | `/profile` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Account Settings | `/profile/settings` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Activity History | `/profile/activity` | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 3.16 Implementation Checklist

### Frontend Route Protection
- [ ] Wrap routes with `<RoleGuard>` component
- [ ] Hide navigation items based on role
- [ ] Disable buttons for unauthorized actions
- [ ] Show "Access Denied" page for direct URL access

### Backend API Protection
- [ ] Add `requireRole()` middleware to routes
- [ ] Filter data by organizational scope
- [ ] Validate approval limits in controllers
- [ ] Log access attempts in audit trail

### UI Indicators
- [ ] Show role badge in header
- [ ] Display scope indicator (Global/Regional/Branch)
- [ ] Show approval limits where relevant
- [ ] Indicate read-only mode for viewers
