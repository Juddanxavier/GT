---
status: resolved
trigger: "fix it"
created: 2026-10-20T08:35:00Z
updated: 2026-10-20T09:32:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: resolved
test: POST /api/shipments and /api/track/claim/init with short and invalid tracking numbers
expecting: 400 with a field message
next_action: none

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Tracking numbers are validated like the admin form (3-64 chars, alphanumerics plus space - _ / .).
actual: The API accepted "AB" and "!!!", created a shipment, and then the carrier rejected registration, leaving it pending.
errors: none - the request returned 201.
reproduction: POST /api/shipments {"trackingNo":"AB"}.
started: always.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: The admin form has the same gap.
  evidence: apps/admin/lib/shipment-form-validation.ts already enforces min 3, max 64 and the character class; only the API was lax.
  timestamp: 2026-10-20T09:15:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-10-20T09:14:00Z
  checked: apps/api/src/validators/index.ts createShipmentSchema
  found: `trackingNo: z.string().min(1).max(255).transform(stripHtml)`.
  implication: One-character and punctuation-only values pass.
- timestamp: 2026-10-20T09:16:00Z
  checked: claim-shipment.ts
  found: claimSchema allowed min 1, and claim/init + resend-otp bypassed zod with a manual `typeof` check.
  implication: The public claim flow accepted the same bad values.
- timestamp: 2026-10-20T09:22:00Z
  checked: claim/init with "AB"
  found: it found an archived shipment with trackingNo "AB" and tried to send an OTP; the claim queries never filtered archived_at.
  implication: Archived shipments were claimable.
- timestamp: 2026-10-20T09:29:00Z
  checked: same requests after the fix
  found: "AB" -> 400, "!!!" -> 400, archived tracking number -> 404 on claim and claim/init.
  implication: Validation and archive filtering work end to end.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: The API schemas allowed any 1-255 character string, and two claim endpoints did not validate with zod at all. Claim lookups also ignored archived_at, so archived shipments could be claimed.
fix: Added a shared trackingNoSchema (3-64 chars, letters/digits/space/-/_/./, must start alphanumeric) matching the admin form, used it in createShipmentSchema and every claim endpoint, and added isNull(archivedAt) to the claim, claim/init, verify-otp and resend-otp queries.
verification: 400 for 2-char and punctuation-only numbers on create and claim; 404 when the tracking number belongs to an archived shipment; 464 tests pass.
files_changed:
  - apps/api/src/validators/index.ts
  - apps/api/src/routes/claim-shipment.ts
