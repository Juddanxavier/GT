---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
stopped_at: Phase 5 complete — tracking engine with 17TRACK + TrackingMore, webhooks, polling, dedup. Ready for Phase 6.
last_updated: "2026-06-15T00:00:00.000Z"
last_activity: 2026-06-15 — Planning discussion for Phase 6: Notifications Engine
progress:
  total_phases: 10
  completed_phases: 5
  in_progress_phases: 1
  total_plans: 10
  completed_plans: 9
  percent_hard: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-14)

**Core value:** A shipment gets added → tracked via 17TRACK → status changes trigger email + WhatsApp to the right customer — without leaking data between tenants.
**Current focus:** Phase 6 — Notifications Engine (email/WhatsApp with idempotency)

## Current Position

Phase: 6 of 10 (Notifications Engine) — **READY TO PLAN**

Done in Phases 1-5:
- Phase 1: Biome, TS normalization, Drizzle ORM
- Phase 2: Better Auth, CASL roles, tenant resolver, admin login, RLS
- Phase 3: BullMQ + Redis, Socket.IO, graceful degradation
- Phase 4: All CRUD (branches, customers, shipments, quotations) with HeroUI v3 UI
- Phase 5: 17TRACK + TrackingMore providers, webhooks, polling, dedup, carrier detection, tracking timeline
- Extra: User management page, shipment provider abstraction, lucide-react migration

## Accumulated Context

### Decisions

1. **Biome 2.5.0 instead of 1.9.4** — Installed version resolved to 2.5.0 with schema breaking changes.
2. **Drizzle db:push --force flag** — Drizzle Kit 0.31 requires --force in non-interactive.
3. **TypeScript ^5.9.2 normalized** — All packages now on same range.
4. **Better Auth app.all('/api/auth/*')** — Mount with all methods to match official Hono integration docs.
5. **trustedOrigins for CSRF** — Added to auth.ts with localhost:3000 in list.
6. **CASL over simple role enum** — Allows fine-grained exceptions (staff read-only billAmount).
7. **Separate guards from abilities** — WHAT (ability) vs WHERE (data scoping) separation.
8. **In-memory domain cache** — 5-min TTL Map, to be replaced with Redis in Phase 3.
9. **RLS via PostgreSQL session variables** — Defense-in-depth using app.tenant_id.
10. **Better Auth type portability** — pnpm hoisting causes non-portable type exports; used local type interface workaround.
11. **dev script --env-file flag** — tsx watch --env-file=../../.env loads root .env correctly when turbo runs with CWD=apps/api.
12. **Route group layout for auth gate** — Login/unauthorized pages in root layout (no auth), dashboard in (dashboard) group (role-gated). Fixes blank login page.
13. **Upstash free tier for Redis** — Serverless Redis, zero infra, 256MB/500K commands free. Used for BullMQ + cache + Socket.IO adapter.
14. **Graceful degradation without Redis** — All Redis-dependent features (BullMQ, cache, Socket.IO adapter) degrade gracefully when UPSTASH_REDIS_URL is unset. API starts without crash.
15. **Bull Board dashboard** — @bull-board/hono over @getworkbench/hono due to pnpm resolution compatibility. Workbench had subpath export issues with tsx + pnpm.
16. **Better Auth rate limiting replaces Arcjet** — Auth endpoint rate limiting handled by Better Auth's built-in rate limiter. No Arcjet needed.
17. **HeroUI v3 replaces shadcn** — HeroUI v3 (3.1.0, formerly NextUI) is the design system for all frontend apps. Installed in @repo/ui. No Provider wrapper needed in v3.
18. **No custom components — inline HeroUI only** — Every UI element is HeroUI or raw HTML/SVG inline. No custom React components to maintain.
19. **Create/Edit as Modals, not pages** — New and Edit buttons open HeroUI Modal on the same page instead of navigating to /entity/new or /entity/:id/edit.
20. **Form inside Modal.Body** — form element must be inside Modal.Body (not wrapping it) to avoid HeroUI slot resolution issues. Submit button in Modal.Footer uses form="id" attribute to link.
21. **Modal.Backdrop controlled pattern** — For controlled modals, isOpen/onOpenChange go on Modal.Backdrop (not Modal). Structure: Backdrop > Container > Dialog > Header/Body/Footer.
22. **KPI card design** — Clean minimal cards: rounded-2xl bg-surface shadow-sm, text-4xl numbers, trend badge (px-1.5 py-0.5 rounded-md), thin sparkline at bottom, hover:-translate-y-1 lift. No borders, no icon circles, no top strip.

