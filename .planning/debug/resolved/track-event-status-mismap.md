---
status: resolved
trigger: "lets test new shipment and shipment module and this is 878809797103 tracking code to test"
created: 2026-10-20T07:28:09Z
updated: 2026-10-20T07:38:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: resolved
test: re-tracked the live shipment and re-ran the unit suite
expecting: in_transit across all transit scans, no exception alert
next_action: none

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: A moving FedEx shipment shows status `in_transit`; event history shows in_transit per scan; no exception alert.
actual: Shipment status is `exception`, all 9 in-transit events are stored as `exception`, customer dashboard shows "Exception reported" and an "Exception" notification is created.
errors: None in logs. 17TRACK returns HTTP 200 with valid data.
reproduction: Create a shipment with a live FedEx tracking number (878809797103) and let the track job run.
started: Always broken for carriers that report sub-stages (every FedEx shipment in the test data).

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: 17TRACK itself reports the shipment as an exception.
  evidence: Direct API call returns latest_status InTransit/InTransit_Other; event descriptions are ordinary transit scans.
  timestamp: 2026-10-20T07:10:00Z
- hypothesis: The provider passes the wrong field, so normalizeStatus never sees the sub-stage.
  evidence: Raw gettrackinfo shows `stage: null` on most events and `stage: "PickedUp"` on one; both paths reach normalizeStatus unchanged.
  timestamp: 2026-10-20T07:34:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-10-20T07:05:00Z
  checked: GET /api/shipments/da781a3b/tracking after the track job ran
  found: 9 events stored with status `exception`, sub_status `InTransit_Other` / `InTransit_PickedUp` / `InTransit_CustomsReleased`; shipment status `exception`.
  implication: The mapping fails on sub-stages, not on provider data.
- timestamp: 2026-10-20T07:12:00Z
  checked: apps/api/src/shipment-providers/normalizer.ts normalizeStatus()
  found: exact match against INTERNAL_SET and STATUS_MAP, then `?? 'exception'`.
  implication: Every unknown string, including valid sub-stages, becomes a false exception.
- timestamp: 2026-10-20T07:14:00Z
  checked: notification rows for the test customer
  found: "Shipment 878809797103 Exception" in-app notification created; exception is a MAJOR_EVENT so email/WhatsApp dispatch is attempted.
  implication: The false mapping produces customer-facing alerts.
- timestamp: 2026-10-20T07:34:00Z
  checked: raw 17TRACK gettrackinfo payload
  found: event `stage` values are `null`, `PickedUp`, `InfoReceived`; sub_status carries the `InTransit_*` family.
  implication: Prefix matching alone leaves PickedUp unmapped; it needs an explicit entry.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: normalizeStatus() only matched exact stage names and defaulted every unmatched string to `exception`, so 17TRACK sub-stages (InTransit_PickedUp, InTransit_CustomsReleased, ...) and the granular PickedUp stage were stored and alerted as exceptions.
fix: Match the longest known stage prefix (sub-stage inherits its parent), map the granular PickedUp stage to in_transit, and default genuinely unknown stages to the neutral `pending` instead of `exception`.
verification: 12 unit tests pass; live re-track of 878809797103 returned currentStatus in_transit, all 10 events stored correctly, and the customer dashboard now reports inTransit:1 / exception:0 with no alerts.
files_changed:
  - apps/api/src/shipment-providers/normalizer.ts
  - apps/api/src/shipment-providers/normalizer.test.ts
