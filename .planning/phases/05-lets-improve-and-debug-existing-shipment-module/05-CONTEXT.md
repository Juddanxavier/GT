# Phase 5: Lets improve and debug existing shipment module - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden and polish the existing shipment module across all three surfaces (API, Admin, Customer Portal). Fix inconsistencies, close gaps, resolve bugs, and improve UX. This is a full quality pass on the shipment module — not about net-new features, but about making what exists reliable, consistent, and multi-tenant ready.

</domain>

<decisions>
## Implementation Decisions

### Status Management Cleanup
- **D-01:** Full status audit — review all 9 upstream 17TRACK statuses (Pending, InfoReceived, InTransit, Expired, AvailableForPickup, OutForDelivery, DeliveryFailure, Delivered, Exception). Align the INTERNAL_STATUSES enum to cover all mapped statuses the system actually receives, including any that UI already references.
- **D-02:** Extract STATUS_COLORS, STATUS_META, and status → label/icon/config into a shared source of truth in `@repo/ui`. Imported by both admin and customer apps.
- **D-03:** Keep the admin filter UI at 5 tabs — group minor statuses together (e.g., info_received under Pending, out_for_delivery under In Transit). API continues to return all status counts; the grouping is a UI concern.

### Type Consolidation & Code Quality
- **D-04:** Extract shared shipment types to a new `@repo/types` package — canonical definitions for Shipment, TrackingEvent, InternalStatus, ShipmentCreateInput, etc. All apps import from this single package.
- **D-05:** Audit and consolidate ALL shared domain types — not just shipment. Check invoices, customers, quotations for same duplication pattern and fix them all in this phase.
- **D-06:** Convert admin shipment detail page from plain `api.get()` in `useEffect` to existing React Query hooks (`useShipment`, `useShipmentTracking`, etc.) from `queries.ts`.

### Tenant-Awareness & Localization
- **D-07:** Add currency field to tenant config (DB or store). Admin pages read currency symbol from tenant context — Gajan Traders = ₹ (INR), Lanka Mahal = ₨ (LKR).
- **D-08:** Pass tenant branding config (companyName, logoUrl, supportEmail, primaryColor) to email templates at send time. No hardcoded "Gajan Traders" fallback — fetch from DB.

### Search & Batch Operations
- **D-09:** Add PostgreSQL pg_trgm extension + GIN index on tracking_no, customer_name, origin, destination for indexed LIKE search. No dedicated search endpoint needed.
- **D-10:** Add `?search=` query param to the customer my-shipments endpoint for tracking number search.
- **D-11:** Skip batch operations (bulk create/update/assign) — deferred to future phase.
- **D-12:** Add `POST /api/shipments/:id/restore` endpoint to reverse soft-delete before skeletonize phase.

### Notification & Webhook Reliability
- **D-13:** Add in-memory LRU cache as fallback cooldown store when Redis is unavailable. Prevents duplicate notification spam within same process lifetime.
- **D-14:** Enqueue raw webhook payloads to BullMQ queue. Minimal handler (HMAC validation + enqueue). Worker processes events, dedup inserts, notification fan-out. 3 retry attempts with dead-letter queue.
- **D-15:** Keep 60s rate-limit cooldown on `POST /api/shipments/:id/track` — adequate for current usage.

### Delete, Archive & Data Lifecycle
- **D-16:** Keep current archive lifecycle: soft-delete (set archivedAt) → skeletonize (clear payload, customer info) → purge after 90 days. Add configurable retention per tenant as future enhancement.
- **D-17:** Audit + fix cascade cleanup for related tables when archiving shipments — ensure tracking_events, invoices, notification_log entries are also cleaned up.

### Webhook & Tracking Events
- **D-18:** Review tracking event dedup coverage — audit if `subStatus` is reliably populated from 17TRACK for all carriers. If not, add fallback dedup using event description hash.
- **D-19:** Add `provider_tips` column to tracking_events table (new field from 17TRACK v2.4 — carrier official notifications). Display in tracking timeline.

