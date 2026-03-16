---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: Enhanced Audit Trail & Compliance

## Objective
Implement field-level change tracking and an upgraded visual Audit Logs UI to meet enterprise compliance standards.

## Context
- .gsd/SPEC.md
- backend/src/config/prisma.js
- backend/src/middleware/auditMiddleware.js
- frontend/src/pages/AuditLogs.tsx

## Tasks

<task type="auto">
  <name>Implement Field-Level Audit Logging</name>
  <files>
    - backend/src/config/prisma.js
    - backend/src/middleware/auditMiddleware.js
  </files>
  <action>
    - Modify `config/prisma.js` to create a Prisma Client extension (`$extends`) that hooks into `$allModels` `update` operations.
    - During an `update`, fetch the current record (before), perform the update (after), compute the diff (`{ field, old, new }`), and extract the `userId` from asynchronous context (`async_hooks`) or via the `auditMiddleware.js`.
    - Since passing req.user to Prisma models is tricky, the easiest approach is to have `auditMiddleware.js` continue doing the basic logging, but explicitly use `res.locals` to pass before/after snapshots for updates if we intercept them in the controller, OR use Node's `AsyncLocalStorage` in the middleware to make `userId` available to Prisma.
    - Given the existing architecture, implement Node's `AsyncLocalStorage` in a new `backend/src/middleware/context.js` file, wrap the app in it, and use it in `config/prisma.js` to get the current user, action, and resourceType. Automatically log field diffs to `AuditLog.changes` as a JSON array.
  </action>
  <verify>curl -X GET "http://localhost:5000/api/audit-logs"</verify>
  <done>Prisma automatically captures old and new values for updates and writes them to the `changes` column in `AuditLog`.</done>
</task>

<task type="auto">
  <name>Enhance AuditLogs UI with Visual Diffs</name>
  <files>
    - frontend/src/pages/AuditLogs.tsx
  </files>
  <action>
    - Modify `AuditLogs.tsx` to display field-level diffs visually instead of just raw JSON stringified output.
    - In the detail modal, parse the `changes` array (which should be shaped like `[{ field, old, new }]`).
    - Render a clean table or list showing the Field Name, Old Value (red with strikethrough), and New Value (green).
  </action>
  <verify>Navigate to /audit-logs in the frontend and open the details modal for an update event.</verify>
  <done>Audit log details correctly format `old` and `new` changes with visual diffs.</done>
</task>

## Success Criteria
- [ ] Updating a record automatically creates an AuditLog with the exact field changes recorded.
- [ ] AuditLogs UI displays `old` and `new` values with clear visual distinction (red/green).
