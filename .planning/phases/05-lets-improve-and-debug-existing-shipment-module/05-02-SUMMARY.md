---
phase: 05-lets-improve-and-debug-existing-shipment-module
plan: 02
subsystem: api
tags: [postgres, pg_trgm, drizzle, hono, otp, react-email, crypto]

requires:
  - phase: 05-01
    provides: Shared types (@repo/types/status), status-config (@repo/ui/status-config), provider_tips + currency columns

provides:
  - pg_trgm GIN index on shipment search fields (tracking_no, customer_name, origin, destination)
  - POST /api/shipments/:id/restore endpoint
  - Archive cascade cleanup for tracking_events on soft-delete
  - ?search= query param on customer my-shipments endpoint
  - PATCH permission restrictions (status removed from staff-editable, billAmount guard)
  - SHA-256 hash-based dedup fallback when subStatus is null/empty
  - Branding type with supportEmail, tenant branding passed to email templates
  - OTP service (generateOtp, verifyOtp) for claim-shipment flow
  - POST /api/track/claim/init and /api/track/claim/verify-otp endpoints
  - PUT /api/shipments/:id/assign for unassign/reassign workflow
  - Auto-match customers on shipment creation by contactEmail/contactPhone

affects: [admin app, customer portal, notification system]

tech-stack:
  added: [pg_trgm extension, node:crypto/createHash for dedup]
  patterns: [otp service with in-memory store and ponytail upgrade path, migration-per-feature sql pattern]

key-files:
  created:
    - apps/api/src/db/migrations/0028_add_pg_trgm_index.sql
    - apps/api/src/services/otp.ts
  modified:
    - apps/api/src/routes/shipments.ts
    - apps/api/src/routes/customers.ts
    - apps/api/src/routes/claim-shipment.ts
    - apps/api/src/shipment-providers/dedup.ts
    - apps/api/src/email/types.ts
    - apps/api/src/workers/index.ts

key-decisions:
  - "Existing public POST /api/track/claim endpoint kept as-is for backward compatibility, OTP claim added via separate /claim/init and /claim/verify-otp paths"
  - "Dedup hash uses SHA-256 of eventTime + description + location when subStatus is null/empty, prefixed with hash: to avoid collision with real subStatus values"
  - "Branding fetched in notificationProcessor (not emailProcessor) to minimize worker churn"

patterns-established:
  - "OTP service pattern: in-memory Map with setTimeout auto-cleanup, upgrade to Redis when horizontal scaling needed"

requirements-completed: []
---

# Phase 05 Plan 02: Backend Shipment Improvements Summary

**pg_trgm indexed search, restore/assign endpoints, OTP claim flow, permission hardening, dedup hash fallback, tenant email branding**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-07T05:50:00Z
- **Completed:** 2026-07-07T06:08:00Z
- **Tasks:** 6
- **Files modified:** 8

## Accomplishments

- **Indexed search (D-09):** pg_trgm GIN index on tracking_no, customer_name, origin, destination enables fast LIKE searches without sequential scans. Origin and destination added to existing GET / search fields.
- **Restore endpoint (D-12):** POST /api/shipments/:id/restore reverses soft-delete (sets archivedAt to null), requires superadmin/tenant-admin role, includes cache invalidation and audit logging.
- **Archive cascade (D-17):** DELETE / handler now cascades archive to tracking_events alongside existing invoice cascade.
- **Customer search (D-10):** GET /api/customers/my-shipments accepts `?search=` for tracking number lookup (max 100 chars).
- **PATCH permissions (D-26, D-27):** Removed `status` from staff-editable fields (status is auto from 17TRACK). Staff cannot edit billAmount once set; tenant-admin can always edit. 403 guard added.
- **Dedup hash fallback (D-18):** SHA-256 hash of eventTime:description:location used as dedup key when subStatus is null/empty, prefixed with `hash:` to avoid collision with real subStatus values.
- **Email branding (D-08, D-22):** Branding type cleaned up with supportEmail field. `notificationProcessor` fetches tenant name from DB and passes branding to email queue, which flows through to React Email templates via layout.tsx.
- **OTP claim flow (D-30):** `otp.ts` service with generateOtp/verifyOtp/maskEmail. POST /api/track/claim/init sends 6-digit OTP to shipment's contact email (10-min expiry, one-time use). POST /api/track/claim/verify-otp verifies OTP and links shipment to customer. In-memory store with ponytail note for Redis upgrade path.
- **Unassign/reassign (D-32):** PUT /api/shipments/:id/assign accepts `{ customerId: string | null }`. null = unassign, valid UUID = reassign. Requires tenant-admin/superadmin. Validates customer exists in same tenant.
- **Auto-match (D-33):** On POST / shipment creation, if no explicit customerId but contactEmail or contactPhone matches an existing customer in the same tenant, auto-links the shipment. First-match only.

