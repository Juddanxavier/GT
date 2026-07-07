# Phase 5: Lets improve and debug existing shipment module - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-07
**Phase:** 05-lets-improve-and-debug-existing-shipment-module
**Areas discussed:** Status Management Cleanup, Type consolidation & code quality, Tenant-awareness & localization, Search & batch operations, Notification & webhook reliability, Delete/Archive lifecycle, Webhook & tracking events, Notifications — Email & WhatsApp, Notification UI, Invoice role-based edit & shipment pages

---

## Status Management Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Add cancelled to enum | Simplest fix — add missing status | |
| Rename admin UI tab | Remove Cancelled tab, replace with Expired | |
| Full status audit | Review all 9 upstream 17TRACK statuses and align enum + UI | ✓ |

**User's choice:** Full status audit — review all 9 upstream 17TRACK statuses, align the enum and UI.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Extract to @repo/ui | Single source of truth for status → color/label/icon | ✓ |
| Extract to admin lib only | Keep in admin app only | |

**User's choice:** Extract to @repo/ui — single source of truth.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show all statuses as filter tabs | 8 tabs for full coverage | |
| Group minor statuses | Keep 5 tabs, group similar | ✓ |

**User's choice:** Group minor statuses — keep 5 filter tabs, group similar statuses (e.g., info_received under Pending, out_for_delivery under In Transit).

---

## Type Consolidation & Code Quality

| Option | Description | Selected |
|--------|-------------|----------|
| Extract to @repo/types | Single package with all shared domain types | ✓ |
| Extract to api/src/types | API as source of truth | |
| Leave per-app inline fixes only | Fix inconsistencies in each file independently | |

**User's choice:** Extract shared types to `@repo/types`.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Convert to React Query | Use existing hooks from queries.ts | ✓ |
| Keep as-is | Plain fetch in useEffect | |

**User's choice:** Convert to React Query (TanStack Query).

---

| Option | Description | Selected |
|--------|-------------|----------|
| Audit all domain types | Check invoices, customers, quotations too | ✓ |
| Shipment types only | Keep scope focused on shipment | |

**User's choice:** Audit and consolidate all shared domain types — invoices, customers, quotations too.

---

## Tenant-Awareness & Localization

| Option | Description | Selected |
|--------|-------------|----------|
| Use tenant currency from config | Currency field in tenant config, read from context | ✓ |
| Store currency per shipment | CurrencyCode column on shipment table | |

**User's choice:** Use tenant currency from config.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Use tenant config from DB/store | Pass branding from current tenant to templates | ✓ |
| Environment variable per deployment | Separate env var per tenant | |

**User's choice:** Use tenant config from DB/store — pass branding to email templates at send time.

---

## Search & Batch Operations

| Option | Description | Selected |
|--------|-------------|----------|
| Add trigram index | PostgreSQL pg_trgm + GIN index | ✓ |
| Add dedicated search endpoint | Full-text search via tsvector | |
| Keep as-is | LIKE %search% at current scale | |

**User's choice:** Add pg_trgm extension + GIN index.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Add search param to my-shipments | ?search= query param | ✓ |
| Keep as-is | Let customers scroll | |

**User's choice:** Add `?search=` param to my-shipments.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Add batch endpoints | Bulk create/update/assign | |
| Skip batch ops | Defer to future phase | ✓ |

**User's choice:** Skip batch ops — deferred.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Add restore endpoint | POST /api/shipments/:id/restore | ✓ |
| Keep as-is | Archival is permanent | |

**User's choice:** Add restore endpoint.

---

## Notification & Webhook Reliability

| Option | Description | Selected |
|--------|-------------|----------|
| Add in-memory fallback cooldown | LRU cache fallback when Redis unavailable | ✓ |
| Accept the warning | Redis downtime is rare | |

**User's choice:** Add in-memory LRU fallback cooldown.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Add retry with BullMQ | Queue with 3 retries + DLQ | ✓ |
| Add simple retry in handler | setTimeout/exponential backoff | |
| Keep as-is | Provider usually retries | |

**User's choice:** Add BullMQ queue with retry (3 attempts) and DLQ.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 60s | Adequate for current usage | ✓ |
| Reduce to 30s | More flexibility for testing | |

**User's choice:** Keep 60s cooldown.

---

## Delete/Archive Lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current archive lifecycle | Soft-delete → skeletonize → purge after 90d | ✓ |
| Simplify to just soft-delete | Remove skeletonize step | |

**User's choice:** Keep current archive lifecycle. Add configurable retention per tenant later.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Audit and fix cascade cleanup | Ensure related tables cleaned up | ✓ |
| Keep current behavior | Only clean shipment + invoice | |

**User's choice:** Audit and fix cascade cleanup for tracking_events, invoices, notification_log.

---

## Webhook & Tracking Events

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current dedup | ON CONFLICT DO NOTHING on (shipmentId, eventTime, subStatus) | |
| Review dedup coverage | Audit if subStatus reliably populated; add hash fallback | ✓ |

