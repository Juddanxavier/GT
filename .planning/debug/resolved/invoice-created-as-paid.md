---
status: resolved
trigger: "yes and invoice are paid always"
created: 2026-10-20T08:20:00Z
updated: 2026-10-20T08:30:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: resolved
test: create a shipment with billAmount, then read the generated invoice
expecting: status unpaid, paidAt null
next_action: none

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: A newly generated invoice is unpaid until payment is recorded.
actual: Every invoice is born `paid` with `paidAt` set, so revenue KPIs count unpaid work as collected.
errors: none - wrong data.
reproduction: POST /api/shipments with billAmount > 0 and wait for the invoice job.
started: always.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: The UI or a later job marks invoices paid.
  evidence: invoice rows have paidAt within ~0.6s of createdAt and emailCount 0; no payment action exists.
  timestamp: 2026-10-20T08:18:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-10-20T08:17:00Z
  checked: autoCreateInvoice() and POST /api/invoices
  found: both insert `status: 'paid'`, `paidAt: now`.
  implication: Both creation paths mark payment unconditionally.
- timestamp: 2026-10-20T08:19:00Z
  checked: invoice table rows
  found: 5 paid rows with email_count=0 and paidAt < 5s after createdAt, plus 1 unpaid row still carrying paidAt.
  implication: The signature identifies rows created by this bug; PATCH also failed to keep paidAt in sync.
- timestamp: 2026-10-20T08:26:00Z
  checked: shipment creation with billAmount 1750 after the fix
  found: INV-202610-4378E is `unpaid` with paidAt null.
  implication: Creation now defaults correctly.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: Both invoice creation paths hardcoded status 'paid' and paidAt at creation time; no payment was ever recorded. PATCH /api/invoices/:id also never updated paidAt when status changed.
fix: Create invoices as 'unpaid' with paidAt null in both autoCreateInvoice() and POST /api/invoices; PATCH now sets paidAt when status becomes 'paid' and clears it otherwise.
verification: New invoice unpaid/paidAt null; PATCH paid -> paidAt set, PATCH unpaid -> paidAt null; backfilled 6 existing rows (5 wrongly paid + 1 unpaid with a stray paidAt) using the auto-creation signature.
files_changed:
  - apps/api/src/services/shipment.ts
  - apps/api/src/routes/invoices.ts
