# CoreOps ERP Master Architecture Blueprint

Date: 2026-03-22
Status: Active single source of truth
Owner: Core platform team

## 1. Why this document exists

This file is the canonical architecture reference for CoreOps ERP.

It replaces fragmented planning by unifying:

1. What is actually implemented now.
2. What is partially implemented and risky.
3. What is missing for Tier-1 depth.
4. The execution sequence to close gaps without breaking current operations.

If there is any conflict between older planning docs and this file, this file is the source of truth.

## 2. Current architecture snapshot

### 2.1 Topology

CoreOps is a modular monolith with event-driven internals.

1. Frontend: React + TypeScript + Vite with role-gated routes.
2. Backend: Express + Prisma + PostgreSQL.
3. Realtime: Socket.IO office-scoped channels.
4. AI layer: intent classification + orchestration + agent execution.
5. Event layer: in-memory bus with optional Kafka and durable outbox replay.

### 2.2 Runtime flow

1. Client request enters API with request and trace identifiers.
2. Middleware applies auth, RBAC, validation, and rate limits.
3. Controllers call domain services and Prisma transactions.
4. Domain events are published to event bus and persisted in outbox store.
5. Automation engine consumes events with inbox dedupe.
6. Socket events notify clients for near-real-time updates.

### 2.3 Architectural style statement

CoreOps is currently a service-oriented modular monolith ready for bounded-context extraction, not a deployed microservice architecture.

## 3. What we actually have today

### 3.1 Implemented domains

1. Asset lifecycle and maintenance: strong.
2. Inventory and stock operations: strong.
3. Procurement foundations with PO and GRN flows: strong partial.
4. Finance and GL foundation with auto-posting and reports: strong partial.
5. HCM base (employee, attendance, leave, payroll): partial.
6. CRM/Sales base (customers, quotations, sales orders): partial.
7. Notifications, audit, documents, OCR, analytics: strong.
8. AI orchestration and cross-module command execution: strong.

### 3.2 New platform controls already integrated

1. Event catalog with version and ownership metadata.
2. Durable outbox persistence and replay processor.
3. Inbox dedupe for consumer-safe event processing.
4. Request and trace propagation from API into context and events.
5. Idempotency middleware on critical mutation routes.

### 3.3 Phase 1 finance module integrated end-to-end

1. Backend APIs for intercompany, consolidation, revenue recognition schedule, and close cockpit.
2. Frontend control plane page integrated in routes, sidebar navigation, and Financial workspace entry path.

## 4. What is missing or shallow

### 4.1 Tier-1 missing domains

1. Manufacturing: BOM, MRP, routing, production orders, quality gates.
2. Project management: project costing, resource planning, milestone billing.
3. Advanced service operations: dispatch optimization, field routing depth.
4. Retail/POS suite.
5. Developer ecosystem: SDK, plugin runtime, extension governance.

### 4.2 Finance depth still required

1. Full multi-entity consolidation control tower and close orchestration workflows.
2. Revenue recognition policy engine breadth for complex contracts.
3. Intercompany settlement and reconciliation automation.
4. Stronger AP/AR operational completeness and controls in one cockpit.

### 4.3 Operational maturity gaps

1. End-to-end distributed tracing and observability dashboards.
2. Deeper test automation coverage across critical workflows.
3. Dead-letter and failure remediation flows for asynchronous processing.
4. API lifecycle governance and versioning strategy.

## 5. Target architecture state

### 5.1 Design principles

1. Single business event taxonomy across all domains.
2. Idempotent, replay-safe, auditable critical writes by default.
3. Financial integrity first: every monetized operation posts and reconciles.
4. Bounded contexts with clear contracts before service extraction.
5. AI as controlled copilot: explainable, permissioned, and review-gated.

### 5.2 Bounded contexts

1. Identity and access.
2. Finance core.
3. Procurement.
4. Inventory and warehouse.
5. Assets and maintenance.
6. Sales and CRM.
7. HCM and payroll.
8. Workflow and automation.
9. AI orchestration.
10. Reporting and analytics.

### 5.3 Event contract model

Each business event must include:

1. Event name and version.
2. Deterministic event identifier.
3. Trace identifier and actor context.
4. Tenant or office context.
5. Stable payload schema and owner domain.

## 6. Data architecture

### 6.1 Current

Single PostgreSQL database with Prisma schema and strong relational core.

