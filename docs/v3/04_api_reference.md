# 04: API Reference — CoreOps ERP v3.0

> **Standard**: OpenAPI 3.1 · RESTful · JSON:API-inspired  
> **Base URL**: `https://api.coreops.app/v1`  
> **Transport**: HTTPS (TLS 1.3) + WebSocket (Socket.IO)

---

## 4.1 API Conventions

### Base URL & Versioning

| Environment | URL |
|-------------|-----|
| Production | `https://api.coreops.app/v1` |
| Staging | `https://staging-api.coreops.app/v1` |
| Local Dev | `http://localhost:5000/api/v1` |

URL-path versioning (`/v1/`) is used. Major version changes indicate breaking changes; minor/patch are backward-compatible and don't increment the version.

### Authentication

All requests (except `/auth/login`, `/auth/register`, `/auth/forgot-password`) require a valid JWT:

```
Authorization: Bearer <access_token>
```

For API key access (machine-to-machine):
```
X-API-Key: <api_key>
```

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token or API key |
| `Content-Type` | Yes (POST/PUT/PATCH) | `application/json` |
| `Accept` | No | `application/json` (default) |
| `X-Office-Id` | Conditional | Required for multi-office users |
| `X-Request-Id` | No | Client-generated UUID for idempotency |
| `X-Timezone` | No | IANA timezone (default: `Asia/Kolkata`) |
| `Accept-Language` | No | i18n locale (default: `en`) |

### HTTP Methods

| Method | Usage | Idempotent |
|--------|-------|------------|
| `GET` | Retrieve resource(s) | ✅ |
| `POST` | Create resource | ❌ |
| `PUT` | Full resource replacement | ✅ |
| `PATCH` | Partial update | ✅ |
| `DELETE` | Soft delete (sets `isActive: false`) | ✅ |

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success (GET, PATCH, PUT) |
| `201` | Created (POST) |
| `204` | No Content (DELETE) |
| `400` | Bad Request — validation error |
| `401` | Unauthorized — missing/invalid token |
| `403` | Forbidden — insufficient permissions |
| `404` | Not Found |
| `409` | Conflict — duplicate resource |
| `422` | Unprocessable Entity — business rule violation |
| `429` | Too Many Requests — rate limited |
| `500` | Internal Server Error |

---

## 4.2 Response Envelope

### Success Response

```json
{
  "success": true,
  "data": { /* resource or array */ },
  "meta": {
    "timestamp": "2026-02-15T10:30:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "version": "v1"
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ /* array of resources */ ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 342,
    "totalPages": 14,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextCursor": "eyJpZCI6IjY1YTEyMzQ1..."
  },
  "meta": {
    "timestamp": "2026-02-15T10:30:00.000Z",
    "requestId": "..."
  }
}
```

### Error Response (RFC 9457)

```json
{
  "success": false,
  "error": {
    "type": "https://api.coreops.app/errors/validation-failed",
    "title": "Validation Failed",
    "status": 400,
    "detail": "The 'email' field must be a valid email address.",
    "instance": "/v1/users",
    "errors": [
      {
        "field": "email",
        "message": "Must be a valid email address",
        "code": "INVALID_FORMAT"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-02-15T10:30:00.000Z",
    "requestId": "..."
  }
}
```

---

## 4.3 Pagination, Filtering & Sorting

### Pagination

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | Page number (offset-based) |
| `limit` | number | `25` | Items per page (max: 100) |
| `cursor` | string | — | Cursor for keyset pagination |

> **Rule**: Use offset pagination (`page`/`limit`) for admin dashboards. Use cursor pagination for real-time feeds and infinite scroll.

### Filtering

Filters use query parameters with operators:

```
GET /v1/assets?status=ACTIVE&category=LAPTOP&purchaseInfo.purchasePrice[gte]=5000&purchaseInfo.purchasePrice[lte]=50000
```

| Operator | Syntax | Description |
|----------|--------|-------------|
| Equal | `field=value` | Exact match |
| Not Equal | `field[ne]=value` | Exclude value |
| Greater Than | `field[gt]=value` | Numeric/date comparison |
| Greater/Equal | `field[gte]=value` | Numeric/date comparison |
| Less Than | `field[lt]=value` | Numeric/date comparison |
| Less/Equal | `field[lte]=value` | Numeric/date comparison |
| In | `field[in]=a,b,c` | Match any in set |
| Not In | `field[nin]=a,b,c` | Exclude set |
| Contains | `field[like]=text` | Case-insensitive substring |
| Exists | `field[exists]=true` | Field is not null |
| Date Range | `field[after]=date&field[before]=date` | Date range |

### Sorting

```
GET /v1/assets?sort=-createdAt,name
```

- Prefix with `-` for descending order
- Comma-separate multiple fields
- Default sort: `-createdAt` (newest first)

### Field Selection

```
GET /v1/assets?fields=name,guai,status,category
```

Exclude fields with `-` prefix: `fields=-maintenanceHistory,-depreciation`

### Full-Text Search

```
GET /v1/assets?search=Dell+Latitude
```

Uses MongoDB text indexes for relevance-ranked results.

---

## 4.4 Rate Limiting

| Tier | Rate | Burst | Reset |
|------|------|-------|-------|
| Standard (per user) | 100 req/min | 150 | 1 minute |
| Admin | 200 req/min | 300 | 1 minute |
| API Key (M2M) | 500 req/min | 750 | 1 minute |
| Auth endpoints | 10 req/min | 15 | 1 minute |

