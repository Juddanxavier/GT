# Phase 7: Re-imagine Shipment Assignment — Context

## Overview

Rework the entire shipment assignment lifecycle — creation, editing, reassignment, and customer claiming — across all three surfaces (API, Admin, Customer Portal).

## Decisions

### 1. Create-flow assignment
- Shipment can be created **without** a customer (unassigned — `userId` stays null).
- Primary scenario: admin knows contact info and will send tracking link later.
- Contact email/phone stored on shipment for notifications and claim verification.
- `contactEmail`/`contactPhone` fields remain on shipment for unassigned cases.

### 2. Customer search UX in create modal
- **Both** email/phone fields (for walk-in / manual entry) **+** real-time autocomplete dropdown for existing customers.
- Replace current "Lookup" button approach with search-as-you-type.
- When a customer is selected from autocomplete, pre-fill from profile but allow override.

### 3. Contact override behavior
- **Smart default with override**: use customer's registered email/phone from profile when linked.
- Admin can override contact info per-shipment for notification delivery.
- Override is explicit — admin must type a different value.

### 4. Reassign in admin
- **Inline selector** on shipment detail page showing current assignee.
- Search/select a different customer from the same tenant.
- Changing customer triggers notification to the **new** customer.
- API endpoint: `PATCH /api/shipments/:id/assign` (or similar).

### 5. Claim flow (customer portal) — full redesign
- Keep verification requirement (email/phone match + OTP — current approach is sound).
- Redesign portal UX for claiming:
  - Landing/tracking page shows "Is this your shipment? Claim it" for unassigned.
  - OTP verification flow with better UI.
  - Post-claim: redirect to **dashboard + tracking detail** (both).
- Option to claim via email link (magic link style).

### 6. API Changes
- Fix `customerId: null` Zod validation bug (currently errors in production).
- Add reassign endpoint.
- Contact info update endpoint (for override).
- Claim endpoints may need refinement but core logic stays.

### 7. Non-goals / Deferred
- Changing the DB schema — `shipment.userId`, `contactEmail`, `contactPhone` stay as-is.
- No new notification provider integrations.
- No changes to how notifications are triggered (existing status-change flow stays).

## Current relevant files

| File | Purpose |
|------|---------|
| `apps/api/src/routes/shipments.ts` | CRUD handlers (create has assignment logic at lines 200-250) |
| `apps/api/src/routes/claim-shipment.ts` | Public claim endpoints (email/phone + OTP) |
| `apps/admin/components/customer-assigner.tsx` | Customer search/lookup component in create modal |
| `apps/admin/app/(dashboard)/shipments/page.tsx` | Shipments list + create modal |
| `apps/admin/app/(dashboard)/shipments/[id]/page.tsx` | Shipment detail page (add reassign UI here) |
| `apps/admin/lib/queries.ts` | React Query hooks for mutations |
| `apps/api/src/Db/schema.ts` | Shipment table schema |
| `apps/api/src/validators/index.ts` | Zod schemas (`createShipmentSchema`, etc.) |
