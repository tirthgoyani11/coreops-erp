<p align="center">
  <img src="https://img.shields.io/badge/CorpOps-ERP-B9FF66?style=for-the-badge&logoColor=black" alt="CorpOps ERP"/>
</p>

<h1 align="center">
  <span style="color: #B9FF66;">CorpOps</span> ERP
</h1>

<p align="center">
  <strong>🌐 Global Asset Governance & Intelligent Operations Suite</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2.0-61DAFB?style=flat-square&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js" alt="Node.js"/>
  <img src="https://img.shields.io/badge/MongoDB-9.1-47A248?style=flat-square&logo=mongodb" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/Express-5.2-000000?style=flat-square&logo=express" alt="Express"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-B9FF66?style=flat-square" alt="License"/>
  <img src="https://img.shields.io/badge/Version-1.0.0-B9FF66?style=flat-square" alt="Version"/>
  <img src="https://img.shields.io/badge/Screens-72-B9FF66?style=flat-square" alt="Screens"/>
  <img src="https://img.shields.io/badge/Roles-5-B9FF66?style=flat-square" alt="Roles"/>
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Modules](#-modules)
- [User Roles](#-user-roles)
- [API Documentation](#-api-documentation)
- [Design System](#-design-system)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [Authors](#-authors)

---

## 🎯 Overview

**CorpOps ERP** is a next-generation enterprise resource planning system designed for intelligent global operations management. Unlike traditional ERP systems that serve as passive data repositories, CorpOps integrates advanced algorithmic decision-making, dual-stream inventory logic, and multi-currency financial governance.

### 🚀 What Makes CorpOps Different?

| Feature | Traditional ERP | CorpOps ERP |
|---------|----------------|-------------|
| Asset Decisions | Manual analysis | **AI-powered Repair vs Replace** |
| Inventory | Single stream | **Dual-stream (Products + Spares)** |
| Asset Tracking | Basic IDs | **GUAI (Global Unique Asset ID)** |
| Vendor Selection | Price-based | **MTBF Reliability Scoring** |
| Invoices | Manual entry | **OCR Auto-extraction** |
| Multi-Currency | Basic conversion | **Real-time normalization** |

---

## ✨ Key Features

### 🔧 Asset Management
- **GUAI System**: `{ORG-3}-{COUNTRY-3}-{OFFICE-3}-{TYPE-3-6}-{SEQ-4}`
- Multi-location asset tracking
- QR code generation & scanning
- Depreciation calculator (Straight-line, Declining Balance, Units of Production)
- Complete maintenance history

### 🛠️ Maintenance Management
- Ticket lifecycle with approval workflow
- Kanban, List, and Calendar views
- Technician assignment & scheduling
- Repair vs Replace decision algorithm
- Parts consumption tracking

### 📦 Dual-Stream Inventory
- **Products**: Revenue-generating items for sale
- **Spare Parts**: Cost-consuming parts for maintenance
- Low stock alerts & reorder automation
- Inter-branch transfer workflow
- SKU auto-generation

### 🏢 Vendor Management
- **MTBF Tracking**: Mean Time Between Failures per vendor
- Performance scoring & reliability metrics
- Vendor comparison tool
- Contract & document management

### 💰 Financial Management
- Multi-currency support with real-time rates
- **OCR Invoice Scanner** (Tesseract.js)
- Budget vs Actual tracking
- Expense categorization
- PDF/Excel report export

### 📊 Analytics & Reporting
- Role-based dashboards (5 variants)
- Executive analytics with KPIs
- Custom report builder
- Chart.js visualizations
- Scheduled report delivery

### 🔐 Security & Access
- JWT authentication with refresh tokens
- Role-Based Access Control (RBAC)
- 5 hierarchical user roles
- Audit logging for all actions
- Session management

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI Framework |
| TypeScript | 5.9 | Type Safety |
| Vite | 7.2.4 | Build Tool |
| Tailwind CSS | 4.1 | Styling |
| Zustand | 5.0 | State Management |
| React Router | 7.12 | Navigation |
| Framer Motion | 12.29 | Animations |
| Lucide React | 0.562 | Icons |
| Chart.js / Three.js | Latest | Visualizations |
| jsPDF + xlsx | Latest | Export (PDF/Excel) |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 5.2.1 | Web Framework |
| MongoDB | Latest | Database |
| Mongoose | 9.1.5 | ODM |
| JWT | 9.0.3 | Authentication |
| Bcrypt | 6.0.0 | Password Hashing |
| Tesseract.js | 7.0.0 | OCR Processing |
| Nodemailer | 7.0.13 | Email Service |
| Multer | 2.0.2 | File Uploads |
| Winston | 3.19 | Logging |
| Helmet | 8.1.0 | Security Headers |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CORPOPS ERP ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    PRESENTATION LAYER                            │   │
│  │  React 19 + TypeScript + Tailwind CSS + Zustand                 │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │Dashboard│ │ Assets  │ │Mainten. │ │Inventory│ │Analytics│   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                   │                                     │
│                                   ▼ REST API (Axios)                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    APPLICATION LAYER                             │   │
│  │  Node.js + Express.js + JWT + RBAC Middleware                   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │  Auth   │ │ Assets  │ │ Tickets │ │Inventory│ │ Vendors │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                   │                                     │
│                                   ▼ Mongoose ODM                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      DATA LAYER                                  │   │
│  │  MongoDB (NoSQL Document Database)                               │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │  Users  │ │ Assets  │ │ Tickets │ │Inventory│ │ Vendors │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   INTEGRATIONS                                   │   │
│  │  Tesseract OCR │ Nodemailer │ Currency API │ File Storage       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0 or higher
- **MongoDB** 6.0 or higher (or MongoDB Atlas)
- **npm** 9.0 or higher
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/tirthgoyani11/coreops-erp.git
cd coreops-erp
```

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure your .env file
# MONGODB_URI=mongodb://localhost:27017/corpops
# JWT_SECRET=your-secret-key
# JWT_EXPIRES_IN=7d
# PORT=5000

# Start development server
npm run dev
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| API Health | http://localhost:5000/health |

### Default Login (Development)

```
Email: admin@corpops.com
Password: admin123
Role: Super Admin
```

---

## 📁 Project Structure

```
coreops-erp/
├── backend/                    # Node.js/Express API
│   ├── src/
│   │   ├── config/            # Database & app configuration
│   │   ├── controllers/       # Route handlers (9 modules)
│   │   ├── middleware/        # Auth, RBAC, validation
│   │   ├── models/            # Mongoose schemas (12 models)
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic (Email, OCR)
│   │   └── utils/             # Helpers (GUAI, SKU generators)
│   ├── server.js              # Entry point
│   └── package.json
│
├── frontend/                   # React/TypeScript SPA
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── layout/        # MainLayout, Sidebar, Header
│   │   │   └── ui/            # Buttons, Inputs, Cards
│   │   ├── pages/             # Route pages (12 implemented)
│   │   ├── stores/            # Zustand state management
│   │   ├── services/          # API service layer
│   │   ├── types/             # TypeScript definitions
│   │   └── App.tsx            # Root component
│   ├── index.html
│   └── package.json
│
├── docs/
│   └── phases/                # 20 detailed phase documents
│       ├── phase_01_system_overview.md
│       ├── phase_02_user_roles.md
│       ├── phase_03_rbac_matrix.md
│       ├── ... (17 more)
│       └── phase_20_index.md
│
├── phase_details.md           # Master specification
└── README.md                  # This file
```

---

## 📦 Modules

### Implemented Modules (12 Pages)

| Module | Page | Features |
|--------|------|----------|
| **Dashboard** | `Dashboard.tsx` | KPIs, Charts, Quick Actions |
| **Assets** | `Assets.tsx` | List, Search, Filter, GUAI |
| **Maintenance** | `Maintenance.tsx` | Tickets, Status, Priority |
| **Inventory** | `Inventory.tsx` | Products & Spares |
| **Vendors** | `Vendors.tsx` | List, Search, Categories |
| **Purchase Orders** | `PurchaseOrders.tsx` | Create, Approve, Track |
| **Analytics** | `Analytics.tsx` | Charts, Reports |
| **Notifications** | `Notifications.tsx` | Alerts, Real-time |
| **Audit Logs** | `AuditLogs.tsx` | Activity History |
| **Users** | `Users.tsx` | User Management |
| **Offices** | `Offices.tsx` | Organizations |
| **Login** | `Login.tsx` | Authentication |

### Planned Modules (60 Screens)

See [docs/phases/phase_20_index.md](./docs/phases/phase_20_index.md) for the complete implementation roadmap.

---

## 👥 User Roles

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| 🔴 **Super Admin** | Global | Full system access, user management, settings |
| 🟠 **Regional Manager** | Region | Manage branches, high-value approvals |
| 🟡 **Branch Manager** | Branch | Asset management, approvals up to $500 |
| 🟢 **Technician** | Assigned | Execute tickets, consume parts |
| 🔵 **Viewer** | Assigned | Read-only access to reports |

### Approval Hierarchy

```
Technician Request → Branch Manager (≤$500) → Regional Manager (>$500) → Super Admin (>$5000)
```

---

## 📡 API Documentation

### Authentication

```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/forgot-password
```

### Core Endpoints

```http
# Assets
GET    /api/assets
GET    /api/assets/:id
POST   /api/assets
PUT    /api/assets/:id
DELETE /api/assets/:id
POST   /api/assets/transfer

# Maintenance
GET    /api/maintenance
POST   /api/maintenance
PUT    /api/maintenance/:id/approve
PUT    /api/maintenance/:id/assign

# Inventory
GET    /api/inventory/products
GET    /api/inventory/spares
POST   /api/inventory/stock-in
POST   /api/inventory/stock-out

# Vendors
GET    /api/vendors
POST   /api/vendors
GET    /api/vendors/:id/reliability
```

### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 🎨 Design System

### Theme: Neon Green Dark Mode

| Element | Color |
|---------|-------|
| **Primary** | `#B9FF66` (Neon Green) |
| **Background** | `#09090b` (Zinc 950) |
| **Card** | `#18181b` (Zinc 900) |
| **Text** | `#ffffff` |
| **Muted** | `#a1a1aa` (Zinc 400) |

### Status Colors

| Status | Color |
|--------|-------|
| Success | 🟢 `#B9FF66` (Neon Green) |
| Warning | 🟠 `#fb923c` (Orange) |
| Error | 🔴 `#fb7185` (Rose) |
| Info | 🔵 `#38bdf8` (Sky Blue) |

### Typography

- **Font**: Outfit (Google Fonts)
- **Icons**: Lucide React

See [docs/phases/phase_18_ui_guidelines.md](./docs/phases/phase_18_ui_guidelines.md) for complete design specifications.

---

## 📚 Documentation

The project includes comprehensive documentation in `docs/phases/`:

| Phase | Document | Content |
|-------|----------|---------|
| 01 | System Overview | Architecture, GUAI format |
| 02 | User Roles | 5 roles with permissions |
| 03 | RBAC Matrix | 72-screen access matrix |
| 04-05 | Auth & Dashboards | Login, role-based views |
| 06-07 | Assets & Maintenance | Core module specs |
| 08-11 | Inventory & Financial | Dual-stream, OCR |
| 12-17 | Orgs, Users, Analytics | Management modules |
| 18 | **UI Guidelines** | Complete design system |
| 19 | Workflows | User flow diagrams |
| 20 | **Index** | Master checklist |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- Use TypeScript for all frontend code
- Follow ESLint + Prettier configurations
- Write meaningful commit messages
- Update documentation for new features

---

## 👨‍💻 Authors

**Tirth Goyani** & **Arijeetsinh Jadeja**

- Computer Engineering Department
- G H Patel College of Engineering & Technology
- February 2026

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Built with 💚 using the Neon Green Dark Mode theme</strong>
</p>

<p align="center">
  <code>#B9FF66</code> • <code>React</code> • <code>Node.js</code> • <code>MongoDB</code>
</p>