## Task Commits

1. **Task 1: pg_trgm search, restore endpoint, archive cascade cleanup** - `4387993` (feat)
2. **Task 2: PATCH permission restrictions and dedup hash fallback** - `290714d` (feat)
3. **Task 3: Email branding props and tenant branding in notifications** - `b35750a` (feat)
4. **Task 4: OTP service and claim-shipment verify-otp endpoint** - `7e59ddc` (feat)
5. **Task 5: Unassign/reassign API endpoint** - `736acda` (feat)
6. **Task 6: Auto-match customers on shipment creation** - `0511e05` (feat)

## Files Created/Modified

- `apps/api/src/db/migrations/0028_add_pg_trgm_index.sql` — pg_trgm extension + GIN index on shipment search fields
- `apps/api/src/routes/shipments.ts` — Origin+destination in search, POST /:id/restore, tracking events cascade in delete, PUT /:id/assign, staff permission restrictions, auto-match logic
- `apps/api/src/routes/customers.ts` — `?search=` param on my-shipments endpoint
- `apps/api/src/routes/claim-shipment.ts` — POST /claim/init (send OTP), POST /claim/verify-otp (verify + claim)
- `apps/api/src/services/otp.ts` — OTP service: generateOtp, verifyOtp, maskEmail
- `apps/api/src/shipment-providers/dedup.ts` — SHA-256 hash fallback for empty/null subStatus
- `apps/api/src/email/types.ts` — Branding type with supportEmail, cleaned up redundant fields
- `apps/api/src/workers/index.ts` — Tenant branding fetch in notificationProcessor, passed to emailQueue

## Decisions Made

- Existing public POST /api/track/claim kept as-is; OTP-based claim added via separate /claim/init and /claim/verify-otp paths for backward compatibility
- Dedup hash uses SHA-256 of eventTime + description + location (not full payload) — ponytail'd for upgrade path
- Branding fetched at notificationProcessor level rather than emailProcessor to avoid extra DB queries per email send
- OTP endpoints remain public (no auth middleware on /api/track mount point) — OTP itself is the auth factor

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required. The pg_trgm migration must be run against the database (run via `npx tsx src/db/apply-migration.ts 0028_add_pg_trgm_index.sql`).

## Next Phase Readiness

- All backend API changes for shipment module improvement complete
- Ready for admin/customer UI updates in remaining plans (D-28, D-29, D-31, D-34)

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| POST /:id/restore exists in shipments.ts | ✅ |
| PUT /:id/assign exists in shipments.ts | ✅ |
| Search includes origin + destination | ✅ |
| customers.ts my-shipments accepts ?search= | ✅ |
| Staff PATCH omits status field | ✅ |
| Staff billAmount edit guard (403) | ✅ |
| dedup.ts imports createHash | ✅ |
| Branding type has supportEmail | ✅ |
| otp.ts exists with generateOtp/verifyOtp | ✅ |
| claim-shipment.ts has /verify-otp endpoint | ✅ |
| auto-match (matchingCustomer) in shipments.ts | ✅ |
| pg_trgm migration (0028) created | ✅ |

---

*Phase: 05-lets-improve-and-debug-existing-shipment-module*
*Completed: 2026-07-07*