**Response headers** on every request:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1708000260
Retry-After: 30           (only on 429)
```

---

## 4.5 Bulk Operations

Batch endpoints support up to **100 items** per request:

```http
POST /v1/assets/bulk
Content-Type: application/json

{
  "operation": "create",    // "create" | "update" | "delete"
  "items": [
    { "name": "Asset 1", "category": "LAPTOP", ... },
    { "name": "Asset 2", "category": "PHONE", ... }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "succeeded": 98,
    "failed": 2,
    "results": [
      { "index": 0, "status": "created", "id": "65a12345..." },
      { "index": 1, "status": "error", "error": "Duplicate GUAI" }
    ]
  }
}
```

---

## 4.6 Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/auth/register` | Register new user (setup wizard) | Public |
| `POST` | `/auth/login` | Email + password login | Public |
| `POST` | `/auth/logout` | Invalidate refresh token | Auth |
| `POST` | `/auth/refresh` | Rotate access + refresh tokens | Public (with refresh token) |
| `POST` | `/auth/forgot-password` | Send password reset email | Public |
| `POST` | `/auth/reset-password/:token` | Reset password with token | Public |
| `GET` | `/auth/me` | Get current user profile | Auth |
| `PATCH` | `/auth/me` | Update own profile | Auth |
| `PATCH` | `/auth/change-password` | Change own password | Auth |
| `POST` | `/auth/mfa/setup` | Initialize MFA (TOTP) | Auth |
| `POST` | `/auth/mfa/verify` | Verify MFA code | Auth |
| `DELETE` | `/auth/mfa/disable` | Disable MFA | Auth |
| `POST` | `/auth/mfa/backup-codes` | Generate backup codes | Auth |
| `POST` | `/auth/sso/saml` | SAML SSO initiation | Public |
| `POST` | `/auth/sso/saml/callback` | SAML response callback | Public |
| `GET` | `/auth/sso/oidc` | OIDC SSO initiation | Public |
| `GET` | `/auth/sso/oidc/callback` | OIDC response callback | Public |
| `POST` | `/auth/invite/:token` | Accept user invitation | Public |
| `GET` | `/auth/sessions` | List active sessions | Auth |
| `DELETE` | `/auth/sessions/:sessionId` | Revoke specific session | Auth |
| `DELETE` | `/auth/sessions` | Revoke all sessions | Auth |

### `POST /auth/login`

**Request**:
```json
{
  "email": "admin@coreops.app",
  "password": "SecureP@ss123",
  "mfaCode": "123456",
  "rememberMe": true
}
```

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "65a12345...",
      "name": "Tirth Goyani",
      "email": "admin@coreops.app",
      "role": "SUPER_ADMIN",
      "officeId": null,
      "avatar": "https://assets.coreops.app/avatars/tirth.jpg",
      "preferences": {
        "theme": "dark",
        "language": "en",
        "timezone": "Asia/Kolkata"
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJSUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
      "expiresIn": 900,
      "tokenType": "Bearer"
    },
    "mfaRequired": false
  }
}
```

### `POST /auth/refresh`

**Request**:
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response** `200` — new token pair (old refresh token is invalidated):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
    "expiresIn": 900
  }
}
```

---

## 4.7 User Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/users` | List users (paginated, filterable) | MANAGER+ |
| `POST` | `/users` | Create user | SUPER_ADMIN, MANAGER |
| `GET` | `/users/:id` | Get user details | MANAGER+ |
| `PATCH` | `/users/:id` | Update user | MANAGER+ |
| `DELETE` | `/users/:id` | Deactivate user | SUPER_ADMIN |
| `POST` | `/users/:id/invite` | Send/resend invitation | MANAGER+ |
| `PATCH` | `/users/:id/role` | Change user role | SUPER_ADMIN |
| `POST` | `/users/:id/unlock` | Unlock locked account | MANAGER+ |

### `GET /users`

```
GET /v1/users?role=STAFF&officeId=65a12345&isActive=true&page=1&limit=25&sort=-lastLogin
```

**Response** `200`:
```json
{
  "success": true,
  "data": [
    {
      "_id": "65a12345...",
      "name": "Priya Sharma",
      "email": "priya@coreops.app",
      "role": "STAFF",
      "officeId": { "_id": "65a67890...", "name": "Mumbai HQ", "code": "MUM" },
      "isActive": true,
      "lastLogin": "2026-02-14T09:30:00Z",
      "createdAt": "2025-11-01T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 25, "total": 47, "totalPages": 2 }
}
```

### `POST /users`

**Request**:
```json
{
  "name": "Raj Patel",
  "email": "raj.patel@coreops.app",
  "role": "TECHNICIAN",
  "officeId": "65a67890...",
  "phone": "+91-9876543210",
  "sendInvite": true
}
```

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "_id": "65b11111...",
    "name": "Raj Patel",
    "email": "raj.patel@coreops.app",
    "role": "TECHNICIAN",
    "officeId": "65a67890...",
    "isActive": true,
    "inviteToken": "sent",
    "createdAt": "2026-02-15T10:30:00Z"
  }
}
```

---

## 4.8 Office (Organization) Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/offices` | List offices | Any auth user |
| `POST` | `/offices` | Create office | SUPER_ADMIN |
| `GET` | `/offices/:id` | Get office details | Any auth user |
| `PATCH` | `/offices/:id` | Update office | SUPER_ADMIN, MANAGER |
| `DELETE` | `/offices/:id` | Deactivate office | SUPER_ADMIN |
| `GET` | `/offices/:id/hierarchy` | Get org tree from this node | Any auth user |
| `GET` | `/offices/:id/stats` | Office dashboard statistics | MANAGER+ |

