---
status: resolved
trigger: "fix it"
created: 2026-10-20T08:35:00Z
updated: 2026-10-20T09:32:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: resolved
test: PATCH custom origin/destination, then re-track via the manual route and via a queued worker job
expecting: stored values survive both paths
next_action: none

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Origin and destination entered by the admin stay as entered.
actual: The first carrier track replaces them with provider metadata (e.g. "CHENNAI, TN, IN"), silently discarding the admin input.
errors: none - data overwrite.
reproduction: Create a shipment with origin/destination, let the track job run, then GET the shipment.
started: always.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: Only the background job overwrites the values.
  evidence: POST /api/shipments/:id/track has its own update query and also prefers result.origin.
  timestamp: 2026-10-20T09:20:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-10-20T09:18:00Z
  checked: performTracking() in apps/api/src/services/shipment.ts
  found: `origin: trackResult.origin ?? extra.origin ?? null` - carrier value takes precedence.
  implication: Admin input is only a fallback.
- timestamp: 2026-10-20T09:19:00Z
  checked: POST /api/shipments/:id/track in apps/api/src/routes/shipments.ts
  found: `origin: result.origin ?? shipment.origin ?? null`.
  implication: Same precedence in the manual route.
- timestamp: 2026-10-20T09:31:00Z
  checked: re-track with stored origin "MUMBAI CUSTOM HUB" plus a queued job whose payload said "STALE JOB ORIGIN"
  found: stored values kept after both the manual route and the worker job.
  implication: The DB row is authoritative; stale job payloads cannot overwrite admin edits.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: Both tracking paths preferred carrier metadata over stored values (`trackResult.origin ?? extra.origin`, `result.origin ?? shipment.origin`), so the first successful track overwrote admin input.
fix: Prefer the stored/admin value and let carrier data only fill empty fields. performTracking() now reads the current origin/destination from the shipment row (job payloads can predate an admin edit) before building the update.
verification: Manual re-track and a queued worker job both kept custom values; demo values restored to the carrier data afterwards.
files_changed:
  - apps/api/src/services/shipment.ts
  - apps/api/src/routes/shipments.ts
