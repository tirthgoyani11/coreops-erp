<p align="center">
  <img src="https://img.shields.io/badge/CoreOps-ERP-B9FF66?style=for-the-badge&logoColor=black" alt="CoreOps ERP"/>
</p>

<h1 align="center">CoreOps ERP</h1>

<p align="center">
  <strong>AI-Powered Enterprise Resource Planning & Intelligent Operations Suite</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js" alt="Node.js"/>
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat-square&logo=postgresql" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Prisma-7.4-2D3748?style=flat-square&logo=prisma" alt="Prisma"/>
  <img src="https://img.shields.io/badge/Express-5.2-000000?style=flat-square&logo=express" alt="Express"/>
  <img src="https://img.shields.io/badge/Socket.IO-4.8-010101?style=flat-square&logo=socketdotio" alt="Socket.IO"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-B9FF66?style=flat-square" alt="License"/>
  <img src="https://img.shields.io/badge/Version-2.0.0-B9FF66?style=flat-square" alt="Version"/>
  <img src="https://img.shields.io/badge/API_Routes-20_Modules-B9FF66?style=flat-square" alt="API Routes"/>
  <img src="https://img.shields.io/badge/Pages-40+-B9FF66?style=flat-square" alt="Pages"/>
  <img src="https://img.shields.io/badge/Roles-6-B9FF66?style=flat-square" alt="Roles"/>
  <img src="https://img.shields.io/badge/AI-Opus_1.0-B9FF66?style=flat-square" alt="AI"/>
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [OpsPilot AI Engine](#-opspilot-ai-engine)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Modules](#-modules)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [User Roles & RBAC](#-user-roles--rbac)
- [Real-Time Features](#-real-time-features)
- [Design System](#-design-system)
- [Deployment](#-deployment)
- [Documentation](#-documentation)
- [Authors](#-authors)
- [License](#-license)

---

## 🎯 Overview

**CoreOps ERP** is a full-stack enterprise resource planning system with **AI at its core** — not bolted on as an afterthought. It manages assets, maintenance, inventory, procurement, vendors, finances, users, offices, documents, and analytics across multi-location organizations.

The system features **OpsPilot**, an AI-powered conversational assistant that can execute real ERP operations — creating assets, generating purchase orders, pulling financial reports, and more — through natural language commands.

### What Makes CoreOps Different?

| Feature | Traditional ERP | CoreOps ERP |
|---------|----------------|-------------|
| AI Integration | Chatbot overlay | **OpsPilot: AI executes real operations** |
| Asset Creation | Manual form filling | **Smart auto-fill from product knowledge base** |
| Inventory | Single stream | **Dual-stream (Products + Spares)** |
| Asset Tracking | Basic IDs | **GUAI (Global Unique Asset ID) + QR** |
| Vendor Selection | Price-based | **MTBF Reliability Scoring** |
| Invoices | Manual entry | **OCR Auto-extraction (Tesseract.js)** |
| Multi-Currency | Basic conversion | **Real-time normalization** |
| Notifications | Polling | **Socket.IO real-time push** |

---

## ✨ Key Features

### 🖥️ Asset Management
- **GUAI System**: globally unique asset identifiers
- Multi-location asset tracking with transfer workflows
- QR code generation and scanning (`html5-qrcode`)
- Depreciation calculators (Straight-line, Declining Balance)
- Full maintenance history per asset
- Smart auto-fill: AI infers manufacturer, model, serial number, warranty from asset name

### 🔧 Maintenance Management (CMMS)
- Ticket lifecycle: Requested → Approved → In Progress → Completed
- Kanban, List, and Calendar views
- Technician assignment and work logging
- Spare parts consumption tracking
- Preventive maintenance scheduling

### 📦 Dual-Stream Inventory
- **Products**: revenue-generating items for sale
- **Spare Parts**: cost-consuming parts for maintenance
- Low stock alerts and reorder point automation
- Stock movements (IN, OUT, TRANSFER, ADJUSTMENT)
- SKU auto-generation

### 🏢 Vendor & Procurement
- Vendor scoring with MTBF reliability metrics
- Purchase order lifecycle (create → approve → receive → close)
- 3-way matching: PO ↔ Invoice ↔ Goods Receipt
- OCR invoice scanning with Tesseract.js

### 💰 Financial Management
- Income/Expense transaction tracking
- Budget vs. Actual with variance analysis
- General Ledger with Chart of Accounts
- P&L, Cash Flow, and Balance Sheet reports
- Multi-currency support with real-time exchange rates
- PDF and Excel report export (`jsPDF`, `xlsx-js-style`)

### 📊 Analytics & Dashboards
- Role-based dashboards with KPIs
- Asset distribution by category, status, and location
- Financial trends (Recharts)
- Maintenance analytics & ticket insights
- 3D holographic globe visualization (Three.js)

### 🔐 Security & Access Control
- JWT authentication with refresh token rotation
- 6-tier Role-Based Access Control (RBAC)
- Audit logging for every CRUD operation
- Helmet security headers, CORS, rate limiting
- Input validation (express-validator)

### 🔔 Real-Time Notifications
- Socket.IO push notifications
- In-app notification center with read/unread tracking
- Notification preferences (email + in-app)
- Office-level broadcasting

---

## 🤖 OpsPilot AI Engine

OpsPilot is the built-in AI assistant that **executes real ERP operations** through natural language.

### Architecture: "LLM Thinks, Code Executes"

```
User Message
    │
    ▼ Sub-1ms
┌─────────────────────┐
│ Local Keyword        │ ── 40+ intent patterns ──▶ Deterministic routing
│ Classifier           │
└─────────────────────┘
    │ Ambiguous?
    ▼
┌─────────────────────┐
│ LLM Intent           │ ── Opus 1.0 → Kaggle → Ollama → Fallback
│ Classifier           │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Entity Extraction    │ ── Amount, names, categories, priorities
└─────────────────────┘
    │
    ├── ACTION intents ──▶ agentExecutor.js (Prisma queries, zero LLM)
    │
    └── QUERY intents  ──▶ Live ERP snapshot → LLM synthesis
```

### Supported Operations (38+ Handlers)

| Category | Commands |
|----------|----------|
| **Assets** | Create, update, list assets with smart auto-fill |
| **Inventory** | Create items, refill stock, list inventory |
| **Purchase Orders** | Create, approve, reject POs |
| **Maintenance** | Create, update, close tickets |
| **Vendors** | Create, list vendors |
| **Finance** | Record transactions, set budgets, P&L, Cash Flow, Balance Sheet |
| **General Ledger** | List and create GL accounts |
| **Notifications** | List and send/broadcast notifications |
| **Organizations** | List and create offices/branches |
| **Users** | List team members |
| **Documents** | List uploaded documents |
| **Analytics** | KPIs, asset stats, expense breakdown |
| **Profile** | View current user profile |
| **Audit** | View recent audit logs |
| **Dashboard** | Full system summary |

### AI Provider Chain (4-Tier Fallback)

| Priority | Provider | Model | Latency |
|----------|----------|-------|---------|
| 1 | NVIDIA NIM | Kimi K2.5 (displayed as **Opus 1.0**) | ~2s |
| 2 | Kaggle GPU | DeepSeek-R1 via ngrok | ~5s |
| 3 | Ollama (local) | Qwen 2.5 / DeepSeek-R1 | ~3s |
| 4 | Built-in | Keyword rules | <1ms |

### Product Knowledge Base

OpsPilot includes a built-in knowledge base of ~40 products. When you say *"create asset MacBook Pro"*, it auto-fills:

- **Manufacturer**: Apple
- **Model**: MacBook Pro
- **Category**: LAPTOP
- **Serial Number**: auto-generated (e.g., `APL-A1B2C3D4`)
- **Warranty**: 12 months
- **Description**: contextual

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7.2 | Build tool & dev server |
| Tailwind CSS | 4.1 | Utility-first styling |
| Zustand | 5.0 | State management |
| React Router | 7.12 | Client-side routing |
| Framer Motion | 12.29 | Animations & transitions |
| Recharts | 3.7 | Charts & visualizations |
| Three.js + R3F | 0.182 | 3D visualizations |
| Socket.IO Client | 4.8 | Real-time communication |
| Lucide React | 0.562 | Icon system |
| TanStack Table | 8.21 | Advanced data tables |
| FullCalendar | 6.1 | Calendar views |
| jsPDF + AutoTable | 4.1 | PDF export |
| xlsx-js-style | 1.2 | Excel export |
| html5-qrcode | 2.3 | QR code scanning |
| react-qr-code | 2.0 | QR code generation |
| Lottie React | 2.4 | Login animations |
| Sonner | 2.0 | Toast notifications |
| GSAP | 3.14 | Advanced animations |
| @dnd-kit | 6.3 | Drag & drop |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 5.2 | Web framework |
| PostgreSQL | 16+ | Relational database |
| Prisma ORM | 7.4 | Database toolkit |
| Socket.IO | 4.8 | WebSocket server |
| JWT (jsonwebtoken) | 9.0 | Authentication tokens |
| Bcrypt | 6.0 | Password hashing |
| Tesseract.js | 7.0 | OCR processing |
| Nodemailer | 7.0 | Email delivery |
| Multer | 2.0 | File uploads |
| Winston | 3.19 | Structured logging |
| Helmet | 8.1 | Security headers |
| express-rate-limit | 8.2 | Rate limiting |
| express-validator | 7.3 | Input validation |
| QRCode | 1.5 | QR code generation |
| Axios | 1.13 | HTTP client (AI calls) |
| compression | 1.8 | Response compression |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          COREOPS ERP ARCHITECTURE                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                     PRESENTATION LAYER                                 │  │
│  │  React 19 · TypeScript · Tailwind CSS · Zustand · Framer Motion       │  │
│  │                                                                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │Dashboard │ │  Assets  │ │Maintenan.│ │Inventory │ │ Finance  │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │ Vendors  │ │   POs    │ │ Users    │ │ Offices  │ │Analytics │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐     │  │
│  │  │Documents │ │  Audit   │ │Settings  │ │  🤖 OpsPilot Chat    │     │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                              │ REST API + WebSocket                          │
│                              ▼                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                     APPLICATION LAYER                                  │  │
│  │  Express 5 · JWT · RBAC · Rate Limiting · Helmet                      │  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │  │
│  │  │  20 Route Modules · Controllers · Middleware · Validators       │   │  │
│  │  └─────────────────────────────────────────────────────────────────┘   │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │  │
│  │  │  AI Orchestrator · Agent Executor · Kimi Service · OCR         │   │  │
│  │  └─────────────────────────────────────────────────────────────────┘   │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │  │
│  │  │  Socket.IO Server · Real-time Notifications                     │   │  │
│  │  └─────────────────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                              │ Prisma ORM                                    │
│                              ▼                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                        DATA LAYER                                      │  │
│  │  PostgreSQL (Neon Cloud) · 21 Models · Migrations · Seed Data         │  │
│  │                                                                        │  │
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐        │  │
│  │  │Office │ │ User  │ │ Asset │ │Ticket │ │Invent.│ │Vendor │        │  │
│  │  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘        │  │
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐        │  │
│  │  │  PO   │ │Transac│ │Budget │ │ Doc   │ │Notif. │ │ Audit │        │  │
│  │  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                      EXTERNAL INTEGRATIONS                             │  │
│  │  NVIDIA NIM (Opus 1.0) · Kaggle GPU · Ollama · Tesseract OCR         │  │
│  │  Nodemailer · Currency API · File Storage                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0+
- **PostgreSQL** 16+ (or a [Neon](https://neon.tech) cloud database)
- **npm** 9.0+
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/tirthgoyani11/coreops-erp.git
cd coreops-erp
```

### Backend Setup

```bash
cd backend
npm install

# Create environment file
cp .env.example .env
# Edit .env with your database URL, JWT secret, and AI keys (see below)

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed initial data (optional)
npm run db:seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

### Access the Application

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:5000` |
| Health Check | `http://localhost:5000/health` |

### Default Admin (Development)

```
Email:    admin@corpops.com
Password: admin123
Role:     Super Admin
```

---

## 🔑 Environment Variables

Create `backend/.env` from the template:

```env
# Server
PORT=5000
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/coreops?sslmode=require

# Authentication
JWT_SECRET=your-64-char-secret-key-here
JWT_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Logging
LOG_LEVEL=info

# AI — NVIDIA NIM (Primary - Opus 1.0)
NVIDIA_API_KEY=your-nvidia-nim-key
NVIDIA_API_BASE_URL=https://integrate.api.nvidia.com/v1
KIMI_MODEL=moonshotai/kimi-k2-instruct
KIMI_TIMEOUT=30000

# AI — Kaggle GPU (Fallback)
# KAGGLE_INFERENCE_URL=https://your-ngrok-url.ngrok-free.dev

# AI — Ollama (Local Fallback)
# OLLAMA_URL=http://localhost:11434
```

---

## 📁 Project Structure

```
coreops-erp/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # 21 models, 15+ enums, indexes
│   │   ├── migrations/            # Database migration history
│   │   └── seed.js                # Initial data seeder
│   ├── src/
│   │   ├── config/
│   │   │   ├── prisma.js          # Prisma client singleton
│   │   │   └── socketServer.js    # Socket.IO configuration
│   │   ├── controllers/           # 15+ route handlers
│   │   ├── middleware/
│   │   │   ├── verifyToken.js     # JWT authentication
│   │   │   └── authorize.js       # RBAC authorization
│   │   ├── routes/                # 20 route modules
│   │   ├── services/
│   │   │   ├── orchestrator.js    # AI intent classification & routing
│   │   │   ├── agentExecutor.js   # 38+ deterministic ERP handlers
│   │   │   ├── kimiService.js     # NVIDIA NIM API wrapper
│   │   │   └── kaggleInferenceService.js  # 4-tier LLM fallback chain
│   │   └── utils/
│   │       └── logger.js          # Winston structured logging
│   ├── uploads/                   # User uploaded files
│   ├── server.js                  # HTTP + Socket.IO entry point
│   ├── app.js                     # Express app configuration
│   ├── package.json
│   └── render.yaml                # Render.com deployment config
│
├── frontend/
│   ├── public/
│   │   └── login_animation.json   # Lottie login animation
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/            # MainLayout, Sidebar, Header
│   │   │   ├── ui/                # Reusable UI components
│   │   │   ├── dashboard/         # Dashboard widgets
│   │   │   ├── assets/            # Asset-specific components
│   │   │   ├── maintenance/       # Maintenance components
│   │   │   ├── inventory/         # Inventory components
│   │   │   └── OpsPilot.tsx       # AI chat interface
│   │   ├── pages/                 # 40+ route pages
│   │   ├── stores/                # Zustand state stores
│   │   ├── hooks/                 # Custom hooks (useSocket, etc.)
│   │   ├── lib/                   # API client, utilities
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── App.tsx                # Root with routing
│   │   └── main.tsx               # Entry point
│   ├── index.html
│   ├── vite.config.ts
│   ├── vercel.json                # Vercel deployment config
│   └── package.json
│
├── docs/
│   ├── coreops-ultimate-master-plan.md
│   ├── phases/                    # 20 phase specification documents
│   └── v3/                        # 26 detailed v3 design docs
│
└── README.md
```

---

## 📦 Modules

### All Implemented Modules

| Module | Frontend Pages | Backend Routes | Key Features |
|--------|---------------|----------------|--------------|
| **🔐 Authentication** | Login, Register, ForgotPassword, ResetPassword | `/api/auth` | JWT, refresh tokens, password reset |
| **📊 Dashboard** | Dashboard, role-based variants | `/api/analytics` | KPIs, charts, quick actions, 3D globe |
| **🖥️ Assets** | Assets, AssetList, AssetDetail, AssetWizard, AssetMap, ScanQR | `/api/assets` | GUAI, QR codes, depreciation, transfers |
| **🔧 Maintenance** | Maintenance, MyTickets, TicketDetails, TicketWizard, PreventiveMaintenance, MaintenanceAnalytics | `/api/maintenance` | Kanban, calendar, work logs, parts usage |
| **📦 Inventory** | Inventory, InventoryDetail, StockOperations | `/api/inventory` | Dual-stream, stock movements, alerts |
| **🏢 Vendors** | Vendors | `/api/vendors` | MTBF, scoring, contracts |
| **📋 Purchase Orders** | PurchaseOrders, procurement/ | `/api/purchase-orders`, `/api/procurement` | Create, approve, 3-way matching |
| **💰 Finance** | financial/ | `/api/finance`, `/api/gl` | Transactions, budgets, GL, reports |
| **🏗️ Organizations** | Offices | `/api/offices` | Multi-location, branch management |
| **👥 Users** | Users | `/api/auth` | User CRUD, role assignment |
| **📄 Documents** | Documents, DocumentUpload, DocumentViewer | `/api/documents` | Upload, view, categorize |
| **🔔 Notifications** | Notifications, NotificationPreferences | `/api/notifications` | Real-time, preferences, broadcast |
| **🛡️ Audit** | AuditLogs | `/api/audit-logs` | Full activity trail |
| **📊 Analytics** | Analytics | `/api/analytics` | Charts, KPIs, exports |
| **👤 Profile** | Profile, ChangePassword | `/api/profile` | Personal settings |
| **⚙️ Settings** | Settings | `/api/settings` | System configuration |
| **🔍 OCR** | — | `/api/ocr` | Invoice text extraction |
| **💱 Currency** | — | `/api/currency` | Real-time exchange rates |
| **🤖 OpsPilot AI** | OpsPilot (floating chat) | `/api/ai` | 38+ handlers, 4-tier LLM |
| **🚀 Setup** | SetupWizard | `/api/setup` | First-time system setup |

---

## 🗃️ Database Schema

21 Prisma models across 15+ enums:

```
┌─────────────────────────────────────────────────────┐
│                   CORE MODELS                        │
├──────────────┬──────────────┬────────────────────────┤
│ Office       │ User         │ RefreshToken           │
│ Vendor       │ Settings     │ Counter                │
├──────────────┴──────────────┴────────────────────────┤
│                   ASSET MODELS                        │
├──────────────┬──────────────┬────────────────────────┤
│ Asset        │ AssetMainten │ MaintenanceTicket      │
│              │ anceHistory  │ WorkLog, SparePartUsage│
├──────────────┴──────────────┴────────────────────────┤
│                INVENTORY MODELS                       │
├──────────────┬──────────────────────────────────────┤
│ Inventory    │ StockMovement                         │
├──────────────┴──────────────────────────────────────┤
│              PROCUREMENT MODELS                       │
├──────────────┬──────────────────────────────────────┤
│ PurchaseOrder│ PurchaseOrderItem                     │
├──────────────┴──────────────────────────────────────┤
│               FINANCIAL MODELS                        │
├──────────────┬──────────────┬────────────────────────┤
│ Transaction  │ Budget       │ CurrencyRate           │
├──────────────┴──────────────┴────────────────────────┤
│                SYSTEM MODELS                          │
├──────────────┬──────────────┬────────────────────────┤
│ Document     │ Notification │ AuditLog               │
└──────────────┴──────────────┴────────────────────────┘
```

### Key Enums

| Enum | Values |
|------|--------|
| **UserRole** | `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `TECHNICIAN`, `STAFF`, `VIEWER` |
| **AssetCategory** | `LAPTOP`, `COMPUTER`, `FURNITURE`, `VEHICLE`, `EQUIPMENT`, `PHONE`, `PRINTER`, `SERVER`, `NETWORK`, `MACHINERY`, `OTHER` |
| **AssetStatus** | `ACTIVE`, `MAINTENANCE`, `DECOMMISSIONED`, `LOST`, `SOLD`, `RETIRED` |
| **TicketStatus** | `REQUESTED`, `PENDING`, `IN_PROGRESS`, `PENDING_PARTS`, `APPROVED`, `REJECTED`, `COMPLETED`, `CLOSED`, `CANCELLED` |
| **TicketPriority** | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| **InventoryType** | `PRODUCT`, `SPARE` |
| **NotificationType** | `APPROVAL_REQUIRED`, `LOW_STOCK`, `TICKET_ASSIGNED`, `TICKET_COMPLETED`, `SYSTEM_ALERT`, ... |

---

## 📡 API Reference

### Authentication

```http
POST   /api/auth/login              # Login with email/password
POST   /api/auth/register           # Register new user (admin only)
POST   /api/auth/refresh            # Refresh JWT token
POST   /api/auth/logout             # Logout & invalidate token
POST   /api/auth/forgot-password    # Send password reset email
POST   /api/auth/reset-password     # Reset password with token
```

### Assets

```http
GET    /api/assets                   # List with search, filter, pagination
GET    /api/assets/:id               # Get asset details
POST   /api/assets                   # Create asset
PUT    /api/assets/:id               # Update asset
DELETE /api/assets/:id               # Delete asset
POST   /api/assets/transfer          # Transfer between offices
GET    /api/assets/:id/qr            # Generate QR code
```

### Maintenance

```http
GET    /api/maintenance              # List tickets
POST   /api/maintenance              # Create ticket
GET    /api/maintenance/:id          # Ticket details
PUT    /api/maintenance/:id          # Update ticket
PUT    /api/maintenance/:id/approve  # Approve ticket
PUT    /api/maintenance/:id/assign   # Assign technician
PUT    /api/maintenance/:id/close    # Close ticket
```

### Inventory

```http
GET    /api/inventory                # List all inventory
GET    /api/inventory/:id            # Item details
POST   /api/inventory                # Create inventory item
PUT    /api/inventory/:id            # Update item
POST   /api/inventory/stock-in       # Record stock in
POST   /api/inventory/stock-out      # Record stock out
```

### Purchase Orders

```http
GET    /api/purchase-orders          # List POs
POST   /api/purchase-orders          # Create PO
GET    /api/purchase-orders/:id      # PO details
PUT    /api/purchase-orders/:id      # Update PO
PUT    /api/purchase-orders/:id/approve   # Approve PO
PUT    /api/purchase-orders/:id/reject    # Reject PO
```

### Finance

```http
GET    /api/finance/transactions     # List transactions
POST   /api/finance/transactions     # Create transaction
GET    /api/finance/budgets          # List budgets
POST   /api/finance/budgets          # Create/update budget
GET    /api/gl                       # Chart of accounts
POST   /api/gl                       # Create GL account
```

### Vendors

```http
GET    /api/vendors                  # List vendors
POST   /api/vendors                  # Create vendor
GET    /api/vendors/:id              # Vendor details
PUT    /api/vendors/:id              # Update vendor
GET    /api/vendors/:id/reliability  # MTBF reliability score
```

### AI (OpsPilot)

```http
POST   /api/ai/chat                  # Send message to OpsPilot
POST   /api/ai/vision               # Process image with AI
GET    /api/ai/sessions              # List chat sessions
```

### Other Endpoints

```http
GET/POST   /api/notifications        # Notifications CRUD
GET        /api/audit-logs           # Audit trail
GET/PUT    /api/profile              # User profile
GET/PUT    /api/settings             # System settings
POST       /api/documents            # Upload documents
POST       /api/ocr/scan             # OCR invoice scan
GET        /api/currency/rates       # Exchange rates
GET        /api/analytics/*          # Analytics data
POST       /api/procurement/match    # 3-way matching
POST       /api/setup               # First-time setup
```

### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 👥 User Roles & RBAC

| Role | Icon | Scope | Key Permissions |
|------|------|-------|-----------------|
| **Super Admin** | 👑 | Global | Full system access, all CRUD, user management, settings |
| **Admin** | 🔑 | Organization | Manage offices, users, approve high-value POs |
| **Manager** | 📊 | Branch | Asset management, approvals, team oversight |
| **Technician** | 🔧 | Assigned | Execute tickets, consume parts, update work logs |
| **Staff** | 👤 | Branch | Create tickets, view assets, basic operations |
| **Viewer** | 👁️ | Assigned | Read-only access to reports and dashboards |

### Approval Workflow

```
Staff/Technician Request
    └──▶ Manager (branch-level approvals)
            └──▶ Admin (organization-level)
                    └──▶ Super Admin (system-wide)
```

---

## ⚡ Real-Time Features

CoreOps uses **Socket.IO** for real-time communication:

- **Personal Notifications**: Targeted to individual users (`user:<id>` rooms)
- **Office Broadcasting**: Messages to all users in an office (`office:<id>` rooms)
- **JWT Authentication**: WebSocket connections require valid JWT tokens
- **Auto-Reconnect**: Client handles disconnection gracefully

```typescript
// Frontend hook (useSocket.ts)
socket.on('notification', (data) => {
    toast(data.title, { description: data.message });
    notificationStore.addNotification(data);
});
```

---

## 🎨 Design System

### Theme: Neon Green Dark Mode

| Element | Value |
|---------|-------|
| **Primary** | `#B9FF66` (Neon Green) |
| **Background** | `#09090b` (Zinc 950) |
| **Card** | `#18181b` (Zinc 900) |
| **Text** | `#ffffff` / `#a1a1aa` |
| **Border** | `#27272a` (Zinc 800) |

### Status Colors

| Status | Color |
|--------|-------|
| ✅ Success | `#B9FF66` (Neon Green) |
| ⚠️ Warning | `#fb923c` (Orange) |
| 🔴 Error | `#fb7185` (Rose) |
| 🔵 Info | `#38bdf8` (Sky Blue) |

### UI Features

- **Font**: System font stack via Tailwind
- **Icons**: Lucide React (500+ icons)
- **Animations**: Framer Motion page transitions & micro-interactions
- **3D**: Three.js holographic globe on dashboard
- **Components**: Cards with `rounded-2xl`, glass morphism effects, CSS variable theming

---

## 🚢 Deployment

### Backend on Render

Pre-configured via `render.yaml`:

```bash
# Build
npm install && npx prisma generate

# Start
npm start
```

### Frontend on Vercel

Pre-configured via `vercel.json` with SPA rewrites:

```bash
# Build
tsc -b && vite build

# Output
dist/
```

### Environment Setup

1. Set `DATABASE_URL` to your PostgreSQL connection string
2. Set `JWT_SECRET` (64+ characters)
3. Set `ALLOWED_ORIGINS` to your frontend URL
4. Optionally set `NVIDIA_API_KEY` for AI features

---

## 📚 Documentation

The `docs/` directory contains comprehensive specifications:

### Phase Documents (20 files)

| Phase | Topic |
|-------|-------|
| 01 | System Overview & Architecture |
| 02 | User Roles & Permissions |
| 03 | RBAC Matrix |
| 04 | Authentication & Security |
| 05 | Dashboard Hub |
| 06 | Asset Management |
| 07 | Maintenance CMMS |
| 08–09 | Inventory (Products & Spares) |
| 10 | Vendor Management |
| 11 | Financial Management |
| 12 | Organizations & Offices |
| 13 | User Management |
| 14 | Analytics & Reporting |
| 15 | Notifications |
| 16 | Administration |
| 17 | Profile & Settings |
| 18 | UI Design Guidelines |
| 19 | Workflows |
| 20 | Master Index |

### V3 Design Documents (26 files)

Detailed specifications for every module including database models, API reference, RBAC, CRM, manufacturing, quality management, project management, field service, and the CoreAI engine.

---

## 👨‍💻 Authors

**Tirth Goyani**
- Computer Engineering Department
- G H Patel College of Engineering & Technology

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Built with 💚 by Tirth Goyani</strong>
</p>
<p align="center">
  <code>React 19</code> · <code>Node.js</code> · <code>PostgreSQL</code> · <code>Prisma</code> · <code>Opus 1.0 AI</code> · <code>#B9FF66</code>
</p>
