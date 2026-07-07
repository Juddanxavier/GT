---
phase: "05"
plan: "04"
subsystem: "shipments"
tags: ["admin-ui", "customer-ui", "notifications", "autocomplete", "claim-wizard", "react-query", "hero-ui"]
requires: ["05-01", "05-02", "05-03"]
provides: ["shipment-detail-page", "tracking-timeline", "notification-center", "assigner-ui", "claim-wizard"]
affects: ["apps/admin", "apps/customer"]
tech-stack:
  added: []
  patterns: ["React Query tab-based data fetching", "HeroUI v3 compound component patterns", "multi-step OTP wizard"]
key-files:
  created:
    - "apps/admin/app/(dashboard)/shipments/[id]/tracking-timeline.tsx"
    - "apps/admin/app/(dashboard)/shipments/[id]/assign-shipment.tsx"
    - "apps/admin/app/(dashboard)/notifications/page.tsx"
    - "apps/admin/app/(dashboard)/notifications/settings/page.tsx"
    - "apps/customer/app/(portal)/notifications/settings/page.tsx"
    - "apps/customer/app/(portal)/claim/page.tsx"
    - "apps/admin/lib/realtime.ts"
    - "apps/customer/lib/realtime.ts"
  modified:
    - "apps/admin/app/(dashboard)/shipments/[id]/page.tsx"
    - "apps/api/src/db/schema.ts"
    - "apps/api/src/services/notification-prefs.ts"
    - "apps/api/src/routes/notification-preferences.ts"
    - "apps/api/src/index.ts"
    - "apps/admin/lib/queries.ts"
    - "apps/admin/app/(dashboard)/layout.tsx"
    - "apps/customer/app/(portal)/layout.tsx"
decisions:
  - "Use client-side filtering for notification type/status filters since backend only supports limit/offset/unread"
  - "Use native HTML input with dropdown for customer search instead of HeroUI Autocomplete (autocomplete item API not supported in this version)"
  - "Add customerName field to local Shipment interface in queries.ts to match API response shape"
metrics:
  duration: "~2h 30m"
  completed: "2026-07-07"
  lines-changed: "+850 lines across 15 files"
---

# Phase 05 Plan 04: Build All UI Changes — Admin Shipment Detail Redesign, Notifications, Assigner, Claim Wizard

**One-liner:** Redesigned admin shipment detail page with React Query + 4-tab navigation, color-coded tracking timeline, full notification system (DB/API/admin center/customer prefs/Socket.IO toasts), admin assigner with search/reassign/unassign, and customer claim wizard with multi-step OTP flow.

## Execution

All 5 tasks completed with 6 commits (5 feature commits + 1 fix commit for HeroUI API alignment).

### 1. Admin Shipment Detail Page — React Query + Tab Navigation
- Replaced `useEffect+api.get()` with `useShipment`, `useShipmentTracking`, `useShipmentInvoice` React Query hooks
- Added 4-tab navigation (Details, Tracking, Invoice, Notes) using HeroUI Tabs compound
- Added loading skeleton, error state with retry, empty state, quick-stats grid (Origin, Destination, Est/Actual Delivery)
- Created `tracking-timeline.tsx` placeholder (enhanced in Task 2)
- Added `useShipmentNotes` to queries.ts

### 2. Color-Coded Tracking Timeline
- Timeline dots: green=delivered, blue=in_transit, red=exception/expired/failed_attempt, gray=pending/info_received, amber=available_for_pickup
- Elapsed time between consecutive events
- Latest event prominent with ring highlight, past events at 70% opacity
- Provider tips display, empty state, fade-in animation per event

### 3. Notification System — DB, API, Admin, Customer Prefs, Real-Time
- Added `notification_preferences` table to Drizzle schema
- Created `notification-prefs.ts` service (getPreferences, upsertPreferences, shouldNotifyByEmail/WhatsApp)
- Created `/api/notification-preferences` GET/PUT routes
- Admin notification center at `/notifications`: type+status filters, bulk mark-read via checkboxes, compound Pagination
- Admin notification settings at `/notifications/settings` and customer at `/notifications/settings`: per-category email/WhatsApp toggles using Switch compound
- Realtime `tracking:updated` event in admin layout, `apps/admin/lib/realtime.ts` + `apps/customer/lib/realtime.ts` modules

### 4. Admin Assigner Improvements
- Created `assign-shipment.tsx`: search input with customer dropdown popover, Assign/Reassign/Unassign buttons
- Added `useCustomerSearch` and `useAssignShipment` hooks to queries.ts
- Wired into shipment detail page customer card

### 5. Customer Claim Wizard
- Multi-step wizard at `/claim`: step 1 (enter tracking number → POST `/api/track/claim/init` sends OTP), step 2 (enter 6-digit numeric OTP → POST `/api/track/claim/verify-otp`), step 3 (success with tracking number and links)
- Error handling for invalid tracking, expired OTP, already-claimed, network errors
- Step indicator, back navigation, auto-focus on OTP input

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] HeroUI v3 Component API Mismatches**
- **Found during:** Verification phase
- **Issue:** All created pages used incorrect HeroUI props that don't exist in this version (v3.1.0): `CardBody`/`CardHeader` → `Card.Content`/`Card.Header`, `variant="flat"` → `variant="secondary"` on Button, `color` → `variant` on Button, `onValueChange` → `onChange` on Switch/Checkbox, `title` on Tabs.Tab → children, `AutocompleteItem` doesn't exist → replaced with native input+dropdown, `Pagination`/`Select` need compound pattern
- **Fix:** Rewrote all component usages to match actual HeroUI v3.1.0 API types
- **Files modified:** 7 files across admin and customer apps
- **Commit:** `d2dab5a`

**2. [Rule 2] Missing `customerName` in Local Shipment Interface**
- **Found during:** Type check
- **Issue:** Local `Shipment` interface in `queries.ts` was missing `customerName` field that the API returns and the detail page displays
- **Fix:** Added `customerName: string | null` to the local Shipment interface
- **Files modified:** `apps/admin/lib/queries.ts`
- **Commit:** `d2dab5a`

## Verification

- [x] `pnpm check-types` on admin app: only pre-existing errors remain (``@repo/ui/status-config` module resolution, `api.put` in queries.ts, test file errors, list page errors)
- [x] Each task committed individually with conventional commit format
- [x] All deviations documented
- [x] SUMMARY.md created

## Known Stubs

None identified — all pages have data sources wired to real API endpoints.

## Threat Flags

None — all surface areas (API routes, auth, DB schema) were declared in the plan's threat model.

## Self-Check: PASSED

- All 5 task commits verified via `git log`
- All 7 created files exist on disk
- All modified files verified
