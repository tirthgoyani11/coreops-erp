# Phase 01: System Overview & Architecture

## 1.1 Project Overview
**CorpOps ERP** is a multi-tenant, role-based enterprise resource planning system for:
- Asset lifecycle management
- Maintenance tracking & approvals
- Dual-stream inventory control
- Multi-currency financial management
- Vendor reliability scoring

## 1.2 Technology Stack

### Frontend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2+ | UI Framework |
| TypeScript | 5.0+ | Type Safety |
| Vite | 5.0+ | Build Tool |
| Tailwind CSS | 3.4+ | Styling |
| Shadcn UI | Latest | Component Library |
| Zustand | 4.0+ | State Management |
| React Router | 6.0+ | Navigation |
| Recharts | 2.0+ | Charts/Graphs |
| React Hook Form | 7.0+ | Form Handling |
| Zod | 3.0+ | Validation |
| Lucide React | Latest | Icons |

### Backend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 LTS | Runtime |
| Express | 4.18+ | Web Framework |
| MongoDB | 7.0+ | Database |
| Mongoose | 8.0+ | ODM |
| JWT | - | Authentication |
| Tesseract.js | 5.0+ | OCR |
| Nodemailer | 6.0+ | Email |
| Multer | 1.4+ | File Upload |

## 1.3 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    React Frontend (Vite)                     │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │ Zustand │ │ Router  │ │ Shadcn  │ │Recharts │           │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼ REST API (JWT Auth)
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVER LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 Node.js / Express Server                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │   Auth   │ │  Assets  │ │  Maint.  │ │Inventory │       │   │
│  │  │Controller│ │Controller│ │Controller│ │Controller│       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │ Vendors  │ │Financial │ │   OCR    │ │  Email   │       │   │
│  │  │Controller│ │Controller│ │ Service  │ │ Service  │       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼ Mongoose ODM
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    MongoDB Database                          │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │   │
│  │  │ Users  │ │ Assets │ │Tickets │ │Inventory│ │Vendors │    │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │   │
│  │  │Offices │ │  POs   │ │AuditLog│ │Notific.│               │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘               │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## 1.4 Core Modules (10)

| # | Module | Description | Key Features |
|---|--------|-------------|--------------|
| 1 | Authentication | User login, RBAC | JWT, Role guards |
| 2 | Assets | Asset lifecycle | GUAI, QR codes, Depreciation |
| 3 | Maintenance | Ticket management | Approvals, Assignments |
| 4 | Inventory | Stock control | Products + Spare Parts |
| 5 | Vendors | Supplier management | MTBF, Reliability scoring |
| 6 | Financial | Money management | Multi-currency, OCR |
| 7 | Analytics | Reporting | Dashboards, Custom reports |
| 8 | Organizations | Company structure | Hierarchy, Branches |
| 9 | Notifications | Alerts | Real-time, Email |
| 10 | Administration | System config | Settings, Audit, Backup |

## 1.5 Folder Structure

```
coreops-erp/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # Shadcn components
│   │   │   ├── layout/       # Header, Sidebar, MainLayout
│   │   │   └── dashboard/    # Dashboard widgets
│   │   ├── pages/            # Route pages (72 screens)
│   │   ├── stores/           # Zustand stores
│   │   ├── utils/            # Helpers, API client
│   │   ├── hooks/            # Custom hooks
│   │   └── types/            # TypeScript types
│   └── public/
├── backend/
│   └── src/
│       ├── controllers/      # Route handlers
│       ├── models/           # Mongoose schemas
│       ├── routes/           # Express routes
│       ├── middleware/       # Auth, RBAC guards
│       ├── services/         # OCR, Email, etc.
│       └── utils/            # Helpers
└── docs/
    └── phases/               # This documentation
```

## 1.6 Key Design Decisions

### GUAI System (Global Unique Asset Identifier)
Format: `{ORG}-{COUNTRY}-{CITY}-{CATEGORY}-{SEQUENCE}`
Example: `COR-USA-NYC-HVAC-0042`

### Dual-Stream Inventory
- **Products**: Revenue-generating items (sales)
- **Spare Parts**: Cost-center items (maintenance)

### Approval Hierarchy
- Super Admin: Unlimited
- Regional Manager: Up to $5,000
- Branch Manager: Up to $500
- Technician/Viewer: None

### Multi-Currency
- Base currency per organization
- Real-time conversion
- Historical rate tracking
