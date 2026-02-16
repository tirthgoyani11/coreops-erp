# 01: System Architecture — CoreOps ERP v3.0

> **Last Verified**: February 15, 2026 — All versions cross-checked against npm registry + actual `package.json`

## 1.1 Project Overview
**CoreOps ERP v3.0** is a next-generation, AI-powered enterprise resource planning system built for multi-tenant organizations. It manages the full business lifecycle: assets, maintenance, inventory, procurement, finance, HR, CRM, sales, manufacturing, and projects — all unified through a single modern interface with real-time collaboration and intelligent automation.

**Core Philosophy**: *"A powerful ERP that any person can use on day one."*

---

## 1.2 Technology Stack

### Frontend Stack (Currently Installed ✅ + Planned 🔲)
| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| React | ^19.2.0 | UI Framework | ✅ Installed |
| TypeScript | ~5.9.3 | Type Safety (TS 6 beta available) | ✅ Installed (dev) |
| Vite | ^7.2.4 | Build Tool (7.3.1 latest) | ✅ Installed |
| @vitejs/plugin-react | ^5.1.1 | React Fast Refresh for Vite | ✅ Installed (dev) |
| TailwindCSS | ^4.1.18 | Utility-first CSS | ✅ Installed |
| @tailwindcss/vite | ^4.1.18 | TailwindCSS Vite plugin | ✅ Installed |
| Shadcn/UI | Latest | Component Library (on Radix primitives) | ✅ Using |
| Zustand | ^5.0.10 | Global State (auth, theme, sidebar) | ✅ Installed |
| React Router | ^7.12.0 | Navigation | ✅ Installed |
| React Hook Form | ^7.71.1 | Form handling | ✅ Installed |
| Recharts | ^3.7.0 | Charts & graphs | ✅ Installed |
| Framer Motion | ^12.29.0 | Animations (12.34.0 latest) | ✅ Installed |
| Lucide React | ^0.562.0 | Icons (1,500+ icons) | ✅ Installed |
| Lottie React | ^2.4.1 | Lottie animations (login page) | ✅ Installed |
| Axios | ^1.13.2 | HTTP client | ✅ Installed |
| clsx | ^2.1.1 | Conditional class names | ✅ Installed |
| tailwind-merge | ^3.4.0 | Merge TW classes without conflict | ✅ Installed |
| html5-qrcode | ^2.3.8 | QR code scanning (camera) | ✅ Installed |
| jspdf | ^4.1.0 | Client PDF generation | ✅ Installed |
| jspdf-autotable | ^5.0.7 | PDF table generation | ✅ Installed |
| xlsx-js-style | ^1.2.0 | Excel export with styling | ✅ Installed |
| Three.js | ^0.182.0 | 3D rendering engine | ✅ Installed |
| @react-three/fiber | ^9.5.0 | React Three.js renderer | ✅ Installed |
| @react-three/drei | ^10.7.7 | R3F helpers & abstractions | ✅ Installed |
| GSAP | ^3.14.2 | Advanced animations | ✅ Installed |
| ESLint | ^9.39.1 | Linting + react-hooks/refresh plugins | ✅ Installed (dev) |
| **TanStack Query** | 5.x (5.90.21 latest) | Server state, caching, optimistic updates | 🔲 Phase 1 |
| **TanStack Table** | 8.x (8.21.3 latest) | Advanced data grids | 🔲 Phase 1 |
| **cmdk** | 1.x (1.1.1 latest) | Command palette (Ctrl+K) | 🔲 Phase 1 |
| **Zod** | 4.x (4.3.6 latest) | Schema validation (v4 stable) | 🔲 Phase 1 |
| **Socket.io-client** | 4.x (4.8.3 latest) | Real-time WebSocket | 🔲 Phase 1 |
| **@dnd-kit/core** | 6.x (6.3.1 latest) | Drag-and-drop (Kanban, dashboard) | 🔲 Phase 3 |
| **FullCalendar** | 6.x (6.1.20 latest) | Calendar views | 🔲 Phase 3 |
| **react-joyride** | 2.x (2.9.3 latest) | Guided onboarding tours | 🔲 Phase 3 |
| **i18next** | 25.x (25.8.7 latest) | Internationalization | 🔲 Phase 7 |
| **@react-pdf/renderer** | 4.x (4.3.2 latest) | Advanced PDF generation | 🔲 Phase 4 |