**User's choice:** Review dedup coverage — add hash-based fallback if subStatus unreliable.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Add provider_tips field | 17TRACK v2.4 carrier official notifications | ✓ |
| Keep current schema | Current tracking_events covers needs | |

**User's choice:** Add `provider_tips` column.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Enqueue raw webhook to queue | Minimal handler, worker processes events | ✓ |
| Mixed: inline then queue on failure | Try inline first, queue only if fail | |

**User's choice:** Enqueue raw webhook to BullMQ queue.

---

## Notifications — Email & WhatsApp

| Option | Description | Selected |
|--------|-------------|----------|
| Current 5 templates cover everything | picked-up, in-transit, out-for-delivery, delivered, exception | ✓ |
| Add failed_attempt template | Let customer know delivery was attempted | |
| Add templates for every status | One per status including sub-statuses | |

**User's choice:** Current 5 templates cover everything.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Per-category opt-in | Delivery, Exception, General — toggleable | ✓ |
| All or nothing | Single on/off toggle for WhatsApp | |
| Admin-controlled only | No customer control | |

**User's choice:** Per-category opt-in in notification preferences.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Pass tenant branding as prop | logoUrl, companyName, supportEmail, primaryColor at send time | ✓ |
| Render templates per-tenant at build time | Pre-render branded templates per tenant | |

**User's choice:** Pass tenant branding as prop at send time.

---

## Notification UI

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current dropdown | Bell icon with dropdown | |
| Add notification center page | Full history, filters, bulk actions | ✓ |

**User's choice:** Add notification center page.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Build notification prefs page | In this phase with per-category opt-in | ✓ |
| Defer to Phase 3e | Keep in original customer portal phase | |

**User's choice:** Build notification prefs page in this phase.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Socket.IO real-time toast | Non-intrusive, auto-dismiss | ✓ |
| Banner at top of page | Persistent until dismissed | |
| Inline badge on shipment card | Minimal but easy to miss | |

**User's choice:** Socket.IO real-time toast notifications.

---

## Invoice Role-Based Edit & Shipment Pages

| Option | Description | Selected |
|--------|-------------|----------|
| Current permissions correct | Staff can edit customer info, addresses, status | |
| Restrict staff further | Remove status from staff permissions | ✓ |
| Expand staff permissions | Also allow carrier, courierCode, estimatedDelivery | |

**User's choice:** Remove status from staff-editable fields — status is automatic from 17TRACK.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Staff: read-only on invoices | No invoice modification for staff | |
| Staff: edit line items only | Can adjust line items but not totals/status/send | |
| Staff: full edit | Same as admin | ✓ (partial) |

**User's choice:** Staff can add bill amount on shipment but cannot edit once added. Only admins can edit. Staff have read-only access to invoices.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Edit-in-place fields | Click field to edit inline | |
| Keep modal-based edit | Current modal, convert to React Query | |
| Full detail page redesign | Collapsible sections, tabs, mobile support | ✓ |

**User's choice:** Full detail page redesign with tab-based navigation.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Color-coded timeline | Green=delivered, blue=in_transit, red=exception, gray=pending | ✓ |
| Current list view is fine | Event list sorted by date | |

**User's choice:** Color-coded timeline with elapsed time between milestones.

---

## Customer Claim & Assignment Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Improve claim verification | OTP, better matching | |
| Better claim UX for customers | Step wizard, confirmation | |
| Admin assignment enhancements | Better search, unassign, history | |
| Auto-assignment logic | Auto-match at creation | |
| All of the above | Full pass on claim/assignment | ✓ |

**User's choice:** All of the above.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Add OTP verification | Send OTP to email/phone, verify before linking | ✓ |
| Keep email/phone match + rate limiting | Current match is fine with rate limits | |
| Email verification link only | One-time verification link | |

**User's choice:** Add OTP verification. Rate-limit attempts per IP.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Better customer search + claim history | Debounced server search, timeline | |
| Add unassign + reassign workflow | Unlink and reassign with audit | |
| Both | Better search AND unassign/reassign | ✓ |

**User's choice:** Both.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-match on creation | Link by contactEmail at create time | ✓ |
| Auto-match on tracking update | Background job on tracking events | |
| Both | At creation + periodic background | |

**User's choice:** Auto-match on creation.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Step-by-step claim wizard | Multi-step: tracking → OTP → confirm → success | ✓ |
| Claim status page | Dashboard of claimed/pending/available | |
| Both | Wizard + dashboard | |

**User's choice:** Step-by-step claim wizard.

---

## the agent's Discretion
- OTP delivery channel preference (email vs WhatsApp vs both) — use both
- Claim wizard UI design details
- Unassign confirmation dialog design

- Exact loading skeleton design for detail page
- Timeline animation and transition details
- Toast positioning and auto-dismiss timing
- Tab navigation implementation pattern

## Deferred Ideas

- Batch operations (bulk create, update, assign) — future phase
- Configurable retention per tenant for archive — future enhancement
- Dedicated search endpoint with full-text search — only if pg_trgm not enough
- Separate notification center page for customer portal — Phase 3e