### Pending Todos

- Phase 6: Notifications engine (email + WhatsApp)
- Phase 7: Admin Operations — Quotes & Invoices
- Phase 8: Dashboard & Intelligence
- Phase 9: Customer Portals (postponed)

### Blockers/Concerns

None.

## Phase 2 Delivery

| Capability | Status | Details |
|-----------|--------|---------|
| Database schema | ✓ | tenant, branch, tenant_domain + Better Auth tables |
| User auth (email/password) | ✓ | Better Auth v1.6.18 + Drizzle adapter |
| Custom user fields | ✓ | tenantId, role, branchId on user table |
| CASL permissions | ✓ | @repo/permissions with 4 roles + guards |
| Admin login UI | ✓ | HeroUI components, login form, Google OAuth |
| Tenant resolution | ✓ | Header -> session -> domain lookup (cached) |
| Route guards | ✓ | requireRole / requireAbility middleware |
| RLS defense-in-depth | ✓ | All tenant-scoped tables, applied to DB |
| Login verified | ✓ | admin@gajanindia.com / Admin123! (superadmin) |

## Phase 5 Delivery

| Capability | Status | Details |
|-----------|--------|---------|
| 17TRACK API client | ✓ | register, getTrackInfo, verifyWebhookSignature |
| Webhook endpoint | ✓ | HMAC signature verification, 200 OK before async |
| Register worker | ✓ | Concurrency=1, handles carrier detection errors |
| Update worker | ✓ | Upserts all events, dedup via Redis+DB constraint |
| 6h polling fallback | ✓ | setInterval in index.ts, batch getTrackInfo |
| Migration 0005 | ✓ | tracking_event table with dedup constraint |
| Customer async search | ✓ | Email/phone search with debounce, inline results |
| Self toggle | ✓ | customerId nullable, "Self — no notifications" display |
| Carrier detection UI | ✓ | Detect button → auto-detects → carrier dropdown on fail |
| Tracking timeline | ✓ | Vertical timeline on detail page |
| Shipments real API | ✓ | No more dummy data |
| Migration 0006 | ✓ | customer_id nullable on shipment table |

## Phase 4 Delivery

| Capability | Status | Details |
|-----------|--------|---------|
| DB schema (customers, quotes, shipments) | ✓ | Migration 0004 applied |
| Zod validators | ✓ | All 4 entities |
| API routes (branches) | ✓ | CRUD (4 routes) |
| API routes (customers) | ✓ | CRUD (5 routes) |
| API routes (quotations) | ✓ | CRUD + status transitions + convert (6 routes) |
| API routes (shipments) | ✓ | CRUD (5 routes) |
| HeroUI v3 migration | ✓ | All pages migrated, shadcn removed |
| Branch list/detail pages | ✓ | Table, KPI cards, create/edit/delete modals |
| Customer list/detail pages | ✓ | Table, KPI cards, create/edit/delete modals |
| Shipment list/detail pages | ✓ | Table, KPI cards, create/edit/delete modals |
| Quotation list/detail pages | ✓ | Table, KPI cards, create/edit/delete modals, line items |

## Session Continuity

Last session: 2026-06-14
Stopped at: Phase 4 complete
Resume file: None
