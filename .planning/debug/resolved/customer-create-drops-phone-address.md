---
status: resolved
trigger: "yes and invoice are paid always"
created: 2026-10-20T08:20:00Z
updated: 2026-10-20T08:30:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: resolved
test: POST /api/customers with phone + address, then GET the new customer
expecting: both fields persisted and returned
next_action: none

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: A customer created with phone and address stores and returns them.
actual: 201, but `phone` and `address` are null; only a later PATCH persists them.
errors: none - silent data loss.
reproduction: POST /api/customers {"name":"X","email":"x@y.z","phone":"+91 9876500001","address":{...}}.
started: always.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: The schema rejects phone/address, so they never reach the handler.
  evidence: adminCreateCustomerSchema already validates both fields.
  timestamp: 2026-10-20T08:18:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-10-20T08:17:00Z
  checked: apps/api/src/routes/customers.ts POST handler
  found: createUser() is called with email/password/name/role/tenantId/branchId only; phone and address are never read from parsed.data.
  implication: The fields are validated and then discarded.
- timestamp: 2026-10-20T08:18:00Z
  checked: packages/auth-config/src/index.ts additionalFields
  found: only tenantId and branchId are registered, so createUser() cannot persist phone/address either.
  implication: The values must be written directly to the user row.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: The POST /api/customers handler ignored parsed.data.phone and parsed.data.address, and phone/address are not Better Auth additional fields, so createUser() would not have saved them even if passed.
fix: After createUser(), update the user row with phone/address and return the updated row. Also made email required in the admin create schema (Better Auth needs it), so a missing email returns 400 instead of failing deeper.
verification: POST with phone + address returns both and GET /api/customers/:id reads them back; POST without email returns 400; POST with email returns 201.
files_changed:
  - apps/api/src/routes/customers.ts
