---
status: resolved
trigger: "yes and invoice are paid always"
created: 2026-10-20T08:20:00Z
updated: 2026-10-20T08:30:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: resolved
test: POST /api/shipments and inspect labelCode in the response
expecting: the generated GT- code, not null
next_action: none

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: The create response contains the generated labelCode.
actual: `"labelCode": null`; a follow-up GET shows GT-XXXXXXX.
errors: none.
reproduction: POST /api/shipments with any tracking number.
started: always.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: The labelCode update fails or is skipped.
  evidence: The row has the code immediately after creation, so the update commits.
  timestamp: 2026-10-20T08:19:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-10-20T08:19:00Z
  checked: createShipment() in apps/api/src/services/shipment.ts
  found: the INSERT's .returning() row is kept in `row`; the labelCode UPDATE runs afterwards without reassigning `row`.
  implication: The response returns the pre-update snapshot.
- timestamp: 2026-10-20T08:23:00Z
  checked: POST /api/shipments after the fix
  found: response includes "labelCode":"GT-4378E95".
  implication: Returning the UPDATE's row fixes it inside the same transaction.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: The create response returned the INSERT's returning() row, captured before the labelCode UPDATE in the same transaction.
fix: Capture the UPDATE ... RETURNING row and return it from createShipment().
verification: A fresh shipment response carries GT-4378E95; archived after the test.
files_changed:
  - apps/api/src/services/shipment.ts
