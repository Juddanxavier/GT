---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
stopped_at: Phase 12 complete — 50/58 production-readiness audit findings closed across 6 batches. 8 deferred.
last_updated: "2026-06-20T00:00:00.000Z"
last_activity: 2026-06-20 — Phase 12 implementation complete (Batches 1-6). 4 migrations applied (0019-0022).
progress:
  total_phases: 13
  completed_phases: 6
  in_progress_phases: 0
  total_plans: 12
  completed_plans: 10
  percent_hard: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-14)

**Core value:** A shipment gets added → tracked via 17TRACK → status changes trigger email + WhatsApp to the right customer — without leaking data between tenants.
**Current focus:** Phase 6 — Notifications Engine (email/WhatsApp with idempotency)

## Current Position

Phase: 6 of 10 (Notifications Engine) — **READY TO PLAN**

Done in Phases 1-5 + Phase 12:
- Phase 1: Biome, TS normalization, Drizzle ORM
- Phase 2: Better Auth, CASL roles, tenant resolver, admin login, RLS
- Phase 3: BullMQ + Redis, Socket.IO, graceful degradation
- Phase 4: All CRUD (branches, customers, shipments, quotations) with HeroUI v3 UI
- Phase 5: 17TRACK + TrackingMore providers, webhooks, polling, dedup, carrier detection, tracking timeline
- Phase 12: Production-readiness hardening — 50 audit findings closed across 6 batches
  - Batch 1: Data integrity (columns, transactions, dedup, payload cleanup, migrations)
  - Batch 2: Security (CORS env, CSRF, debug auth, security headers, forgot-password, Bull Board, branch scope, SameSite, password policy, customer email constraint)
  - Batch 3: Rate limiting (global + per-endpoint, get-session re-enabled)
  - Batch 4: Observability (graceful shutdown, crash handlers, request ID, Sentry fixes, health check, emit error logging)
  - Batch 5: Performance (pool size, 7 indexes, pg_trgm, pagination)
  - Batch 6: Frontend/API (pagination API client, Zod sync, error boundaries, as never cleanup)

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
12. **Route group layout for auth gate** — Login/unauthorized pages in root layout (no auth), dashboard in (dashboard) group (role-gated).
13. **Upstash free tier for Redis** — Serverless Redis, zero infra, 256MB/500K commands free.
14. **Graceful degradation without Redis** — All Redis-dependent features degrade gracefully when UPSTASH_REDIS_URL is unset.
15. **Bull Board dashboard** — @bull-board/hono over @getworkbench/hono due to pnpm resolution.
16. **Better Auth rate limiting replaces Arcjet** — Auth endpoint rate limiting handled by Better Auth's built-in rate limiter.
17. **HeroUI v3 replaces shadcn** — HeroUI v3 (3.1.0) is the design system for all frontend apps.
18. **No custom components — inline HeroUI only** — Every UI element is HeroUI or raw HTML/SVG inline.
19. **Create/Edit as Modals, not pages** — New/Edit buttons open Modal on same page.
20. **Form inside Modal.Body** — form element inside Modal.Body, submit button in Modal.Footer uses form="id".
21. **Modal.Backdrop controlled pattern** — isOpen/onOpenChange on Modal.Backdrop.
22. **KPI card design** — rounded-2xl bg-surface shadow-sm, text-4xl numbers, trend badge, thin sparkline.

### Phase 12 Decisions

23. **Global rate limiting via Redis fixed window** — Per-user (auth'd) / per-IP (anonymous), default 60 req/min, with per-endpoint overrides.
24. **SameSite=Lax on session cookies** — Defense-in-depth for CSRF, primary protection via trustedOrigins.
25. **App-level tenant isolation sufficient for RLS** — Verified all tracking_event/invoice queries scope by tenantId; no PostgreSQL RLS needed.
26. **Security headers via Hono middleware** — CSP restricts to 'self', HSTS in production only.
27. **Request ID via randomUUID()** — Uses built-in `node:crypto.randomUUID()` to avoid extra dependency on cuid2.
28. **CORS from comma-separated env var** — `CORS_ORIGIN=http://app1.com,http://app2.com` supports multiple origins.
29. **Customer email unique constraint** — Prevents duplicate customer records per email across tenants.
30. **pg_trgm indexes for leading-wildcard LIKE** — GIN trigram index on invoice_no enables indexed LIKE '%search%'.

### Pending Todos

- Phase 6: Notifications engine (email + WhatsApp)
- Phase 7: Admin Operations — Quotes & Invoices
- Phase 8: Dashboard & Intelligence
- Phase 9: Customer Portals (postponed)
- Phase 11: RBAC hierarchy enforcement
- Phase 12 deferred: DOWN migrations, squash strategy, deterministic seed, detail page React Query, optimistic updates, API versioning, .env encryption

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

## Phase 12 Delivery

| Capability | Status | Details |
|-----------|--------|---------|
| CORS configurable | ✓ | CORS_ORIGIN env var |
| CSRF protection | ✓ | SameSite=Lax + trusted origins |
| Debug endpoint auth | ✓ | requireRole('superadmin') |
| Security headers | ✓ | CSP, HSTS, X-Frame-Options, etc. |
| Forgot-password enumeration | ✓ | Always returns 200 |
| Bull Board auth | ✓ | requireRole('superadmin') |
| Superadmin branch filter | ✓ | Allowed in branch middleware |
| Staff branchId PATCH | ✓ | Removed from allowlist |
| Password policy | ✓ | min 8, max 128 |
| Customer email unique | ✓ | Migration 0021 |
| Global rate limiting | ✓ | Redis fixed-window, defaults + per-endpoint |
| get-session rate limit | ✓ | 20 req / 10s (was disabled) |
| Graceful shutdown | ✓ | SIGTERM/SIGINT drain + Redis close |
| Crash handlers | ✓ | unhandledRejection + uncaughtException |
| emitToTenant logging | ✓ | Error logging instead of .catch((): => {})|
| Health endpoint | ✓ | GET /api/health |
| Request ID | ✓ | x-request-id header on all responses |
| Sentry fixed | ✓ | Traces 0.1/0.2, profiling, crash reporting |
| Connection pool | ✓ | Configurable, default 50 |
| Missing indexes | ✓ | 7 B-tree + pg_trgm (migration 0022) |
| Invoice pagination | ✓ | page/limit/offset/total |
| API client pagination | ✓ | api.getPaginated<T>() |
| Frontend Zod synced | ✓ | Matches server validators |
| Error boundaries | ✓ | error.tsx for (dashboard) |
| as never casts | ✓ | Removed from invoices.ts |

## Session Continuity

Last session: 2026-06-20
Stopped at: Phase 12 implementation complete
Resume file: .planning/phases/12-filtering-security-hardening/PLAN.md