### Backend Stack (Currently Installed ✅ + Planned 🔲)
| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Node.js | **v25.0.0** (Current) | Runtime. Production rec: 22 LTS | ✅ Running |
| Express | ^5.2.1 | Web Framework (v5 — native async/await) | ✅ Installed |
| MongoDB | 7.0+ / 8.0 | Database (document store) | ✅ Installed |
| Mongoose | ^9.1.5 | ODM (9.2.1 latest) | ✅ Installed |
| bcrypt | ^6.0.0 | Password hashing (12 salt rounds) | ✅ Installed |
| jsonwebtoken | ^9.0.3 | JWT authentication tokens | ✅ Installed |
| helmet | ^8.1.0 | Security headers (CSP, HSTS, etc.) | ✅ Installed |
| express-rate-limit | ^8.2.1 | Rate limiting (100 req/15min) | ✅ Installed |
| cors | ^2.8.6 | CORS configuration | ✅ Installed |
| compression | ^1.8.1 | Response compression (gzip) | ✅ Installed |
| morgan | ^1.10.1 | HTTP request logging | ✅ Installed |
| winston | ^3.19.0 | Application logging (multi-transport) | ✅ Installed |
| express-validator | ^7.3.1 | Input validation middleware | ✅ Installed |
| express-request-id | ^3.0.0 | Request tracing (unique IDs) | ✅ Installed |
| multer | ^2.0.2 | File upload (multipart) | ✅ Installed |
| nodemailer | ^7.0.13 | Email service (SMTP) | ✅ Installed |
| qrcode | ^1.5.4 | QR code generation | ✅ Installed |
| tesseract.js | ^7.0.0 | OCR (invoice scanning) | ✅ Installed |
| uuid | ^13.0.0 | Unique ID generation | ✅ Installed |
| dotenv | ^17.2.3 | Environment variables | ✅ Installed |
| nodemon | ^3.1.11 | Dev server auto-restart | ✅ Installed (dev) |
| **Redis** | 8.x (8.6.0 latest) | Caching, pub/sub, sessions | 🔲 Phase 1 |
| **Socket.io** | 4.x (4.8.3 latest) | WebSocket server | 🔲 Phase 1 |
| **BullMQ** | 5.x (5.69.1 latest) | Background job queue | 🔲 Phase 1 |
| **@google/genai** | Latest | Gemini 2.5/3 AI SDK (predictions, NL) | 🔲 Phase 4 |
| **PDFKit** | 0.17+ (0.17.2 latest) | Server-side PDF generation | 🔲 Phase 2 |
| **ExcelJS** | 4.x (4.4.0 latest) | Excel export (server-side) | 🔲 Phase 2 |
| **Sharp** | 0.34+ (0.34.5 latest) | Image processing (thumbnails) | 🔲 Phase 2 |

> **Note**: "✅ Installed" means the package is in `package.json` today. "🔲 Phase X" means it will be added during that implementation phase.
> **Node.js Note**: Currently running v25.0.0 (Current). For production deployment, use Node.js 22 LTS (Maintenance until April 2027). Express 5 requires Node.js ≥ 18.

---

## 1.3 System Architecture v3.0

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │               React 19.2 Frontend (Vite 7 / TS 5.9)               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │  │
│  │  │ TanStack │ │ TanStack │ │  cmdk    │ │ Socket.io│             │  │
│  │  │  Query   │ │  Table   │ │ CmdBar   │ │  Client  │             │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │  │
│  │  │ Zustand  │ │ Shadcn   │ │ Recharts │ │ Framer   │             │  │
│  │  │  Store   │ │   UI     │ │ Charts   │ │ Motion   │             │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                          │  │
│  │  │ @dnd-kit │ │ FullCal  │ │ i18next  │                          │  │
│  │  │ Drag/Drop│ │ Calendar │ │  i18n    │                          │  │
│  │  └──────────┘ └──────────┘ └──────────┘                          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ REST API + WebSocket (JWT Auth)
┌─────────────────────────────────────────────────────────────────────────┐
│                          SERVER LAYER                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │            Node.js 22 LTS / Express 5 / Socket.io                  │  │
│  │                                                                    │  │
│  │  ┌──────────────────────────────────────────────────────────────┐ │  │
│  │  │ MIDDLEWARE: Auth → RBAC → RateLimit → Validate → Compress   │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  │                                                                    │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │  │
│  │  │  Auth   │ │ Assets  │ │ Maint.  │ │Inventory│ │ Vendor  │   │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │  │
│  │  │Finance  │ │   HR    │ │   CRM   │ │  Sales  │ │  Mfg    │   │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │  │
│  │  │Quality  │ │Projects │ │  Field  │ │  Docs   │ │CoreAI   │   │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │  │
│  │                                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ SERVICES: OCR │ Email │ PDF │ Excel │ AI │ Socket │ Queue │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                          │                    │
                          ▼                    ▼