### `GET /offices/:id/hierarchy`

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "_id": "65a67890...",
    "name": "CoreOps Global",
    "code": "CORP",
    "type": "headquarters",
    "children": [
      {
        "_id": "65a67891...",
        "name": "India Region",
        "code": "IND",
        "type": "regional_office",
        "children": [
          { "_id": "65a67892...", "name": "Mumbai Branch", "code": "MUM", "type": "branch", "children": [] },
          { "_id": "65a67893...", "name": "Surat Warehouse", "code": "SUR", "type": "warehouse", "children": [] }
        ]
      }
    ]
  }
}
```

---

## 4.9 Asset Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/assets` | List assets (paginated) | STAFF+ |
| `POST` | `/assets` | Create asset (auto-generates GUAI) | MANAGER+ |
| `GET` | `/assets/:id` | Get asset detail | STAFF+ |
| `PATCH` | `/assets/:id` | Update asset | MANAGER+ |
| `DELETE` | `/assets/:id` | Deactivate asset | MANAGER+ |
| `GET` | `/assets/:id/maintenance-history` | Get maintenance records | STAFF+ |
| `GET` | `/assets/:id/depreciation-schedule` | Calculate depreciation | MANAGER+ |
| `POST` | `/assets/:id/transfer` | Transfer to another location | MANAGER+ |
| `GET` | `/assets/:id/qr-code` | Generate QR code (SVG/PNG) | STAFF+ |
| `POST` | `/assets/bulk` | Bulk create/update/delete | MANAGER+ |
| `GET` | `/assets/analytics` | Asset analytics dashboard | MANAGER+ |
| `GET` | `/assets/export` | Export to CSV/Excel | MANAGER+ |

### `POST /assets`

**Request**:
```json
{
  "name": "Dell Latitude 5540",
  "category": "LAPTOP",
  "model": "Latitude 5540",
  "serialNumber": "SN-2026-DELL-001",
  "purchaseInfo": {
    "vendor": "65b22222...",
    "purchaseDate": "2026-01-15",
    "purchasePrice": 85000,
    "currency": "INR",
    "invoiceNumber": "INV-2026-001",
    "warranty": {
      "startDate": "2026-01-15",
      "endDate": "2029-01-14",
      "terms": "3-year on-site warranty"
    }
  },
  "depreciation": {
    "method": "straight_line",
    "usefulLife": 5,
    "salvageValue": 5000
  },
  "location": {
    "building": "Tower A",
    "floor": "5",
    "room": "IT Lab",
    "assignedTo": "65a12345..."
  }
}
```

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "_id": "65c33333...",
    "guai": "CORP-IN-SUR-LAPT-001",
    "name": "Dell Latitude 5540",
    "category": "LAPTOP",
    "status": "ACTIVE",
    "currentValue": 85000,
    "createdAt": "2026-02-15T10:30:00Z"
  }
}
```

---

## 4.10 Maintenance & CMMS

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/maintenance` | List tickets (paginated) | STAFF+ |
| `POST` | `/maintenance` | Create maintenance ticket | STAFF+ |
| `GET` | `/maintenance/:id` | Get ticket detail | STAFF+ |
| `PATCH` | `/maintenance/:id` | Update ticket | TECHNICIAN+ |
| `DELETE` | `/maintenance/:id` | Cancel ticket | MANAGER+ |
| `PATCH` | `/maintenance/:id/assign` | Assign technician | MANAGER+ |
| `PATCH` | `/maintenance/:id/approve` | Approve/reject ticket | MANAGER+ |
| `PATCH` | `/maintenance/:id/status` | Update status + add work log | TECHNICIAN+ |
| `POST` | `/maintenance/:id/work-log` | Add work log entry | TECHNICIAN+ |
| `POST` | `/maintenance/:id/spare-parts` | Record spare parts usage | TECHNICIAN+ |
| `GET` | `/maintenance/:id/repair-replace` | Get repair vs replace analysis | MANAGER+ |
| `GET` | `/maintenance/analytics` | CMMS analytics dashboard | MANAGER+ |
| `GET` | `/maintenance/calendar` | Calendar view of scheduled work | STAFF+ |
| `GET` | `/maintenance/sla-report` | SLA compliance report | MANAGER+ |

### Preventive Maintenance

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/preventive-schedules` | List PM schedules | MANAGER+ |
| `POST` | `/preventive-schedules` | Create PM schedule | MANAGER+ |
| `GET` | `/preventive-schedules/:id` | Get schedule detail | STAFF+ |
| `PATCH` | `/preventive-schedules/:id` | Update schedule | MANAGER+ |
| `DELETE` | `/preventive-schedules/:id` | Deactivate schedule | MANAGER+ |
| `POST` | `/preventive-schedules/:id/generate` | Manually generate next ticket | MANAGER+ |

### IoT Sensors

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/iot/readings` | Ingest sensor readings (batch) | API Key |
| `GET` | `/iot/readings` | Query sensor data (time range) | STAFF+ |
| `GET` | `/iot/assets/:assetId/latest` | Get latest readings for asset | STAFF+ |
| `GET` | `/iot/assets/:assetId/anomalies` | Detected anomalies | MANAGER+ |