Detailed blueprint and upgrade roadmap: [docs/data-schema-top-tier-improvement-plan.md](docs/data-schema-top-tier-improvement-plan.md)

### 6.2 Direction

1. Keep shared relational truth while enforcing bounded context ownership.
2. Promote heavily queried JSON blobs to relational tables where needed.
3. Add explicit schema governance for breaking changes.
4. Define read models for analytics and operational dashboards.

## 7. Security and governance architecture

1. Maintain RBAC baseline with stronger field and row policy controls.
2. Standardize audit for all privileged and financial actions.
3. Enforce idempotency for all financially impactful writes.
4. Add centralized policy packs for compliance readiness.

## 8. Execution roadmap

### Phase A: Stabilize and align (2 to 4 weeks)

1. Treat this document as canonical and align docs and claims.
2. Close finance API and workflow inconsistencies.
3. Add architecture acceptance checks in CI.
4. Add risk register and ownership per domain.

### Phase B: Finance depth hardening (6 to 8 weeks)

1. Expand close cockpit controls and period governance.
2. Deepen intercompany settlement and elimination automation.
3. Extend revenue recognition policy coverage and audit explainability.
4. Complete AP/AR control loops in one operator workflow.

### Phase C: Missing core domains (10 to 14 weeks)

1. Manufacturing minimum viable suite.
2. Project-service core domain.
3. Advanced SCM operations and logistics controls.

### Phase D: Platformization (8 to 12 weeks)

1. SDK and plugin runtime.
2. Public extension contracts and lifecycle controls.
3. Multi-tenant hardening and deployment reliability controls.

## 9. Definition of done for architecture changes

A major architecture item is done only when all are true:

1. Domain contract documented in this file and linked implementation docs.
2. Backend APIs and event contracts implemented and versioned.
3. Frontend workflow exposed to intended roles.
4. Idempotency, audit, and trace behavior verified.
5. Monitoring and failure handling documented.
6. Regression tests added for critical flows.

## 10. Change governance

### 10.1 Update protocol

When architecture changes, update in same pull request:

1. This file.
2. Domain-specific implementation docs.
3. API references and route inventory.
4. Risk register entries.

### 10.2 Evidence links for current system

Backend entry and route composition:

1. [backend/app.js](backend/app.js)
2. [backend/server.js](backend/server.js)

Core architecture controls:

1. [backend/src/coreops/eventBus.js](backend/src/coreops/eventBus.js)
2. [backend/src/coreops/outboxProcessor.js](backend/src/coreops/outboxProcessor.js)
3. [backend/src/coreops/automationEngine.js](backend/src/coreops/automationEngine.js)
4. [backend/src/coreops/eventCatalog.js](backend/src/coreops/eventCatalog.js)
5. [backend/src/coreops/inboxStore.js](backend/src/coreops/inboxStore.js)

Context and idempotency foundations:

1. [backend/src/middleware/context.js](backend/src/middleware/context.js)
2. [backend/src/middleware/verifyToken.js](backend/src/middleware/verifyToken.js)
3. [backend/src/middleware/idempotency.js](backend/src/middleware/idempotency.js)

Finance Phase 1 backend and route integration:

1. [backend/src/controllers/financePhase1Controller.js](backend/src/controllers/financePhase1Controller.js)
2. [backend/src/routes/financeExtRoutes.js](backend/src/routes/financeExtRoutes.js)

Frontend route and navigation integration:

1. [frontend/src/App.tsx](frontend/src/App.tsx)
2. [frontend/src/config/roleConfig.ts](frontend/src/config/roleConfig.ts)
3. [frontend/src/pages/financial/Phase1ControlPlane.tsx](frontend/src/pages/financial/Phase1ControlPlane.tsx)
4. [frontend/src/pages/financial/Financial.tsx](frontend/src/pages/financial/Financial.tsx)

Data model baseline:

1. [backend/prisma/schema.prisma](backend/prisma/schema.prisma)

## 11. Immediate next actions

1. Reconcile and mark legacy planning docs as superseded or aligned to this file.
2. Create architecture decision records for Phase B finance hardening items.
3. Add CI check that fails on undocumented route additions in finance and core domains.
4. Produce one domain matrix document mapping each business capability to models, APIs, UI, and events.
5. Execute the schema package defined in [docs/data-schema-top-tier-improvement-plan.md](docs/data-schema-top-tier-improvement-plan.md).