┌─────────────────────────────┐  ┌──────────────────────────────────────┐
│       DATA LAYER            │  │         CACHE / QUEUE LAYER          │
│  ┌───────────────────────┐  │  │  ┌────────────┐  ┌───────────────┐  │
│  │  MongoDB 7+/8 Primary  │  │  │  │   Redis 8  │  │   BullMQ      │  │
│  │  Mongoose 9.x ODM     │  │  │  │  Cache     │  │  Job Queue    │  │
│  │  ┌──────┐ ┌──────┐   │  │  │  │  Sessions  │  │  - Emails     │  │
│  │  │Users │ │Assets│   │  │  │  │  Pub/Sub   │  │  - PDFs       │  │
│  │  │Office│ │Ticket│   │  │  │  │  Rate Limit│  │  - AI tasks   │  │
│  │  │Invent│ │Vendor│   │  │  │  └────────────┘  │  - Scheduled  │  │
│  │  │PO    │ │Trans │   │  │  │                   │  - Cron jobs  │  │
│  │  │Employ│ │Lead  │   │  │  │                   └───────────────┘  │
│  │  │Projec│ │Doc   │   │  │  │                                      │
│  │  │BOM   │ │Qualit│   │  │  └──────────────────────────────────────┘
│  │  └──────┘ └──────┘   │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
                │
                ▼
┌─────────────────────────────┐
│      EXTERNAL SERVICES      │
│  ┌────────┐  ┌────────┐    │
│  │ Gemini │  │ SMTP   │    │
│  │  AI    │  │ Email  │    │
│  └────────┘  └────────┘    │
└─────────────────────────────┘
```

---

## 1.4 Folder Structure v3.0

> Directories marked with ⭐ exist today. Others are created as their phase arrives.

```
coreops-erp/
├── frontend/                          ⭐
│   ├── src/                           ⭐
│   │   ├── components/                ⭐
│   │   │   ├── ui/                    ⭐ Shadcn components (Button, Input, etc.)
│   │   │   ├── layout/               ⭐ MainLayout, Sidebar, Header
│   │   │   ├── dashboard/            ⭐ Dashboard widgets (KPI cards, charts)
│   │   │   ├── shared/               🔲 Shared: ActivityTimeline, EntityHeader, etc.
│   │   │   ├── command-bar/          🔲 cmdk Command Bar components (Phase 1)
│   │   │   ├── kanban/               🔲 Kanban board components (Phase 3)
│   │   │   ├── calendar/             🔲 FullCalendar wrappers (Phase 3)
│   │   │   ├── forms/                🔲 Multi-step wizards, form builder (Phase 3)
│   │   │   └── data-table/           🔲 TanStack Table wrapper (Phase 1)
│   │   ├── pages/                     ⭐
│   │   │   ├── auth/                  🔲 Login, Register, ForgotPassword, 2FA
│   │   │   ├── dashboards/           ⭐ 4 role-specific dashboards
│   │   │   ├── assets/               🔲 9 asset screens (currently flat pages)
│   │   │   ├── maintenance/          🔲 8 maintenance screens
│   │   │   ├── inventory/            🔲 10 inventory screens
│   │   │   ├── procurement/          🔲 8 procurement screens
│   │   │   ├── financial/            🔲 8 financial screens (Phase 4)
│   │   │   ├── hr/                   🔲 6 HR screens (Phase 5)
│   │   │   ├── crm/                  🔲 5 CRM screens (Phase 5)
│   │   │   ├── sales/                🔲 4 sales screens (Phase 5)
│   │   │   ├── manufacturing/        🔲 4 manufacturing screens (Phase 6)
│   │   │   ├── quality/              🔲 3 quality screens (Phase 6)
│   │   │   ├── projects/             🔲 5 project screens (Phase 6)
│   │   │   ├── field-service/        🔲 4 field service screens (Phase 6)
│   │   │   ├── documents/            🔲 3 document screens (Phase 2)
│   │   │   ├── analytics/            🔲 6 analytics screens (Phase 2)
│   │   │   ├── communication/        🔲 3 communication screens (Phase 5)
│   │   │   ├── admin/                🔲 6 admin screens (Phase 7)
│   │   │   ├── profile/              🔲 3 profile screens (Phase 2)
│   │   │   └── ai/                   🔲 4 CoreAI screens (Phase 7)
│   │   ├── stores/                    ⭐ Zustand stores (auth, theme, sidebar)
│   │   ├── lib/                       ⭐ Utility library + Shadcn utils
│   │   ├── config/                    ⭐ App config
│   │   ├── types/                     ⭐ TypeScript types/interfaces
│   │   ├── utils/                     ⭐ Helpers, formatters, constants
│   │   ├── hooks/                     🔲 Custom hooks (useAuth, useSocket, useAI)
│   │   ├── services/                  🔲 TanStack Query API wrappers per module
│   │   └── i18n/                      🔲 Translations (en.json, hi.json) (Phase 7)
│   ├── public/                        ⭐
│   └── index.html                     ⭐
├── backend/                           ⭐
│   ├── server.js                      ⭐ Entry point
│   └── src/                           ⭐
│       ├── controllers/               ⭐ 9 controllers (auth, asset, vendor, etc.)
│       ├── models/                    ⭐ 12 Mongoose models (expand to 25+)
│       ├── routes/                    ⭐ 13 Express route files
│       ├── middleware/                ⭐ 5 middleware (auth, RBAC, validation, etc.)
│       ├── services/                  ⭐ 3 services (expand to 10+)
│       ├── utils/                     ⭐ 3 utility files
│       ├── config/                    ⭐ DB config (expand: Redis, Gemini, Email)
│       ├── jobs/                      🔲 BullMQ job processors (Phase 1)
│       └── sockets/                   🔲 Socket.io event handlers (Phase 1)
└── docs/
    ├── phases/                        ⭐ Original v1/v2 documentation (20 files)
    └── v3/                            ⭐ v3.0 documentation (this folder, 27 files)