---

## 4.11 Inventory & Warehouse

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/inventory` | List inventory items | STAFF+ |
| `POST` | `/inventory` | Create inventory item | MANAGER+ |
| `GET` | `/inventory/:id` | Get item detail | STAFF+ |
| `PATCH` | `/inventory/:id` | Update item | MANAGER+ |
| `DELETE` | `/inventory/:id` | Deactivate item | MANAGER+ |
| `GET` | `/inventory/:id/stock-levels` | Stock across all locations | STAFF+ |
| `GET` | `/inventory/:id/movement-history` | Stock movement history | MANAGER+ |
| `GET` | `/inventory/low-stock` | Items below reorder point | MANAGER+ |
| `GET` | `/inventory/valuation` | Total inventory valuation | MANAGER+ |
| `POST` | `/inventory/bulk` | Bulk operations | MANAGER+ |
| `GET` | `/inventory/export` | Export to CSV/Excel | MANAGER+ |

### Warehouse Locations

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/warehouse-locations` | List warehouse locations | STAFF+ |
| `POST` | `/warehouse-locations` | Create location/bin | MANAGER+ |
| `GET` | `/warehouse-locations/:id` | Get location detail + stock | STAFF+ |
| `PATCH` | `/warehouse-locations/:id` | Update location | MANAGER+ |
| `GET` | `/warehouse-locations/:id/children` | Get children locations | STAFF+ |

### Stock Transfers

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/stock-transfers` | List transfers | STAFF+ |
| `POST` | `/stock-transfers` | Create transfer request | STAFF+ |
| `GET` | `/stock-transfers/:id` | Get transfer detail | STAFF+ |
| `PATCH` | `/stock-transfers/:id/status` | Update transfer status | MANAGER+ |

### Stock Adjustments

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/stock-adjustments` | List adjustments | MANAGER+ |
| `POST` | `/stock-adjustments` | Create adjustment | MANAGER+ |
| `GET` | `/stock-adjustments/:id` | Get adjustment detail | MANAGER+ |
| `PATCH` | `/stock-adjustments/:id/approve` | Approve adjustment | MANAGER+ |

---

## 4.12 Procurement

### Vendors

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/vendors` | List vendors | STAFF+ |
| `POST` | `/vendors` | Create vendor | MANAGER+ |
| `GET` | `/vendors/:id` | Get vendor detail | STAFF+ |
| `PATCH` | `/vendors/:id` | Update vendor | MANAGER+ |
| `DELETE` | `/vendors/:id` | Deactivate vendor | MANAGER+ |
| `GET` | `/vendors/:id/purchase-orders` | Vendor's PO history | STAFF+ |
| `POST` | `/vendors/:id/evaluate` | Submit scorecard evaluation | MANAGER+ |
| `GET` | `/vendors/:id/scorecard` | Get scorecard history | MANAGER+ |
| `PATCH` | `/vendors/:id/status` | Change vendor status | SUPER_ADMIN |

### Purchase Requisitions

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/purchase-requisitions` | List PRs | STAFF+ |
| `POST` | `/purchase-requisitions` | Create PR | STAFF+ |
| `GET` | `/purchase-requisitions/:id` | Get PR detail | STAFF+ |
| `PATCH` | `/purchase-requisitions/:id` | Update PR | Creator, MANAGER+ |
| `PATCH` | `/purchase-requisitions/:id/approve` | Approve/reject PR | MANAGER+ |
| `POST` | `/purchase-requisitions/:id/convert-to-po` | Convert PR → PO | MANAGER+ |

### Purchase Orders

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/purchase-orders` | List POs | STAFF+ |
| `POST` | `/purchase-orders` | Create PO | MANAGER+ |
| `GET` | `/purchase-orders/:id` | Get PO detail | STAFF+ |
| `PATCH` | `/purchase-orders/:id` | Update PO | MANAGER+ |
| `DELETE` | `/purchase-orders/:id` | Cancel PO | MANAGER+ |
| `PATCH` | `/purchase-orders/:id/approve` | Approve PO | MANAGER+ |
| `PATCH` | `/purchase-orders/:id/send` | Mark as sent to vendor | MANAGER+ |
| `POST` | `/purchase-orders/:id/receive` | Record goods receipt | STAFF+ |
| `POST` | `/purchase-orders/:id/match-invoice` | Three-way match invoice | MANAGER+ |
| `GET` | `/purchase-orders/:id/matching-status` | Get matching detail | MANAGER+ |
| `GET` | `/purchase-orders/analytics` | Procurement analytics | MANAGER+ |

### `POST /purchase-orders`

**Request**:
```json
{
  "vendor": "65b22222...",
  "requisitionRef": "65d44444...",
  "items": [
    {
      "inventoryId": "65e55555...",
      "description": "Bearing Assembly 6205-2RS",
      "quantity": 50,
      "unit": "pcs",
      "unitPrice": 125,
      "taxRate": 18
    }
  ],
  "expectedDelivery": "2026-03-01",
  "paymentTerms": "NET_30",
  "deliveryAddress": "CoreOps Warehouse, Surat, Gujarat 395007",
  "notes": "Urgent: needed for PM schedule #PS-2026-0015"
}
```

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "_id": "65f66666...",
    "poNumber": "PO-20260215-0042",
    "vendor": { "_id": "65b22222...", "name": "SKF Bearings India" },
    "subtotal": 6250,
    "taxTotal": 1125,
    "grandTotal": 7375,
    "currency": "INR",
    "status": "DRAFT",
    "matchingStatus": "UNMATCHED",
    "approval": { "status": "PENDING" },
    "createdAt": "2026-02-15T10:30:00Z"
  }
}
```

