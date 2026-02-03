# CorpOps ERP - Complete Frontend Ecosystem Guide

**Version**: 2.0 | **Date**: February 2026 | **Status**: Production Ready

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [User Roles & Hierarchies](#3-user-roles--hierarchies)
4. [Complete Screen Inventory](#4-complete-screen-inventory-72-screens)
5. [Role-Based Access Control Matrix](#5-role-based-access-control-matrix)
6. [Dashboard Specifications](#6-dashboard-specifications)
7. [Navigation Structure](#7-navigation-structure)
8. [Detailed Screen Specifications](#8-detailed-screen-specifications)
9. [User Workflows](#9-user-workflows)
10. [UI/UX Guidelines](#10-uiux-guidelines)
11. [Component Library](#11-component-library)
12. [API Integration](#12-api-integration)
13. [Implementation Roadmap](#13-implementation-roadmap)

---

## 1. Executive Summary

### 1.1 Project Overview
CorpOps ERP is a multi-tenant, role-based enterprise resource planning system designed for asset management, maintenance tracking, inventory control, and financial oversight across distributed organizations.

### 1.2 Key Metrics
| Metric | Count | Notes |
|--------|-------|-------|
| Total Screens | 72 | Unique views across all modules |
| User Roles | 5 | Hierarchical permission levels |
| Core Modules | 10 | Integrated business functions |
| Dashboards | 5 | Role-specific variants |
| API Endpoints | 50+ | RESTful services |

### 1.3 Target Users
- **Enterprise Organizations** with multiple branches/locations
- **Asset-Heavy Industries** requiring tracking and maintenance
- **Multi-Currency Operations** with global financial management
- **Compliance-Focused Teams** needing audit trails

---

## 2. System Architecture

### 2.1 Technology Stack

#### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | 18.2+ |
| TypeScript | Type Safety | 5.0+ |
| Vite | Build Tool | 5.0+ |
| Tailwind CSS | Styling | 3.4+ |
| Shadcn UI | Component Library | Latest |
| Zustand | State Management | 4.0+ |
| React Router | Navigation | 6.0+ |
| Recharts | Data Visualization | 2.0+ |
| React Hook Form | Form Management | 7.0+ |
| Zod | Schema Validation | 3.0+ |

#### Backend
| Technology | Purpose | Version |
|------------|---------|---------|
| Node.js | Runtime | 20 LTS |
| Express | Web Framework | 4.18+ |
| MongoDB | Database | 7.0+ |
| Mongoose | ODM | 8.0+ |
| JWT | Authentication | - |
| Tesseract.js | OCR Processing | 5.0+ |
| Nodemailer | Email Service | 6.0+ |

### 2.2 Core Modules

```
┌─────────────────────────────────────────────────────────────────┐
│                    CorpOps ERP System                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Auth Module │  │   Assets    │  │ Maintenance │             │
│  │  (Login,    │  │ (GUAI, QR,  │  │ (Tickets,   │             │
│  │   RBAC)     │  │  Deprec.)   │  │  Approvals) │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Inventory  │  │   Vendors   │  │  Financial  │             │
│  │ (Products,  │  │ (MTBF,      │  │ (Multi-curr,│             │
│  │   Spares)   │  │  Scoring)   │  │    OCR)     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────┐ │
│  │ Organization│  │  Analytics  │  │Notifications│  │ Admin  │ │
│  │ (Hierarchy) │  │ (Reports)   │  │  (Alerts)   │  │(Audit) │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. User Roles & Hierarchies

### 3.1 Role Hierarchy Pyramid

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

### 3.2 Role Specifications

#### SUPER ADMIN (Level 1)
| Attribute | Value |
|-----------|-------|
| **Access Scope** | Global - All organizations, all branches |
| **Approval Authority** | Unlimited |
| **Financial Visibility** | All transactions, all currencies |
| **User Management** | Full CRUD for all users |

**Exclusive Capabilities:**
- System-wide configuration and settings
- Create/manage organizations and branches
- Exchange rate management
- Database backup and restore
- API key management
- Global alert configuration
- Audit log full access

**Dashboard Widgets:**
- Global Asset Value
- System Health Metrics
- All Pending Approvals
- User Activity Heatmap
- Multi-Region Comparison
- Currency Performance

---

#### REGIONAL MANAGER (Level 2)
| Attribute | Value |
|-----------|-------|
| **Access Scope** | Regional - Multiple assigned branches |
| **Approval Authority** | Up to $5,000 USD |
| **Financial Visibility** | Regional consolidated view |
| **User Management** | Create users within region |

**Key Capabilities:**
- Approve maintenance up to $5,000
- Manage inter-branch transfers
- Regional performance analytics
- Vendor evaluation and comparison
- Regional budget oversight
- Branch performance monitoring

**Dashboard Widgets:**
- Regional Asset Count
- Branch Comparison Chart
- Pending Approvals (< $5K)
- Regional Budget Status
- Critical Tickets Alert
- Cross-Branch Transfers

---

#### BRANCH MANAGER (Level 3)
| Attribute | Value |
|-----------|-------|
| **Access Scope** | Branch - Single location only |
| **Approval Authority** | Up to $500 USD |
| **Financial Visibility** | Branch transactions only |
| **User Management** | Create technicians for branch |

**Key Capabilities:**
- Approve maintenance up to $500
- Manage branch inventory
- Assign technicians to tickets
- Request asset transfers
- Branch financial tracking
- Local vendor coordination

**Dashboard Widgets:**
- Branch Asset Health
- Today's Tickets
- Approval Queue (< $500)
- Inventory Status
- MTD Expenses
- Technician Workload

---

#### TECHNICIAN (Level 4)
| Attribute | Value |
|-----------|-------|
| **Access Scope** | Assigned tasks and related assets only |
| **Approval Authority** | None |
| **Financial Visibility** | None |
| **User Management** | None |

**Key Capabilities:**
- Create maintenance tickets
- Update ticket status
- Consume spare parts
- Upload photos/documents
- Scan QR codes
- Close completed tickets

**Dashboard Widgets (Mobile-First):**
- My Open Tickets
- Today's Schedule
- Parts Availability
- Completed This Week

---

#### VIEWER/AUDITOR (Level 5)
| Attribute | Value |
|-----------|-------|
| **Access Scope** | Assigned data (read-only) |
| **Approval Authority** | None |
| **Financial Visibility** | As assigned (read-only) |
| **User Management** | None |

**Key Capabilities:**
- View assigned assets/tickets
- Generate audit reports
- Export data to CSV/Excel
- Review audit logs
- Compliance verification

**Dashboard Widgets:**
- Assets in Scope
- Recent Activities
- Transaction Summary
- Compliance Status

---

## 4. Complete Screen Inventory (72 Screens)

### 4.1 Authentication Module (5 Screens)

| # | Screen Name | URL | Description | All Roles |
|---|-------------|-----|-------------|-----------|
| 1 | Login | `/login` | Email/password authentication with remember me | ✓ |
| 2 | Forgot Password | `/forgot-password` | Email-based password recovery initiation | ✓ |
| 3 | Reset Password | `/reset-password/:token` | Token-validated password reset form | ✓ |
| 4 | Registration | `/register/:inviteToken` | Invitation-based user registration | ✓ |
| 5 | Setup Wizard | `/setup` | First-time organization configuration | Admin |

---

### 4.2 Dashboard Module (5 Screens)

| # | Screen Name | URL | Access | Key Widgets |
|---|-------------|-----|--------|-------------|
| 6 | Super Admin Dashboard | `/dashboard/admin` | Super Admin | 10 widgets, 4 charts |
| 7 | Regional Dashboard | `/dashboard/regional` | Regional+ | 8 widgets, 4 charts |
| 8 | Branch Dashboard | `/dashboard/branch` | Branch+ | 6 widgets, 4 charts |
| 9 | Technician Dashboard | `/dashboard/tech` | Technician | 4 widgets, mobile-first |
| 10 | Viewer Dashboard | `/dashboard/viewer` | Viewer | 4 widgets, read-only |

---

### 4.3 Asset Management Module (8 Screens)

| # | Screen Name | URL | Purpose |
|---|-------------|-----|---------|
| 11 | Assets List | `/assets` | Paginated list with filters, search, bulk actions |
| 12 | Asset Detail | `/assets/:id` | Tabbed view: Overview, History, Finance, Documents |
| 13 | Create Asset | `/assets/create` | Multi-step wizard with GUAI auto-generation |
| 14 | Edit Asset | `/assets/:id/edit` | Update form with change tracking |
| 15 | Asset Transfer | `/assets/:id/transfer` | Transfer workflow with approval chain |
| 16 | QR Code View | `/assets/:id/qr` | Generate, preview, print QR labels |
| 17 | Depreciation Calculator | `/assets/:id/depreciation` | Visual depreciation curves and projections |
| 18 | Maintenance History | `/assets/:id/history` | Timeline of all maintenance activities |

**Asset Detail Tabs:**
- **Overview Tab**: Basic info, location, specifications, assigned user
- **Maintenance Tab**: Ticket history timeline with photos
- **Financial Tab**: Purchase details, depreciation chart, total costs
- **Documents Tab**: Manuals, invoices, warranties, photos

---

### 4.4 Maintenance Module (7 Screens)

| # | Screen Name | URL | Purpose |
|---|-------------|-----|---------|
| 19 | Tickets List | `/maintenance` | List/Kanban/Calendar views with priority filtering |
| 20 | Ticket Detail | `/maintenance/:id` | Complete ticket hub with 6 tabs |
| 21 | Create Ticket | `/maintenance/create` | Quick creation with asset search/QR scan |
| 22 | Approval Queue | `/maintenance/approvals` | Manager's pending approval interface |
| 23 | Assignment Screen | `/maintenance/:id/assign` | Technician selection with workload view |
| 24 | Repair vs Replace | `/maintenance/calculator` | Algorithmic decision support tool |
| 25 | Maintenance Analytics | `/maintenance/analytics` | Cost trends, MTBF, efficiency metrics |

**Ticket Detail Tabs:**
- **Details**: Issue info, asset link, priority, assignment
- **Timeline**: Chronological activity log
- **Parts & Costs**: Consumed parts, labor hours, totals
- **Documents**: Before/after photos, receipts
- **Approvals**: Workflow status visualization
- **Comments**: Discussion thread with @mentions

---

### 4.5 Inventory Module (10 Screens)

#### Products (Revenue Stream)
| # | Screen Name | URL | Purpose |
|---|-------------|-----|---------|
| 26 | Product List | `/inventory/products` | Revenue products with stock levels |
| 27 | Product Detail | `/inventory/products/:id` | Full product information |
| 28 | Stock-In (Products) | `/inventory/products/stock-in` | Receive inventory with PO reference |
| 29 | Stock-Out (Products) | `/inventory/products/stock-out` | Record sales/dispatches |

#### Spare Parts (Cost Center)
| # | Screen Name | URL | Purpose |
|---|-------------|-----|---------|
| 30 | Spare Parts List | `/inventory/spares` | Maintenance parts inventory |
| 31 | Spare Part Detail | `/inventory/spares/:id` | Part specs, compatibility, vendor |
| 32 | Stock-In (Spares) | `/inventory/spares/stock-in` | Receive spare parts |
| 33 | Consumption Log | `/inventory/consumption` | Parts usage per ticket |
| 34 | Low Stock Alerts | `/inventory/alerts` | Items below reorder threshold |
| 35 | Inventory Transfer | `/inventory/transfer` | Inter-location transfer request |

---

### 4.6 Vendor Module (5 Screens)

| # | Screen Name | URL | Purpose |
|---|-------------|-----|---------|
| 36 | Vendors List | `/vendors` | All vendors with reliability scores |
| 37 | Vendor Detail | `/vendors/:id` | Profile, performance, transaction history |
| 38 | Create Vendor | `/vendors/create` | New vendor registration form |
| 39 | Reliability Dashboard | `/vendors/reliability` | MTBF analytics, failure rates |
| 40 | Vendor Comparison | `/vendors/compare` | Side-by-side evaluation tool |

---

### 4.7 Financial Module (7 Screens)

| # | Screen Name | URL | Purpose |
|---|-------------|-----|---------|
| 41 | Transactions List | `/financial/transactions` | Multi-currency ledger with filtering |
| 42 | Transaction Detail | `/financial/:id` | Full transaction with documents |
| 43 | Record Transaction | `/financial/create` | Manual transaction entry |
| 44 | OCR Scanner | `/financial/ocr` | Invoice scanning with Tesseract.js |
| 45 | Currency Converter | `/financial/currency` | Real-time conversion rates |
| 46 | Financial Reports | `/financial/reports` | Charts, summaries, exports |
| 47 | Budget vs Actual | `/financial/budget` | Variance analysis with alerts |

---

### 4.8 Organization Module (5 Screens)

| # | Screen Name | URL | Purpose |
|---|-------------|-----|---------|
| 48 | Organizations List | `/organizations` | Hierarchical tree view |
| 49 | Organization Detail | `/organizations/:id` | Branch info, stats, settings |
| 50 | Create Organization | `/organizations/create` | New branch setup wizard |
| 51 | Organization Settings | `/organizations/:id/settings` | Thresholds, approvals config |
| 52 | Location Map | `/organizations/map` | Geographic visualization |

---

### 4.9 User Management Module (4 Screens)

| # | Screen Name | URL | Purpose |
|---|-------------|-----|---------|
| 53 | Users List | `/users` | All users with role filtering |
| 54 | User Detail | `/users/:id` | Profile, permissions, activity |
| 55 | Create User | `/users/create` | New user with role assignment |
| 56 | Edit User | `/users/:id/edit` | Update user details |

---

### 4.10 Analytics Module (6 Screens)

| # | Screen Name | URL | Purpose |
|---|-------------|-----|---------|
| 57 | Executive Analytics | `/analytics/executive` | High-level KPIs for leadership |
| 58 | Asset Analytics | `/analytics/assets` | Asset metrics, lifecycle analysis |
| 59 | Maintenance Analytics | `/analytics/maintenance` | Repair trends, cost analysis |
| 60 | Inventory Analytics | `/analytics/inventory` | Turnover, stock health |
| 61 | Financial Analytics | `/analytics/financial` | Revenue/expense trends |
| 62 | Report Builder | `/analytics/builder` | Custom report creation |

---

### 4.11 Notifications Module (3 Screens)

| # | Screen Name | URL | Purpose |
|---|-------------|-----|---------|
| 63 | Notifications Center | `/notifications` | Inbox with real-time updates |
| 64 | Notification Settings | `/settings/notifications` | User alert preferences |
| 65 | Alert Configuration | `/admin/alerts` | System-wide alert rules |

---

### 4.12 Administration Module (4 Screens)

| # | Screen Name | URL | Purpose |
|---|-------------|-----|---------|
| 66 | System Settings | `/admin/settings` | Global configuration |
| 67 | Audit Logs | `/admin/audit` | Activity tracking and compliance |
| 68 | Backup & Restore | `/admin/backup` | Database management |
| 69 | API Documentation | `/admin/api` | Swagger/OpenAPI docs |

---

### 4.13 Profile Module (3 Screens)

| # | Screen Name | URL | Purpose |
|---|-------------|-----|---------|
| 70 | User Profile | `/profile` | Personal information |
| 71 | Account Settings | `/profile/settings` | Security, preferences |
| 72 | Activity History | `/profile/activity` | Personal action log |

---

## 5. Role-Based Access Control Matrix

### Legend
| Symbol | Meaning |
|--------|---------|
| ✓ | Full access (CRUD) |
| R | Read-only |
| C | Create only |
| $X | Conditional (up to limit) |
| Req | Can request (needs approval) |
| Own | Own records only |
| ✗ | No access |

### Complete RBAC Matrix

| Screen | Super Admin | Regional Mgr | Branch Mgr | Technician | Viewer |
|--------|-------------|--------------|------------|------------|--------|
| **AUTHENTICATION** |||||
| Login | ✓ | ✓ | ✓ | ✓ | ✓ |
| Password Reset | ✓ | ✓ | ✓ | ✓ | ✓ |
| **DASHBOARDS** |||||
| Super Admin Dashboard | ✓ | ✗ | ✗ | ✗ | ✗ |
| Regional Dashboard | ✓ | ✓ | ✗ | ✗ | ✗ |
| Branch Dashboard | ✓ | ✓ | ✓ | ✗ | ✗ |
| Technician Dashboard | ✓ | ✓ | ✓ | ✓ | ✗ |
| Viewer Dashboard | ✓ | ✓ | ✓ | ✗ | ✓ |
| **ASSETS** |||||
| Assets List | ✓ All | ✓ Region | ✓ Branch | R Assigned | R Assigned |
| Asset Detail | ✓ | ✓ | ✓ | R | R |
| Create Asset | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit Asset | ✓ | ✓ | ✓ | ✗ | ✗ |
| Transfer Asset | ✓ | ✓ | Req | ✗ | ✗ |
| QR Code View | ✓ | ✓ | ✓ | ✓ | R |
| Depreciation | ✓ | ✓ | ✓ | ✗ | R |
| **MAINTENANCE** |||||
| Tickets List | ✓ All | ✓ Region | ✓ Branch | R Assigned | R Assigned |
| Ticket Detail | ✓ | ✓ | ✓ | ✓ Own | R |
| Create Ticket | ✓ | ✓ | ✓ | ✓ | ✗ |
| Approve Ticket | ✓ All | $5000 | $500 | ✗ | ✗ |
| Assign Technician | ✓ | ✓ | ✓ | ✗ | ✗ |
| Repair/Replace Calc | ✓ | ✓ | ✓ | ✗ | R |
| **INVENTORY** |||||
| Products List | ✓ All | ✓ Region | ✓ Branch | ✗ | R |
| Stock-In/Out | ✓ | ✓ | ✓ | ✗ | ✗ |
| Spare Parts List | ✓ All | ✓ Region | ✓ Branch | R | R |
| Consume Parts | ✓ | ✓ | ✓ | ✓ Own | ✗ |
| Low Stock Alerts | ✓ | ✓ | ✓ | ✗ | R |
| **VENDORS** |||||
| Vendors List | ✓ | ✓ | ✓ | ✗ | R |
| Create Vendor | ✓ | ✓ | Req | ✗ | ✗ |
| Reliability Dashboard | ✓ | ✓ | ✓ | ✗ | R |
| **FINANCIAL** |||||
| Transactions | ✓ All | ✓ Region | ✓ Branch | ✗ | R Assigned |
| Record Transaction | ✓ | ✓ | ✓ | ✗ | ✗ |
| OCR Scanner | ✓ | ✓ | ✓ | ✗ | ✗ |
| Budget vs Actual | ✓ | ✓ | ✓ | ✗ | R |
| **ORGANIZATION** |||||
| Organizations List | ✓ All | ✓ Region | ✓ Branch | ✗ | R |
| Create Organization | ✓ | ✗ | ✗ | ✗ | ✗ |
| Organization Settings | ✓ | ✓ Region | ✓ Branch | ✗ | ✗ |
| **USERS** |||||
| Users List | ✓ All | ✓ Region | ✓ Branch | ✗ | ✗ |
| Create User | ✓ | ✓ Region | ✓ Branch | ✗ | ✗ |
| Edit User | ✓ | ✓ Region | ✓ Branch | ✗ | ✗ |
| **ANALYTICS** |||||
| All Analytics | ✓ | ✓ | ✓ | ✗ | R |
| Report Builder | ✓ | ✓ | ✓ | ✗ | R |
| **ADMINISTRATION** |||||
| System Settings | ✓ | ✗ | ✗ | ✗ | ✗ |
| Audit Logs | ✓ All | ✓ Region | ✓ Branch | ✗ | R Assigned |
| Backup/Restore | ✓ | ✗ | ✗ | ✗ | ✗ |
| **PROFILE** |||||
| Own Profile | ✓ | ✓ | ✓ | ✓ | ✓ |
| Activity History | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 6. Dashboard Specifications

### 6.1 Super Admin Dashboard

**Layout**: 12-column grid, 3 rows

**Row 1 - Key Metrics (4 cards)**:
| Widget | Data | Style |
|--------|------|-------|
| Global Asset Value | Sum of all assets | Currency, large |
| Active Tickets | Open + In Progress | Count, trend arrow |
| Pending Approvals | All pending | Count, urgent color |
| System Health | Uptime, DB status | Percentage, green/red |

**Row 2 - Charts (3 charts)**:
| Chart | Type | Data |
|-------|------|------|
| Asset Distribution | Pie | By region/location |
| Monthly Costs Trend | Line | 12-month history |
| Inventory Turnover | Bar | By category |

**Row 3 - Tables & Actions**:
| Component | Content |
|-----------|---------|
| Recent Audit Log | Last 10 actions with timestamp |
| Quick Actions | Create Org, Add User, Backup, Report |

---

### 6.2 Branch Manager Dashboard

**Layout**: Compact, 6 widgets + 4 charts

**Widgets**:
1. **Asset Health**: Operational vs Under Maintenance (donut mini)
2. **Today's Tickets**: New and in-progress count
3. **Approval Queue**: Tickets under $500 awaiting
4. **Inventory Status**: Low stock count
5. **MTD Expenses**: Current vs budget
6. **Technician Status**: Available vs busy

**Charts**:
| Chart | Type | Purpose |
|-------|------|---------|
| 7-Day Ticket Volume | Area | Daily trend |
| Expense Breakdown | Pie | By category |
| Asset Depreciation | Bar | Next 12 months |
| Parts Consumption | Horizontal Bar | Top 10 parts |

---

### 6.3 Technician Dashboard (Mobile-First)

**Design**: Single column, large touch targets (min 44px)

**Components**:
```
┌─────────────────────────────┐
│  My Open Tickets: 4         │  ← Metric Card
├─────────────────────────────┤
│  PRIORITY QUEUE             │
│  ┌─────────────────────────┐│
│  │ 🔴 HVAC Unit Failure    ││  ← Ticket Card
│  │    Building A, Floor 2  ││
│  │    Est: 2 hours         ││
│  │    [START WORK]         ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │ 🟡 Printer Maintenance  ││
│  │    Office 201           ││
│  │    [VIEW DETAILS]       ││
│  └─────────────────────────┘│
├─────────────────────────────┤
│  [📷 SCAN QR] [➕ NEW TICKET]│  ← Action Buttons
└─────────────────────────────┘
```

---

## 7. Navigation Structure

### 7.1 Super Admin Sidebar
```
📊 Dashboard
📦 Assets
   ├─ All Assets
   ├─ Add Asset
   ├─ Transfers
   └─ QR Codes
🔧 Maintenance
   ├─ All Tickets
   ├─ Approvals
   └─ Analytics
📊 Inventory
   ├─ Products
   └─ Spare Parts
🏢 Vendors
💰 Financial
   ├─ Transactions
   ├─ OCR Scanner
   └─ Reports
🏛️ Organizations
👥 Users
📈 Analytics
⚙️ Settings
   ├─ System
   ├─ Audit Logs
   └─ Backups
```

### 7.2 Technician Sidebar (Simplified)
```
📊 My Dashboard
🎫 My Tickets
   ├─ Assigned
   ├─ In Progress
   └─ Completed
📦 View Assets
🔧 Create Ticket
📦 Parts Catalog
🔔 Notifications
```

---

## 8. Detailed Screen Specifications

### 8.1 Asset Detail View (Screen 12)

**URL**: `/assets/:id`

**Header Section**:
```
┌──────────────────────────────────────────────────────────────┐
│  [QR Code]  Asset Name: Industrial HVAC Unit                │
│             GUAI: COR-USA-NYC-HVAC-0042                      │
│             Status: [🟢 Active]                              │
│                                                              │
│  [Edit] [Transfer] [Print QR] [Delete]                      │
└──────────────────────────────────────────────────────────────┘
```

**Tab Navigation**: Overview | Maintenance | Financial | Documents

**Overview Tab Content**:
| Field | Example Value |
|-------|---------------|
| Category | HVAC Equipment |
| Manufacturer | Carrier |
| Model | 48XL |
| Serial Number | XL2024-00123 |
| Location | Building A, Floor 2 |
| Branch | NYC Office |
| Purchase Date | Jan 15, 2024 |
| Warranty Expiry | Jan 15, 2029 |
| Current Value | $12,450 |
| Assigned To | John Smith |

---

### 8.2 Ticket Detail View (Screen 20)

**URL**: `/maintenance/:id`

**Header**:
```
Ticket #MT-2024-0789    [🔴 Critical]    Status: In Progress
Asset: Industrial HVAC Unit (COR-USA-NYC-HVAC-0042)
```

**Tabs**: Details | Timeline | Parts | Documents | Approvals | Comments

**Timeline Tab Example**:
```
● Feb 3, 2026 - 10:42 AM
  Ticket created by Sarah Johnson
  Priority: Critical | Est. Cost: $850

● Feb 3, 2026 - 10:45 AM
  Assigned to Mike Chen (Technician)

● Feb 3, 2026 - 11:00 AM
  Work started | Timer: 00:00

● Feb 3, 2026 - 12:30 PM
  Parts consumed: Compressor Belt x1 ($45)

● Feb 3, 2026 - 02:15 PM
  Photos uploaded: before.jpg, after.jpg

● Feb 3, 2026 - 02:30 PM
  Marked as Completed
  Total Time: 3h 30m | Total Cost: $395
```

---

### 8.3 OCR Invoice Scanner (Screen 44)

**URL**: `/financial/ocr`

**Process Flow**:
```
Step 1: Upload          Step 2: Processing      Step 3: Review
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │ Vendor: ABC Co  │
│  Drag & Drop    │ --> │  ████████ 75%   │ --> │ Date: 02/03/26  │
│  Invoice Here   │     │  Processing...  │     │ Amount: $1,234  │
│                 │     │                 │     │ Invoice#: INV-89│
│  [Browse Files] │     │                 │     │ [Edit] [Confirm]│
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Extracted Fields**:
- Vendor Name (auto-matched to existing vendors)
- Invoice Date
- Invoice Number
- Line Items (if detectable)
- Total Amount
- Currency

---

## 9. User Workflows

### 9.1 Maintenance Request Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Technician │     │   Branch    │     │  Technician │
│  Discovers  │ --> │   Manager   │ --> │   Assigned  │
│   Issue     │     │  Approves   │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
┌─────────────┐     ┌─────────────┐     ┌──────┴──────┐
│   Ticket    │     │  Technician │     │    Work     │
│   Closed    │ <-- │  Completes  │ <-- │   Started   │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

**States**: Open → Approved → In Progress → Completed → Closed

---

### 9.2 Asset Transfer Workflow

```
1. Branch Manager initiates transfer request
2. System checks if approval required (based on value)
3. If required: Regional Manager approves
4. Asset status → "In Transit"
5. Destination branch confirms receipt
6. GUAI location code updated
7. Audit log entry created
```

---

### 9.3 Low Stock Alert Flow

```
1. System detects item below reorder threshold
2. Alert created → Dashboard widget + Notification
3. Manager reviews and creates Purchase Order
4. Vendor delivers items
5. Manager performs Stock-In with OCR invoice scan
6. Inventory updated, alert cleared
7. Financial transaction recorded
```

---

## 10. UI/UX Guidelines

### 10.1 Color Palette

| Purpose | Color | Hex | Usage |
|---------|-------|-----|-------|
| Primary | Blue | `#1E40AF` | Buttons, links, headers |
| Success | Green | `#10B981` | Approvals, completed |
| Warning | Amber | `#F59E0B` | Pending, low stock |
| Danger | Red | `#EF4444` | Errors, critical, delete |
| Info | Sky | `#0EA5E9` | Informational |
| Background | Slate | `#F8FAFC` | Page background |
| Card | White | `#FFFFFF` | Card backgrounds |
| Text Primary | Slate | `#0F172A` | Main text |
| Text Secondary | Slate | `#64748B` | Descriptions |

### 10.2 Status Badges

| Status | Background | Text | Example Use |
|--------|------------|------|-------------|
| Active | `bg-green-100` | `text-green-800` | Active assets |
| Pending | `bg-yellow-100` | `text-yellow-800` | Awaiting approval |
| In Progress | `bg-blue-100` | `text-blue-800` | Active work |
| Completed | `bg-green-100` | `text-green-800` | Finished tickets |
| Rejected | `bg-red-100` | `text-red-800` | Denied requests |
| Critical | `bg-red-600` | `text-white` | Urgent priority |

### 10.3 Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| H1 | Inter | 32px | 700 |
| H2 | Inter | 24px | 600 |
| H3 | Inter | 20px | 600 |
| Body | Inter | 16px | 400 |
| Small | Inter | 14px | 400 |
| Caption | Inter | 12px | 400 |
| Monospace | JetBrains Mono | 14px | 400 |

### 10.4 Responsive Breakpoints

| Breakpoint | Width | Target | Layout |
|------------|-------|--------|--------|
| Mobile | < 640px | Phones | Single column |
| Tablet | 640-1024px | Tablets | 2 columns |
| Desktop | > 1024px | Desktop | Full sidebar |

---

## 11. Component Library

### 11.1 Core Components

| Component | Source | Usage |
|-----------|--------|-------|
| Button | Shadcn | Primary, Secondary, Ghost, Danger |
| Input | Shadcn | Text, Email, Password, Search |
| Select | Shadcn | Single, Multi-select |
| Table | Shadcn | Sortable, Paginated |
| Card | Shadcn | Content containers |
| Dialog | Shadcn | Modals, Confirmations |
| Toast | Shadcn | Notifications |
| Tabs | Shadcn | Content organization |
| Badge | Shadcn | Status indicators |
| Avatar | Shadcn | User images |

### 11.2 Custom Components

| Component | Purpose |
|-----------|---------|
| `<AssetCard>` | Asset display in grid view |
| `<TicketCard>` | Ticket display in Kanban |
| `<DashboardWidget>` | Metric display card |
| `<StatusBadge>` | Colored status indicator |
| `<QRGenerator>` | QR code creation/display |
| `<FileUpload>` | Drag-drop file upload |
| `<ApprovalBadge>` | Approval workflow status |

---

## 12. API Integration

### 12.1 Key Endpoints

| Resource | Method | Endpoint | Purpose |
|----------|--------|----------|---------|
| Auth | POST | `/api/auth/login` | User login |
| Auth | POST | `/api/auth/refresh` | Token refresh |
| Assets | GET | `/api/assets` | List assets |
| Assets | POST | `/api/assets` | Create asset |
| Assets | GET | `/api/assets/:id` | Get asset |
| Assets | PUT | `/api/assets/:id` | Update asset |
| Maintenance | GET | `/api/maintenance` | List tickets |
| Maintenance | POST | `/api/maintenance` | Create ticket |
| Maintenance | PATCH | `/api/maintenance/:id/approve` | Approve |
| Inventory | GET | `/api/inventory` | List inventory |
| Inventory | POST | `/api/inventory/stock-in` | Add stock |
| OCR | POST | `/api/ocr/scan` | Scan invoice |
| Audit | GET | `/api/audit-logs` | Get logs |

### 12.2 Response Format
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

---

## 13. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4) ✅
- [x] Authentication system
- [x] User management
- [x] Basic asset CRUD
- [x] Role-based access

### Phase 2: Operations (Weeks 5-8) ✅
- [x] Maintenance tickets
- [x] Approval workflows
- [x] Inventory management
- [x] Parts consumption

### Phase 3: Analytics (Weeks 9-12) ✅
- [x] Role-specific dashboards
- [x] Charts and metrics
- [x] Report generation
- [x] UI polish

### Phase 4: Advanced (Weeks 13-16) ✅
- [x] OCR invoice scanning
- [x] Email notifications
- [x] PDF/Excel exports
- [x] Audit logging
- [x] Dark mode

### Future Enhancements
- [ ] Mobile app (React Native)
- [ ] Barcode scanning
- [ ] Predictive maintenance
- [ ] Advanced analytics (ML)
- [ ] Multi-language support

---

## Quick Reference Cards

### Keyboard Shortcuts
| Action | Shortcut |
|--------|----------|
| Global Search | `Ctrl+K` |
| New Asset | `Ctrl+Shift+A` |
| New Ticket | `Ctrl+Shift+T` |
| Save | `Ctrl+S` |
| Cancel | `Escape` |

### Common Colors
```css
--primary: #1E40AF;
--success: #10B981;
--warning: #F59E0B;
--danger: #EF4444;
--background: #F8FAFC;
```

### Status Flow
```
Asset: Active → Under Maintenance → Active/Decommissioned
Ticket: Open → Approved → In Progress → Completed → Closed
Transfer: Requested → Approved → In Transit → Received
```

---

*End of Document - CorpOps ERP Frontend Ecosystem Guide v2.0*
*Total Screens: 72 | Roles: 5 | Modules: 10*
