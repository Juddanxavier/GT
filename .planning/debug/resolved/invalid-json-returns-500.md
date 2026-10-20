---
status: resolved
trigger: "so it will work now, no validation errors nothing?"
created: 2026-10-20T08:02:00Z
updated: 2026-10-20T08:03:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: resolved
test: POST malformed and truncated JSON to /api/shipments after the fix
expecting: 400 INVALID_JSON with a request id
next_action: none

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: A body that is not valid JSON returns 400 with a client-error code.
actual: 500 INTERNAL_ERROR with the parser message leaked in non-production, and the SyntaxError reported to Sentry.
errors: {"error":{"code":"INTERNAL_ERROR","message":"Internal server error: Expected property name or '}' in JSON at position 1"}} at HTTP 500.
reproduction: POST /api/shipments with body `{bad json`.
started: Always. The global app.onError maps every error to 500.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: The route validates the body before parsing, so a bad body becomes a validation error.
  evidence: routes call `await c.req.json()` first; the parse throws before zod runs.
  timestamp: 2026-10-20T08:01:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-10-20T08:01:00Z
  checked: apps/api/src/index.ts app.onError
  found: no SyntaxError or HTTPException branch; everything becomes INTERNAL_ERROR 500 and a Sentry event.
  implication: Client mistakes are reported as server faults across every JSON route.
- timestamp: 2026-10-20T08:03:00Z
  checked: POST /api/shipments with `{bad json` and `{"trackingNo":` after the fix
  found: both return 400 INVALID_JSON with a requestId.
  implication: Parse failures are now client errors and no longer reach Sentry.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: The global error handler had no branch for JSON parse failures, so `await c.req.json()` throwing SyntaxError surfaced as 500 and was captured by Sentry.
fix: Detect SyntaxError in app.onError and return 400 INVALID_JSON (logged as a warning, not sent to Sentry).
verification: Malformed and truncated bodies return 400 INVALID_JSON; valid requests, validation (400) and duplicate detection (409) unchanged.
files_changed:
  - apps/api/src/index.ts