### Goods Receipts

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/goods-receipts` | List GRNs | STAFF+ |
| `POST` | `/goods-receipts` | Create GRN | STAFF+ |
| `GET` | `/goods-receipts/:id` | Get GRN detail | STAFF+ |
| `PATCH` | `/goods-receipts/:id/inspect` | Update inspection result | MANAGER+ |

---

## 4.13 Financial & Accounting

### Chart of Accounts

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/chart-of-accounts` | List accounts (flat or tree) | MANAGER+ |
| `POST` | `/chart-of-accounts` | Create account | SUPER_ADMIN, MANAGER |
| `GET` | `/chart-of-accounts/:id` | Get account detail | MANAGER+ |
| `PATCH` | `/chart-of-accounts/:id` | Update account | SUPER_ADMIN |
| `GET` | `/chart-of-accounts/tree` | Full hierarchical tree | MANAGER+ |
| `GET` | `/chart-of-accounts/trial-balance` | Trial balance report | MANAGER+ |

### Journal Entries

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/journal-entries` | List entries | MANAGER+ |
| `POST` | `/journal-entries` | Create entry (draft) | MANAGER+ |
| `GET` | `/journal-entries/:id` | Get entry detail | MANAGER+ |
| `PATCH` | `/journal-entries/:id` | Update draft entry | MANAGER+ |
| `POST` | `/journal-entries/:id/post` | Post entry (update balances) | MANAGER+ |
| `POST` | `/journal-entries/:id/reverse` | Create reversing entry | MANAGER+ |

### Finance Logs (Transactions)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/finance-logs` | List transactions | STAFF+ |
| `POST` | `/finance-logs` | Record transaction | MANAGER+ |
| `GET` | `/finance-logs/:id` | Get transaction detail | STAFF+ |
| `PATCH` | `/finance-logs/:id` | Update transaction | MANAGER+ |
| `DELETE` | `/finance-logs/:id` | Void transaction | MANAGER+ |
| `GET` | `/finance-logs/analytics` | Financial analytics | MANAGER+ |
| `GET` | `/finance-logs/export` | Export to CSV/Excel | MANAGER+ |

### Budgets

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/budgets` | List budgets | MANAGER+ |
| `POST` | `/budgets` | Create budget | MANAGER+ |
| `GET` | `/budgets/:id` | Get budget detail | MANAGER+ |
| `PATCH` | `/budgets/:id` | Update budget | MANAGER+ |
| `GET` | `/budgets/:id/variance` | Budget vs actual analysis | MANAGER+ |

### Bank Reconciliation

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/bank-reconciliations` | List reconciliations | MANAGER+ |
| `POST` | `/bank-reconciliations` | Create reconciliation | MANAGER+ |
| `GET` | `/bank-reconciliations/:id` | Get detail | MANAGER+ |
| `PATCH` | `/bank-reconciliations/:id/match` | Match statement line | MANAGER+ |
| `POST` | `/bank-reconciliations/:id/import` | Import bank statement | MANAGER+ |
| `POST` | `/bank-reconciliations/:id/complete` | Mark complete | MANAGER+ |

### Financial Reports

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/reports/profit-loss` | P&L statement | MANAGER+ |
| `GET` | `/reports/balance-sheet` | Balance sheet | MANAGER+ |
| `GET` | `/reports/cash-flow` | Cash flow statement | MANAGER+ |
| `GET` | `/reports/trial-balance` | Trial balance | MANAGER+ |
| `GET` | `/reports/aged-receivables` | AR aging | MANAGER+ |
| `GET` | `/reports/aged-payables` | AP aging | MANAGER+ |
| `GET` | `/reports/tax-summary` | GST/VAT summary | MANAGER+ |

---

## 4.14 HR & People

### Employees

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/employees` | List employees | MANAGER+ |
| `POST` | `/employees` | Create employee | MANAGER+ |
| `GET` | `/employees/:id` | Get employee detail | MANAGER+ |
| `PATCH` | `/employees/:id` | Update employee | MANAGER+ |
| `DELETE` | `/employees/:id` | Terminate/archive | SUPER_ADMIN |
| `GET` | `/employees/:id/leave-balance` | Get leave balances | STAFF+ (own), MANAGER+ |
| `GET` | `/employees/:id/attendance` | Get attendance history | STAFF+ (own), MANAGER+ |
| `GET` | `/employees/:id/documents` | List documents | STAFF+ (own), MANAGER+ |
| `POST` | `/employees/:id/documents` | Upload document | STAFF+ (own), MANAGER+ |
| `GET` | `/employees/org-chart` | Organizational chart | Any auth user |

