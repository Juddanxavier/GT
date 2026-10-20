---
status: resolved
trigger: "why we are showing exception in timeline"
created: 2026-10-20T09:40:00Z
updated: 2026-10-20T09:55:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: resolved
test: GET /api/shipments/878809797103 and compare the resolved id with the active row
expecting: the active shipment, with in_transit events
next_action: none

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: The timeline shows In Transit for carrier transit scans.
actual: Every event shows Exception, including scans added after the normalizer fix; the newest scan is MEMPHIS 20 Oct 09:36.
errors: none.
reproduction: Open /shipments/878809797103 in the admin app.
started: After the shipment was archived and recreated under the same tracking number.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: The normalizer regressed or new events bypass it.
  evidence: The active row 9cfc7583 has in_transit events for the exact same scans; only the archived row ec399acb stores exception.
  timestamp: 2026-10-20T09:44:00Z
- hypothesis: The timeline renders its own status mapping.
  evidence: TrackingTimeline uses STATUS_META[event.status]; event.status comes from the API.
  timestamp: 2026-10-20T09:45:00Z
- hypothesis: The displayed time is wrong (09:36 for a 22:36Z scan).
  evidence: 17TRACK reports time_utc 2026-10-20T04:06:00Z for the Memphis scan; 09:36 is the correct IST rendering.
  timestamp: 2026-10-20T09:46:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-10-20T09:42:00Z
  checked: shipment rows for tracking 878809797103
  found: three rows - ec399acb (archived, exception events), da781a3b (archived, fixed events), 9cfc7583 (active, fixed events).
  implication: The tracking number is reused after archiving, so resolution must pick the active row.
- timestamp: 2026-10-20T09:43:00Z
  checked: GET /api/shipments/878809797103
  found: resolved id ec399acb... with status exception, archived 2026-10-20T07:04:57Z.
  implication: The detail URL loads the archived row, not the active one.
- timestamp: 2026-10-20T09:44:00Z
  checked: apps/admin shipment links and services/shipment-resolve.ts
  found: rows link to /shipments/{trackingNumber}; resolveShipmentId matched trackingNo with `.limit(1)` and no archive filter or ordering.
  implication: Any of the duplicate rows could be returned, in practice the oldest one.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: The admin links shipments by tracking number. After a shipment was archived and recreated under the same number, resolveShipmentId matched the tracking number with `.limit(1)` and no archive filter or ordering, so it returned the archived pre-fix row whose events were stored as exception.
fix: Resolution by tracking number now prefers the active shipment (newest first) and only falls back to the most recent archived row; UUID lookups still return the exact row, so archived history stays reachable.
verification: GET /api/shipments/878809797103 now returns 9cfc7583 (in_transit) with in_transit events; the archived row is still reachable by its UUID; 465 tests pass.
files_changed:
  - apps/api/src/services/shipment-resolve.ts
  - apps/api/src/services/shipment-resolve.test.ts
  - apps/api/src/routes/shipments.test.ts