```

### Current File Counts (as of Feb 15, 2026)
| Directory | Files | Notes |
|-----------|-------|-------|
| `frontend/src/pages/` | 22 `.tsx` files | Flat structure, will be reorganized into subfolders |
| `frontend/src/components/` | 3 subdirs + 3 files | ui/, layout/, dashboard/ |
| `backend/src/controllers/` | 9 files | Auth, Asset, Maintenance, Inventory, etc. |
| `backend/src/models/` | 12 files | User, Office, Asset, Ticket, Vendor, etc. |
| `backend/src/routes/` | 13 files | One per module + index |
| `backend/src/middleware/` | 5 files | Auth, RBAC, validation, error, upload |
| `backend/src/services/` | 3 files | Expand to OCR, AI, Email, PDF, etc. |

---

## 1.5 Environment Variables

### Backend `.env`
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/coreops

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=30d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Redis (Phase 1)
# REDIS_URL=redis://localhost:6379

# AI (Phase 4)
# GEMINI_API_KEY=your_gemini_api_key

# Frontend URL (CORS)
CLIENT_URL=http://localhost:5173
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
VITE_APP_NAME=CoreOps ERP
```

---

## 1.6 Key Design Decisions

### GUAI System (Unchanged)
Format: `{ORG}-{COUNTRY}-{CITY}-{CATEGORY}-{SEQUENCE}`
Example: `COR-USA-NYC-HVAC-0042`

### Real-Time Architecture (Phase 1)
- **Socket.io** for live updates (notifications, dashboard KPIs, ticket status changes)
- **Redis Pub/Sub** for multi-instance event broadcasting
- Events: `notification:new`, `ticket:updated`, `asset:transferred`, `kpi:refreshed`

### AI Architecture (Phase 4-7)
- **Google Gemini SDK** (`@google/genai`) — supports Gemini 2.5 Pro, Gemini 3 Flash, Gemini 3 Deep Think
- BullMQ queues for async AI tasks (predictions, summaries)
- Redis caching for AI responses (TTL-based)
- Pluggable architecture: can swap to OpenAI/Claude later via provider abstraction