### Departments

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/departments` | List departments | Any auth user |
| `POST` | `/departments` | Create department | SUPER_ADMIN |
| `GET` | `/departments/:id` | Get department detail | Any auth user |
| `PATCH` | `/departments/:id` | Update department | SUPER_ADMIN, MANAGER |
| `GET` | `/departments/:id/employees` | List department employees | MANAGER+ |

### Leave Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/leave-requests` | List leave requests | STAFF+ |
| `POST` | `/leave-requests` | Submit leave request | STAFF+ |
| `GET` | `/leave-requests/:id` | Get request detail | STAFF+ |
| `PATCH` | `/leave-requests/:id/approve` | Approve/reject | MANAGER+ |
| `PATCH` | `/leave-requests/:id/cancel` | Cancel own request | Creator |
| `GET` | `/leave-requests/calendar` | Team leave calendar | MANAGER+ |
| `GET` | `/leave-requests/balance-summary` | Own balance summary | STAFF+ |

### Attendance

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/attendance/check-in` | Clock in | STAFF+ |
| `POST` | `/attendance/check-out` | Clock out | STAFF+ |
| `GET` | `/attendance` | List attendance records | MANAGER+ |
| `GET` | `/attendance/today` | Today's attendance report | MANAGER+ |
| `POST` | `/attendance/:id/regularize` | Regularize record | STAFF+ |
| `PATCH` | `/attendance/:id/regularize/approve` | Approve regularization | MANAGER+ |
| `GET` | `/attendance/report` | Monthly attendance report | MANAGER+ |

---

## 4.15 CRM & Sales

### Customers

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/customers` | List customers | STAFF+ |
| `POST` | `/customers` | Create customer | STAFF+ |
| `GET` | `/customers/:id` | Get customer detail | STAFF+ |
| `PATCH` | `/customers/:id` | Update customer | STAFF+ |
| `DELETE` | `/customers/:id` | Deactivate customer | MANAGER+ |
| `GET` | `/customers/:id/orders` | Customer order history | STAFF+ |
| `GET` | `/customers/:id/timeline` | Customer activity timeline | STAFF+ |

### Leads

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/leads` | List leads | STAFF+ |
| `POST` | `/leads` | Create lead | STAFF+ |
| `GET` | `/leads/:id` | Get lead detail | STAFF+ |
| `PATCH` | `/leads/:id` | Update lead | STAFF+ |
| `POST` | `/leads/:id/convert` | Convert to Customer + Opportunity | STAFF+ |
| `POST` | `/leads/:id/activity` | Log activity (call/email/meeting) | STAFF+ |
| `GET` | `/leads/pipeline` | Lead pipeline summary | MANAGER+ |

### Opportunities

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/opportunities` | List opportunities | STAFF+ |
| `POST` | `/opportunities` | Create opportunity | STAFF+ |
| `GET` | `/opportunities/:id` | Get opportunity detail | STAFF+ |
| `PATCH` | `/opportunities/:id` | Update opportunity | STAFF+ |
| `PATCH` | `/opportunities/:id/stage` | Move stage (updates history) | STAFF+ |
| `GET` | `/opportunities/pipeline` | Pipeline visualization data | MANAGER+ |
| `GET` | `/opportunities/forecast` | Revenue forecast | MANAGER+ |

### Sales Orders

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/sales-orders` | List sales orders | STAFF+ |
| `POST` | `/sales-orders` | Create sales order | STAFF+ |
| `GET` | `/sales-orders/:id` | Get order detail | STAFF+ |
| `PATCH` | `/sales-orders/:id` | Update order | STAFF+, MANAGER+ |
| `PATCH` | `/sales-orders/:id/status` | Update order status | MANAGER+ |
| `POST` | `/sales-orders/:id/invoice` | Generate invoice | MANAGER+ |
| `GET` | `/sales-orders/analytics` | Sales analytics | MANAGER+ |

---

## 4.16 Manufacturing

### Bills of Material

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/boms` | List BOMs | STAFF+ |
| `POST` | `/boms` | Create BOM | MANAGER+ |
| `GET` | `/boms/:id` | Get BOM detail (with items) | STAFF+ |
| `PATCH` | `/boms/:id` | Update BOM | MANAGER+ |
| `POST` | `/boms/:id/new-version` | Create new version | MANAGER+ |
| `GET` | `/boms/:id/cost-breakdown` | Material cost analysis | MANAGER+ |
| `GET` | `/boms/:id/where-used` | Where-used analysis | STAFF+ |

### BOM Items

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/boms/:bomId/items` | Add item to BOM | MANAGER+ |
| `PATCH` | `/boms/:bomId/items/:itemId` | Update BOM item | MANAGER+ |
| `DELETE` | `/boms/:bomId/items/:itemId` | Remove item from BOM | MANAGER+ |

### Work Orders

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/work-orders` | List work orders | STAFF+ |
| `POST` | `/work-orders` | Create work order | MANAGER+ |
| `GET` | `/work-orders/:id` | Get work order detail | STAFF+ |
| `PATCH` | `/work-orders/:id` | Update work order | MANAGER+ |
| `PATCH` | `/work-orders/:id/status` | Update status | TECHNICIAN+ |
| `POST` | `/work-orders/:id/issue-materials` | Issue materials | MANAGER+ |
| `POST` | `/work-orders/:id/production-log` | Log production output | TECHNICIAN+ |
| `GET` | `/work-orders/:id/progress` | Get operation progress | STAFF+ |

---

## 4.17 Quality & Compliance