### Email & WhatsApp Notifications
- **D-20:** Current 5 email templates (picked-up, in-transit, out-for-delivery, delivered, exception) cover all needed states — no new templates required.
- **D-21:** Let customers opt-in per notification category (Delivery, Exception, General updates) for WhatsApp — toggleable in notification preferences page. Default: all on.
- **D-22:** Pass tenant branding as prop (logoUrl, companyName, supportEmail, primaryColor) to email templates at send time, fetched from tenant config DB.

### Notification UI
- **D-23:** Add notification center page (admin) with full history, status/type filters, bulk mark-read. Beyond the dropdown.
- **D-24:** Build notification preferences page (admin + customer) for per-category opt-in (email + WhatsApp) in this phase, not deferred to Phase 3e.
- **D-25:** Use Socket.IO real-time toasts for tracking update notifications (admin + customer). Non-intrusive, auto-dismiss.

### Invoice Role-Based Edit & Shipment Pages
- **D-26:** Remove `status` from staff-editable fields on PATCH /api/shipments/:id — status is automatic from 17TRACK tracking pipeline. Staff retain access to customer info, origin, destination.
- **D-27:** Staff can add billAmount on shipment creation but cannot edit once set. Only tenant-admin can edit billAmount after creation. Staff have read-only access to invoices.
- **D-28:** Full admin shipment detail page redesign: collapsible sections, tab-based navigation (Details, Tracking, Invoice, Notes), better mobile support. Plus React Query conversion.
- **D-29:** Color-coded tracking timeline: green=delivered, blue=in_transit, red=exception, gray=pending. Show elapsed time between milestones.

### the agent's Discretion
- Exact loading skeleton design for detail page redesign
- Timeline animation and transition details
- Toast positioning and auto-dismiss timing
- Tab navigation implementation pattern (URL-based tabs vs client-side)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### API — Shipment Routes
- `apps/api/src/routes/shipments.ts` — All shipment CRUD routes, permissions, cache patterns
- `apps/api/src/routes/claim-shipment.ts` — Public claim flow
- `apps/api/src/routes/public-track.ts` — Public tracking endpoint
- `apps/api/src/routes/webhooks.ts` — 17TRACK/TrackingMore webhook handlers
- `apps/api/src/routes/customers.ts` — Customer my-shipments, my-dashboard

### API — Shipment Services & Providers
- `apps/api/src/services/shipment.ts` — Shipment creation pipeline (tracking + invoice enqueue)
- `apps/api/src/services/archive.ts` — Archive lifecycle (skeletonize/purge)
- `apps/api/src/shipment-providers/types.ts` — InternalStatus enum, ShipmentProvider interface
- `apps/api/src/shipment-providers/index.ts` — Provider factory singleton
- `apps/api/src/shipment-providers/normalizer.ts` — Status normalization, date parsing
- `apps/api/src/shipment-providers/dedup.ts` — Event dedup (ON CONFLICT DO NOTHING)
- `apps/api/src/shipment-providers/providers/seventeen-track.ts` — 17TRACK v2.4 client
- `apps/api/src/shipment-providers/providers/tracking-more.ts` — TrackingMore client
- `apps/api/src/validators/index.ts` — Zod schemas (createShipmentSchema, updateShipmentSchema)

### Database Schema
- `apps/api/src/db/schema.ts` — Shipment, tracking_event, invoice table definitions (lines 165-250)
- 17TRACK v2.4 API docs: https://api.17track.net/en/doc?version=v2.4

### Notifications
- `apps/api/src/notifications/service.ts` — notifyTrackingEvents(), cooldown logic
- `apps/api/src/notifications/event-map.ts` — InternalStatus → EventType mapping
- `apps/api/src/notifications/idempotency.ts` — Redis-based dedup
- `apps/api/src/email/templates/` — 5 React Email templates
- `apps/api/src/email/types.ts` — ShipmentData, Branding types