### Approval Hierarchy (Enhanced)
| Role | Auto-Approve Limit | Needs Approval From |
|------|--------------------|---------------------|
| Super Admin | Unlimited | N/A |
| Regional Manager | Up to ₹5,000 | Super Admin |
| Branch Manager | Up to ₹500 | Regional Manager |
| Staff | ₹0 (request only) | Branch Manager |
| Technician | ₹0 (request only) | Branch Manager |
| Viewer | N/A (read-only) | N/A |

### Multi-Currency (Unchanged)
- Base currency per organization
- Real-time conversion
- Historical rate tracking

### Data Isolation
- All queries scoped by `organizationId`
- Role-based result filtering (RBAC middleware)
- Audit trail on every mutation

---

## 1.7 Error Handling Strategy

### Backend
| Layer | Strategy |
|-------|----------|
| **Controllers** | try/catch → pass to error middleware via `next(err)` |
| **Error Middleware** | Centralized: formats errors, logs via Winston, returns JSON |
| **Validation** | express-validator → 422 with field-level errors |
| **Auth** | 401 (unauthenticated), 403 (forbidden per RBAC) |
| **Not Found** | 404 with entity type and ID |
| **Rate Limit** | 429 with `Retry-After` header |
| **Server Error** | 500 → logs stack to Winston, returns safe message |

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### Frontend
- **Axios interceptor**: auto-refresh JWT on 401, redirect on 403
- **TanStack Query**: `onError` callbacks, retry logic (3 retries with exponential backoff)
- **Error Boundary**: catches React render errors → fallback UI
- **Toast notifications**: success (green), error (red), warning (yellow)

---

## 1.8 Logging Strategy

| Logger | Tool | Purpose |
|--------|------|---------|
| HTTP Requests | Morgan | Log method, URL, status, response time |
| Application | Winston | Info, warn, error with timestamps and context |
| Audit Trail | MongoDB (`AuditLog` model) | Who changed what, when, before/after values |
| Request Tracing | express-request-id | Unique ID per request for debugging |

### Log Levels
```
error  → System failures, unhandled exceptions
warn   → Deprecated usage, rate limit hits, failed logins
info   → Successful operations (CRUD, auth, payments)
debug  → Detailed diagnostic info (dev only)
```

---

## 1.9 Security Architecture

| Measure | Implementation |
|---------|----------------|
| **Authentication** | JWT access + refresh tokens |
| **Password** | bcrypt with 12 salt rounds |
| **Authorization** | RBAC middleware (6 roles) |
| **Headers** | Helmet (CSP, HSTS, X-Frame, etc.) |
| **Rate Limiting** | express-rate-limit (100 req/15min per IP) |
| **CORS** | Whitelist `CLIENT_URL` only |
| **Input Validation** | express-validator on all endpoints |
| **File Upload** | Multer with mime-type + size validation |
| **XSS Protection** | Sanitize inputs, Helmet headers |
| **CSRF** | Not needed (JWT, not cookies) |
| **SQL Injection** | N/A (MongoDB) — but sanitize queries |
| **Audit** | All mutations logged with user, IP, changes |

---

## 1.10 Deployment Architecture (Future)

```
┌──────────────┐
│   Cloudflare  │ ← CDN + DDoS protection
│    (DNS/CDN)  │
└──────┬───────┘
       │
┌──────▼───────┐     ┌──────────────┐
│  Frontend    │     │  Backend     │
│  (Vercel /   │────→│  (Railway /  │
│   Netlify)   │     │   Render)    │
└──────────────┘     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
       ┌──────▼──────┐ ┌───▼────┐ ┌──────▼──────┐
       │  MongoDB    │ │ Redis  │ │  File Store │
       │  Atlas      │ │ Cloud  │ │  (S3/R2)    │
       └─────────────┘ └────────┘ └─────────────┘
```

### Docker (Development)
```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    
  backend:
    build: ./backend
    ports: ["5000:5000"]
    env_file: ./backend/.env
    depends_on: [mongodb, redis]
    
  mongodb:
    image: mongo:8
    ports: ["27017:27017"]
    volumes: [mongo-data:/data/db]
    
  redis:
    image: redis:8-alpine
    ports: ["6379:6379"]

volumes:
  mongo-data:
```