### Quality Inspections

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/quality-inspections` | List inspections | STAFF+ |
| `POST` | `/quality-inspections` | Create inspection | MANAGER+ |
| `GET` | `/quality-inspections/:id` | Get inspection detail | STAFF+ |
| `PATCH` | `/quality-inspections/:id` | Update results | MANAGER+ |
| `POST` | `/quality-inspections/:id/complete` | Complete inspection | MANAGER+ |

### Non-Conformance Reports

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/ncrs` | List NCRs | STAFF+ |
| `POST` | `/ncrs` | Create NCR | STAFF+ |
| `GET` | `/ncrs/:id` | Get NCR detail | STAFF+ |
| `PATCH` | `/ncrs/:id` | Update NCR | MANAGER+ |
| `PATCH` | `/ncrs/:id/close` | Close NCR | MANAGER+ |

---

## 4.18 Projects & Tasks

### Projects

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/projects` | List projects | STAFF+ |
| `POST` | `/projects` | Create project | MANAGER+ |
| `GET` | `/projects/:id` | Get project detail | STAFF+ |
| `PATCH` | `/projects/:id` | Update project | MANAGER+ |
| `GET` | `/projects/:id/tasks` | List project tasks | STAFF+ |
| `GET` | `/projects/:id/gantt` | Gantt chart data | STAFF+ |
| `GET` | `/projects/:id/budget-report` | Budget vs actual | MANAGER+ |

### Tasks

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/tasks` | List tasks (cross-project) | STAFF+ |
| `POST` | `/tasks` | Create task | STAFF+ |
| `GET` | `/tasks/:id` | Get task detail | STAFF+ |
| `PATCH` | `/tasks/:id` | Update task | STAFF+ |
| `POST` | `/tasks/:id/time-log` | Log time | STAFF+ |
| `PATCH` | `/tasks/:id/status` | Update status | STAFF+ |

---

## 4.19 Documents & Communication

### Documents (DMS)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/documents` | List documents | STAFF+ |
| `POST` | `/documents` | Upload document | STAFF+ |
| `GET` | `/documents/:id` | Get document detail | STAFF+ |
| `GET` | `/documents/:id/download` | Download file | Auth user (if shared) |
| `POST` | `/documents/:id/new-version` | Upload new version | Author, MANAGER+ |
| `PATCH` | `/documents/:id/share` | Update sharing settings | Author, MANAGER+ |
| `DELETE` | `/documents/:id` | Delete document | Author, MANAGER+ |

### Comments

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/comments` | List comments for entity | Auth |
| `POST` | `/comments` | Create comment | Auth |
| `PATCH` | `/comments/:id` | Edit comment | Author |
| `DELETE` | `/comments/:id` | Delete comment | Author, MANAGER+ |
| `POST` | `/comments/:id/react` | Add reaction | Auth |

> Comments are queried with `entityType` and `entityId` params:  
> `GET /v1/comments?entityType=Maintenance&entityId=65c33333...`

### Notifications

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/notifications` | List user notifications | Auth |
| `PATCH` | `/notifications/:id/read` | Mark as read | Auth |
| `PATCH` | `/notifications/read-all` | Mark all as read | Auth |
| `GET` | `/notifications/unread-count` | Get unread count | Auth |
| `DELETE` | `/notifications/:id` | Delete notification | Auth |
| `PATCH` | `/notifications/preferences` | Update notification preferences | Auth |

### Messages

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/messages/conversations` | List conversations | Auth |
| `POST` | `/messages` | Send message | Auth |
| `GET` | `/messages/:conversationId` | Get conversation messages | Auth |
| `PATCH` | `/messages/:id` | Edit message | Author |
| `DELETE` | `/messages/:id` | Delete message | Author |

---

## 4.20 CoreAI & Analytics

### AI Insights

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/ai/insights` | List AI insights | MANAGER+ |
| `GET` | `/ai/insights/:id` | Get insight detail | MANAGER+ |
| `PATCH` | `/ai/insights/:id/acknowledge` | Acknowledge insight | MANAGER+ |
| `PATCH` | `/ai/insights/:id/dismiss` | Dismiss insight | MANAGER+ |
| `GET` | `/ai/predictions/maintenance` | Maintenance predictions | MANAGER+ |
| `GET` | `/ai/predictions/inventory` | Stock forecast | MANAGER+ |
| `GET` | `/ai/predictions/budget` | Budget forecast | MANAGER+ |

### AI Models (Admin)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/ai/models` | List registered models | SUPER_ADMIN |
| `GET` | `/ai/models/:id` | Get model detail | SUPER_ADMIN |
| `PATCH` | `/ai/models/:id/status` | Update model status | SUPER_ADMIN |

### Dashboard & Reports

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/dashboard/overview` | Global dashboard stats | MANAGER+ |
| `GET` | `/dashboard/office/:officeId` | Office-specific dashboard | STAFF+ |
| `GET` | `/reports/custom` | Custom report builder | MANAGER+ |
| `POST` | `/reports/export` | Export report (PDF/Excel) | MANAGER+ |

---

## 4.21 Audit & System

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/audit-logs` | List audit logs | SUPER_ADMIN |
| `GET` | `/audit-logs/:id` | Get log detail | SUPER_ADMIN |
| `GET` | `/audit-logs/entity/:type/:id` | Logs for specific entity | SUPER_ADMIN |
| `GET` | `/counters` | List counters | SUPER_ADMIN |
| `GET` | `/currency-rates` | List exchange rates | Any auth user |
| `POST` | `/currency-rates` | Create/update rate | SUPER_ADMIN |
| `GET` | `/system/health` | Health check | Public |
| `GET` | `/system/version` | API version info | Public |
| `GET` | `/system/config` | Client configuration | Auth |