### Admin App
- `apps/admin/app/(dashboard)/shipments/page.tsx` — Shipments list (filter tabs, status counts)
- `apps/admin/app/(dashboard)/shipments/[id]/page.tsx` — Shipment detail (to redesign)
- `apps/admin/lib/queries.ts` — React Query hooks: useShipment, useShipments, useShipmentTracking, etc.
- `apps/admin/components/customer-assigner.tsx` — Shared customer selector

### Customer Portal
- `apps/customer/app/(portal)/my-shipments/page.tsx` — My shipments list
- `apps/customer/app/(portal)/my-shipments/my-shipments-client.tsx` — Client component with search
- `apps/customer/app/(portal)/track/[trackingNo]/page.tsx` — Public tracking detail
- `apps/customer/lib/queries.ts` — React Query hooks: useMyShipments, useTrackShipment

### Packages
- `packages/ui/src/` — Existing shared components (button, card, code)
- `packages/permissions/src/abilities.ts` — CASL ability definitions for roles
- `packages/auth-config/src/index.ts` — Better Auth config

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@repo/ui` scaffold components: Can host shared status config and future shared shipment components
- `admin/lib/queries.ts` React Query hooks: Already has `useShipment`, `useShipmentTracking` hooks — just need to wire into detail page
- `admin/components/customer-assigner.tsx`: Shared customer selector usable in detail page redesign
- Socket.IO real-time infrastructure (`apps/api/src/realtime.ts`): Already set up for toast notifications
- BullMQ queue infrastructure: Already in place for webhook event processing

### Established Patterns
- Multi-tenant isolation via `eq(shipments.tenantId, scope.tenantId)` in every query + PostgreSQL RLS
- Redis withCache pattern (graceful degradation when Redis unavailable)
- React Query mutations with optimistic updates (list page pattern)
- CASL ability-based field-level permissions on PATCH endpoints
- Tenant-scoped caching via `withCache(tenantId, key, fn, ttl)`
- BullMQ worker pattern: queue job → worker processes with retry/DLQ

### Integration Points
- `apps/api/src/db/schema.ts` — Add `provider_tips` column to tracking_events
- `apps/api/src/routes/shipments.ts` — Add restore endpoint, fix permissions on PATCH
- `apps/api/src/routes/customers.ts` — Add ?search param to my-shipments
- `apps/api/src/routes/webhooks.ts` — Change from inline processing to queue enqueue
- `apps/api/src/shipment-providers/normalizer.ts` — Audit + fix status mapping
- `apps/api/src/shipment-providers/dedup.ts` — Review dedup coverage, add hash fallback
- `apps/api/src/notifications/service.ts` — Add in-memory fallback cooldown
- `apps/api/src/services/archive.ts` — Add cascade cleanup for related tables
- `apps/api/src/email/templates/` — Accept tenant Branding prop
- `apps/admin/app/(dashboard)/shipments/[id]/page.tsx` — Full redesign + React Query conversion
- `apps/admin/app/(dashboard)/shipments/page.tsx` — Extract status config to @repo/ui

</code_context>

<specifics>
## Specific Ideas

- Full improvement pass — all ~15 identified issues in scope, not just bug fixes
- 17TRACK v2.4 adds provider_tips field for carrier official notifications — use this
- Color-coded tracking timeline should feel like carrier tracking pages (FedEx, UPS style)
- Status is automatic from 17TRACK — no manual status override for staff
- Staff can add bill amount but not edit once set (financial control)
- Tenant currency: Gajan = INR (₹), Lanka Mahal = LKR (₨)

</specifics>

<deferred>
## Deferred Ideas

- Batch operations (bulk create, update, assign) — future phase
- Configurable retention per tenant for archive — future enhancement
- Dedicated search endpoint with full-text search (tsvector) — only if pg_trgm not enough
- Separate notification center page for customer portal — Phase 3e

</deferred>

---

*Phase: 05-lets-improve-and-debug-existing-shipment-module*
*Context gathered: 2026-07-07*
