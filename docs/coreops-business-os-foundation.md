# CoreOps Business OS Foundation

This document describes the unified enterprise foundation implemented for CoreOps.

## Implemented Baseline

- Unified entity graph endpoint and shared-domain contract.
- Event-driven automation engine for cross-module orchestration.
- AI-native copilot endpoint with cross-module context grounding.
- Real-time propagation of domain events through Socket.IO office channels.
- API-first integration surface for architecture introspection and automation.

## API Surface

Base path: /api/coreops

### GET /api/coreops/architecture

Returns:

- Shared entities and implementation mapping.
- Cross-module flow definitions.
- Workflow automation rules.
- Integration mode (in-memory or kafka+inmemory event bus).

### GET /api/coreops/context

Returns unified cross-module context snapshot:

- Users, employees, customers, vendors.
- Products (inventory), assets, invoices, transactions, documents.
- Open operational tasks.
- Recent unified activity timeline from audit logs.

### POST /api/coreops/events/publish

Publishes a domain event into the unified event bus and runs rule-based automation.

Request body example:

```json
{
  "eventName": "inventory.low_stock.detected",
  "payload": {
    "inventoryId": "inv_123",
    "inventoryName": "Industrial Lubricant",
    "availableQty": 5,
    "reorderLevel": 10
  }
}
```

Response includes:

- Event envelope.
- Executed workflow rules.

### POST /api/coreops/copilot/query

Runs AI query against a cross-module context snapshot and orchestrator.

Request body example:

```json
{
  "query": "Show top performing employees this quarter and any payroll anomalies",
  "providerPreference": "openai",
  "modelPreference": "gpt-4.1"
}
```

Response includes:

- Context snapshot used for grounding.
- AI orchestration result.

## Event-Driven Rules Implemented

1. crm.deal.submitted

- If deal value exceeds threshold, publish workflow.approval.required.

1. hcm.leave.submitted

- If leave exceeds policy limit, publish workflow.approval.required.

1. finance.invoice.overdue

- Send manager notifications.
- Broadcast realtime office event.
- Publish finance.collection.reminder.requested.

1. inventory.low_stock.detected

- Publish procurement.requisition.auto_requested.

## Realtime Design

- Office-scoped broadcasts use Socket.IO room pattern office:{officeId}.
- CoreOps events emit on:
- coreops.domain.event
- coreops.copilot.query
- finance.invoice.overdue

## Kafka Enablement

Current event bus uses in-memory mode by default.
If KAFKA_BROKERS is configured, the bus auto-attempts Kafka producer initialization.

Environment examples:

- KAFKA_BROKERS=broker1:9092,broker2:9092
- KAFKA_CLIENT_ID=coreops-backend
- KAFKA_TOPIC_COREOPS=coreops-events
- KAFKA_SSL=true
- KAFKA_USERNAME=...
- KAFKA_PASSWORD=...

Optional dependency for broker publishing:

- npm install kafkajs

## Target Operating Model

This baseline is unified-first while supporting future microservice extraction:

- Unified domain contracts and event envelopes are in place.
- Existing module APIs can be split into bounded services incrementally.
- Event consumers can be externalized without schema rewrites.

## Next Hardening Milestones

1. Introduce outbox table for guaranteed event delivery.
1. Add workflow rule persistence with versioning and simulation mode.
1. Add GraphQL gateway over unified context.

1. Add AI feature services: lead scoring, attrition prediction, payroll anomaly detector, demand forecasting, and predictive maintenance service.

1. Add policy engine for field-level permissions.
1. Add SSO and MFA rollout path and disaster-recovery testing runbook.