---

## 4.22 WebSocket Events

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://api.coreops.app', {
  auth: { token: 'Bearer <access_token>' },
  query: { officeId: '65a67890...' },
});

socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', (reason) => console.log('Disconnected:', reason));
socket.on('error', (err) => console.error('Socket error:', err));
```

### Event Taxonomy

#### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `notification:new` | `{ id, title, message, type, entityType, entityId }` | New notification |
| `notification:count` | `{ unreadCount }` | Updated unread count |
| `maintenance:created` | `{ ticketId, ticketNumber, title, priority, assetName }` | New ticket created |
| `maintenance:assigned` | `{ ticketId, assignedTo, assignedBy }` | Ticket assigned |
| `maintenance:status_changed` | `{ ticketId, oldStatus, newStatus, updatedBy }` | Status update |
| `maintenance:approved` | `{ ticketId, approvedBy, status }` | Approval decision |
| `maintenance:sla_warning` | `{ ticketId, timeRemaining, slaType }` | SLA approaching breach |
| `maintenance:sla_breach` | `{ ticketId, slaType, breachedAt }` | SLA breached |
| `asset:status_changed` | `{ assetId, guai, oldStatus, newStatus }` | Asset status change |
| `asset:transferred` | `{ assetId, guai, fromOffice, toOffice }` | Asset transfer |
| `inventory:low_stock` | `{ itemId, sku, name, currentStock, reorderPoint }` | Low stock alert |
| `inventory:stock_updated` | `{ itemId, sku, oldQty, newQty, reason }` | Stock level change |
| `po:status_changed` | `{ poId, poNumber, oldStatus, newStatus }` | PO status update |
| `po:approval_required` | `{ poId, poNumber, amount, requestedBy }` | PO needs approval |
| `po:received` | `{ poId, poNumber, grnNumber, itemsReceived }` | Goods received |
| `finance:transaction_posted` | `{ transactionId, type, amount, currency }` | Transaction posted |
| `finance:budget_alert` | `{ budgetId, name, consumedPercent, threshold }` | Budget threshold hit |
| `leave:requested` | `{ requestId, employeeName, leaveType, dates }` | Leave request submitted |
| `leave:decision` | `{ requestId, status, approvedBy }` | Leave approved/rejected |
| `comment:new` | `{ commentId, entityType, entityId, authorName, preview }` | New comment |
| `message:new` | `{ messageId, conversationId, sender, preview }` | New chat message |
| `ai:insight` | `{ insightId, type, title, impact, confidence }` | New AI insight |
| `iot:anomaly` | `{ assetId, sensorType, value, threshold }` | Sensor anomaly detected |
| `system:announcement` | `{ message, severity, expiresAt }` | System-wide notice |

#### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join:office` | `{ officeId }` | Join office room |
| `leave:office` | `{ officeId }` | Leave office room |
| `join:entity` | `{ entityType, entityId }` | Subscribe to entity updates |
| `leave:entity` | `{ entityType, entityId }` | Unsubscribe from entity |
| `typing:start` | `{ conversationId }` | User started typing |
| `typing:stop` | `{ conversationId }` | User stopped typing |
| `notification:read` | `{ notificationId }` | Mark notification read |

### Room Structure

```
/                          ← global broadcasts
  /office:{officeId}       ← office-scoped events
    /user:{userId}         ← personal notifications
    /entity:{type}:{id}    ← entity-specific updates (e.g., viewing a ticket)
    /channel:{channelId}   ← chat channels
```

---

## 4.23 Endpoint Summary

| Module | Section | Endpoints | Primary Models |
|--------|---------|-----------|----------------|
| Auth & Sessions | 4.6 | 21 | User |
| User Management | 4.7 | 8 | User |
| Office Management | 4.8 | 7 | Office |
| Asset Management | 4.9 | 12 | Asset |
| Maintenance & CMMS | 4.10 | 24 | Maintenance, PreventiveSchedule, IoTSensorReading |
| Inventory & Warehouse | 4.11 | 24 | Inventory, WarehouseLocation, StockTransfer, StockAdjustment |
| Procurement | 4.12 | 30 | Vendor, PurchaseRequisition, PurchaseOrder, GoodsReceipt |
| Financial & Accounting | 4.13 | 37 | ChartOfAccount, JournalEntry, FinanceLog, Budget, BankReconciliation |
| HR & People | 4.14 | 29 | Employee, Department, LeaveRequest, Attendance |
| CRM & Sales | 4.15 | 28 | Customer, Lead, Opportunity, SalesOrder |
| Manufacturing | 4.16 | 18 | BillOfMaterial, BOMItem, WorkOrder, ProductionLog |
| Quality & Compliance | 4.17 | 10 | QualityInspection, NonConformanceReport |
| Projects & Tasks | 4.18 | 13 | Project, Task |
| Documents & Communication | 4.19 | 23 | Document, Comment, Notification, Message |
| CoreAI & Analytics | 4.20 | 14 | AIInsight, AIModel |
| Audit & System | 4.21 | 9 | AuditLog, Counter, CurrencyRate |
| WebSocket Events | 4.22 | 30 events | Real-time (Socket.IO) |
| **Total** | | **307 endpoints** + **30 WebSocket events** | **44 models** |
