# Project Research Summary

**Project:** Gajan Traders — Multi-Tenant Shipment Tracking Platform
**Domain:** Multi-tenant SaaS logistics / shipment tracking with admin ops and white-label customer portals
**Researched:** 2026-06-13
**Confidence:** HIGH

## Executive Summary

This is a **multi-tenant shipment tracking platform** serving two initial tenants (India, Sri Lanka) with plans to scale to 5-10. Experts build this class of product using a shared-database isolation model (single PostgreSQL with `tenantId` on every table) combined with a Redis-backed background job and real-time infrastructure. The recommended approach uses **Hono** as the API server (ultrafast, Web Standard API, TypeScript RPC), **Next.js 16** for three standalone frontends (admin, India portal, Sri Lanka portal), **Drizzle ORM** for type-safe database access, **Better Auth + CASL** for authentication and attribute-based authorization, and **BullMQ + Socket.IO** atop Redis for reliable async processing and real-time tracking updates.

The key architectural risk is **multi-tenant data isolation** — a single missing `WHERE tenant_id` clause can leak data across tenants. The recommended mitigation is a three-layer defense: PostgreSQL Row-Level Security at the database level, a repository wrapper that auto-injects `tenantId` into every Drizzle query, and CASL authorization checks on every route. A secondary risk cluster revolves around **17TRACK's 3 req/s rate limit** and **notification reliability** — BullMQ queues with rate limiters, idempotency keys, and dead-letter queue monitoring are essential. The React PDF memory leak (confirmed in GitHub issue #2848) requires worker-thread isolation from day one.

The platform has a clear build order: **Foundation (auth + multi-tenancy + core CRUD) → Core Tracking (17TRACK integration + real-time dashboard) → Customer Portals (white-label + notifications) → Admin Operations (quotes → invoices → pipeline) → Super Admin Intelligence (cross-tenant analytics).** Three parallel work streams emerge after Phase 1: core domain (shipments → tracking → notifications), admin tools (customers → branches → quotes → invoices), and cross-cutting (dashboard → super admin → PDF gen). Research flags Phase 3 (17TRACK integration + notifications) as needing the most planning attention due to the complex interplay of rate limits, webhook idempotency, and notification provider quotas.

## Key Findings

### Recommended Stack

All 17 technologies are validated and production-ready. Three require early decisions: Drizzle ORM version (start with `^0.45.2` stable, not the v1.0.0-rc), Next.js minimum pin at `^16.2.6` (13 CVEs patched May 2026), and React Email v6's unified `react-email` package (not `@react-email/components`). ioredis is in maintenance mode but remains the safest choice for BullMQ compatibility — migrate to `node-redis` only when ioredis actually deprecates.

**Core technologies:**

- **Hono `^4.12.0`**: REST API server — 14KB, Web Standard API, TypeScript-native RPC. Replaces Express with 3-5x better throughput.
- **Next.js `^16.2.6` (min)**: Three standalone frontends (admin, India portal, Sri Lanka portal) via `output: "standalone"` in Docker.
- **Drizzle ORM `^0.45.2`**: Type-safe ORM, ~7.4KB, 0 deps, serverless-ready. Paired with Drizzle Kit for migrations.
- **PostgreSQL 16+**: Single-DB "pool" model with `tenantId` on every tenant-scoped table. Row-Level Security for defense-in-depth.
- **Better Auth `^1.6.14`**: Self-hosted auth with session rotation, CSRF, token blacklisting, and native Drizzle adapter.
- **CASL `^7.0.0`**: TypeScript ABAC with roles (superadmin, tenant-admin, staff, customer) and tenant-scoped abilities.
- **BullMQ `^5.78.0`**: Background job queue for notifications, PDF generation, and 17TRACK sync. OTel tracing built-in.
- **Socket.IO `^4.8.3`**: Real-time tracking updates with Redis adapter for horizontal scaling and tenant-prefixed rooms.
- **React Email `^6.1.0` + Resend**: Component-based email with tenant-branded templates. **Use `react-email` not `@react-email/components`.**
- **@react-pdf/renderer `^4.5.0`**: ~50ms PDF generation (vs Puppeteer's 2-3s), no Chromium dependency.
- **Sentry Node `^10.55.0`**: Error tracking + performance with tenantId context. Built on OpenTelemetry.
- **Biome `^2.4.13`**: Replace ESLint + Prettier — 35-60x faster, single binary, 465+ rules.
- **Arcjet**: Rate limiting + bot protection via Hono middleware.

**Deployment:** Coolify v4+ self-hosted on $8-16/mo VPS runs all 4 containers (3 Next.js apps + Hono API) with Traefik reverse proxy. Vercel cannot handle 4 separate Next.js apps on one team's free plan.

**Alternatives validated:** Hono over Fastify/NestJS, Better Auth over Clerk/Supertokens/Auth.js, CASL over Casbin/ZenStack, Drizzle over Prisma/Kysely, @react-pdf/renderer over Puppeteer/jsPDF, Resend over SendGrid/SMTP, MSG91 over Twilio (proved in GT Express, cheaper for India traffic), Coolify over Vercel/Railway.

*Full details: [STACK.md](./STACK.md)*

### Expected Features

The feature set divides cleanly into three tiers across 5 phases.

**Must have (table stakes)** — users leave without these:
- **T1:** Real-time multi-carrier tracking via 17TRACK (3,300+ carriers, ~~3 req/s, normalized status taxonomy)
- **T3:** White-label/branded customer portal per tenant (logo, colors, domain, locale)
- **T4:** Proactive email notifications on every status change (React Email + Resend)
- **T6:** Customer management (CRUD, tenant-scoped, per-org)
- **T7:** Shipment management (manual entry, bulk import, auto-register with 17TRACK)
- **T8:** Quotation management (draft → sent → accepted → converted to shipment)
- **T9:** Invoice management with PDF generation
- **T10:** Branch management within org hierarchy
- **T11:** Tenant data isolation (three-layer defense: RLS + Drizzle wrapper + CASL)
- **T12:** Admin dashboard with KPIs (daily ops command center)

**Should have (differentiators)** — win deals:
- **D1:** WhatsApp notifications (95%+ open rate in India/Sri Lanka, via MSG91)
- **D2:** Multi-tenant org+branch role hierarchy (superadmin → tenant-admin → staff → customer)
- **D3:** Super admin cross-tenant view (all orgs, branches, shipments in one dashboard)
- **D4:** Per-tenant branding config (logo, colors, domain, locale — config-driven, not code change)
- **D5:** Real-time Socket.IO push updates (vs. polling in competitors)
- **D6:** Automated quotation workflow (request → quote → approval → shipment)
- **D9:** Exception/delay detection (auto-flag stale shipments, missed ETAs)
- **D10:** Analytics and reporting per tenant (carrier performance, volume trends, revenue)
- **D11:** Full end-to-end pipeline: Quote → Shipment → Tracking → Invoice

**Defer (v2+/anti-features):**
- Native mobile apps (web-responsive + PWA instead)
- Payment processing (PCI-DSS scope, handled externally)
- Fleet management / GPS tracking (different product category)
- Warehouse management (WMS — different domain)
- Route optimization / dispatch planning
- Returns management (rare in cross-border freight)
- EDI connections (17TRACK handles carrier EDI)
- Market expansion beyond India/Sri Lanka (architected for, but deferred)

*Full details: [FEATURES.md](./FEATURES.md)*

### Architecture Approach

**Pattern:** Shared-database, shared-schema ("pool" model) with three-layer tenant isolation enforced at middleware, query, and authorization levels. The Hono API server hosts all logic behind a tenant-resolving middleware layer; three Next.js apps consume it via HTTP. Redis serves triple duty as BullMQ backend, Socket.IO pub/sub adapter, and cache store. All async work is offloaded to BullMQ queues (tracking sync, notifications, PDF generation).

**Major components:**
1. **Tenant Resolver Middleware** — extracts tenantId from subdomain (portals), header (admin), or JWT claim. Injects into Hono context + AsyncLocalStorage.
2. **Auth + CASL Guard** — Better Auth validates sessions; `defineAbilityFor()` builds tenant-scoped permissions per request. Checked on every route AND in server components.
3. **Shipment CRUD + Tracking Engine** — core domain: manage shipments, auto-register with 17TRACK, normalize statuses to canonical taxonomy (10 status values).
4. **Notification Dispatcher** — BullMQ worker consuming from `notifications` queue, dispatching via Resend (email) and MSG91 (WhatsApp) with idempotency keys.
5. **Real-Time Hub** — Socket.IO with Redis adapter, tenant-prefixed rooms per shipment (`tenant:{id}:shipment:{id}`), auth-gated subscriptions.
6. **PDF Generator** — BullMQ worker (separate queue, concurrency: 1, isolated child process due to react-pdf memory leak).
7. **Webhook Listener** — receives 17TRACK push, validates HMAC signatures, enqueues to `tracking-sync` queue immediately (synchronous ack, async processing).
8. **Super Admin Views** — cross-tenant queries with explicit CASL-gated bypass of tenantId filter.

**Shared packages** follow a strict build pipeline: `database` (no deps) → `tenant-config` + `auth` + `tracking` → `notifications` → `ui` → frontend apps.

*Full details: [ARCHITECTURE.md](./ARCHITECTURE.md)*

### Critical Pitfalls

These must be designed in from Phase 1, not retrofitted:

1. **Missing `WHERE tenant_id` — cross-tenant data leak** — Prevention: three-layer defense (RLS + repository wrapper + CASL). RLS with `FORCE ROW LEVEL SECURITY` is defense-in-depth even when queries miss the filter. The repository wrapper auto-injects `tenantId` via `withTenant(db, tenantId)` to make missing it a type error. CASL checks every read operation.

2. **Async context bleeding — tenant ID in wrong request** — Prevention: Use `AsyncLocalStorage` exclusively (never module-level `let` or `globalThis`). Every BullMQ job embeds `tenantId` in its payload (workers don't have HTTP context). Socket.IO middleware extracts tenant from handshake auth on connection, not from shared state.

3. **CASL gaps in Next.js Server Components** — Prevention: CASL ability must be built server-side (`defineAbilityFor(user)` works in both environments), not just client-side hooks. Create an `authorize(user, 'manage', 'Shipment')` helper for server actions. Never trust client-side CASL checks alone.

4. **17TRACK 3 req/s rate limit + webhook reliability** — Prevention: All 17TRACK calls go through a BullMQ queue with `limiter: { max: 3, duration: 1000 }`. Batch register up to 40 tracking numbers per call. Ack webhooks immediately (200 OK) then enqueue async processing — never process synchronously. Fallback polling via repeatable BullMQ job if webhook misses events. HMAC signature verification on all webhook requests.

5. **BullMQ silent failure — no dead letter handling** — Prevention: Never `removeOnFail: true`. Retain failed jobs for 7+ days. Implement DLQ pattern: after N retries, move to a dead letter queue + alert Sentry. Track notification delivery status in DB (pending → sent → delivered/failed). Admin UI shows failed notifications with retry button.

6. **React PDF memory leak** — Prevention: Render PDFs in child process (`child_process.fork()` or `worker_threads`). Dedicate separate BullMQ queue for PDF generation with concurrency: 1. Monitor RSS memory per job.

7. **Notification duplication** — 17TRACK at-least-once webhooks + BullMQ retries = duplicate notifications. Prevention: Idempotency keys (`sha256(tenantId + shipmentId + statusCode + timestamp)`) stored in DB with unique constraint. Resend supports `Idempotency-Key` header. BullMQ job IDs set to the notification event's unique key for built-in dedup.

8. **Per-tenant config scoping** — Prevention: `packages/tenant-config` from day one. All branding, locale, sender IDs, templates stored in DB/config, not hardcoded. Cache in Redis with tenant-prefixed keys. Code review flag on any new `if (tenantId)` conditional.

*Full details: [PITFALLS.md](./PITFALLS.md)*

## Implications for Roadmap

### Phase 1: Foundation (Auth, Multi-Tenancy, Core CRUD)
**Rationale:** Everything depends on tenant context, auth, and the core data entities. The three-layer tenant isolation (RLS + Drizzle wrapper + CASL) must exist before any data enters production. Without tenant infrastructure no feature is safe.
**Delivers:** Working auth (email + Google OAuth), tenant resolver middleware, CASL permission system, Drizzle schema + migrations, Customer CRUD, Branch CRUD, Tenant Config service, BullMQ scaffolding.
**Addresses:** T6, T10, T11, D2, D8 (scaffolding)
**Avoids:** P1 (missing tenantId filter), P2 (async context bleed), P3 (server-side CASL gaps), P8 (hardcoded tenant config), P14 (SQL injection), P16 (cross-tenant sessions)
**Stack used:** Hono, Next.js admin app, PostgreSQL, Drizzle ORM, Better Auth, CASL, Redis (session store), BullMQ (scaffolding), Biome, Sentry
**Architecture implemented:** Tenant Resolver middleware, Auth middleware, CASL Guard, Customer Manager, Branch Manager, Tenant Config
**Research flags:** None — well-documented patterns for auth, multi-tenancy, and ORM setup. Skip `/gsd-research-phase`.

### Phase 2: Core Tracking (Shipments + Real-Time Dashboard)
**Rationale:** Tracking is the primary value proposition. Requires shipments CRUD and 17TRACK integration to exist. Dashboard depends on tracking data flowing in.
**Delivers:** Shipment CRUD + bulk import, 17TRACK API integration (register + poll), webhook listener, tracking status normalization, real-time admin dashboard with KPIs, exception/delay detection cron.
**Addresses:** T1, T2, T5, T7, D9
**Stack used:** Hono tracking routes, 17TRACK API client (in `packages/tracking`), BullMQ `tracking-sync` queue, Sentry OTel tracing
**Architecture implemented:** Shipment CRUD, Tracking Engine, Webhook Listener, Dashboard
**Research flags:** None — 17TRACK API is documented, BullMQ patterns are standard. Skip `/gsd-research-phase`.

### Phase 3: Customer Portals & Notifications
**Rationale:** Customer-facing value requires white-label portals, proactive notifications, and real-time updates. This is the most complex phase due to the interplay of webhook processing → notification dispatch → Socket.IO push, each with its own reliability and rate-limiting concerns.
**Delivers:** India + Sri Lanka white-label portals, tenant-branded notification templates (email + WhatsApp), real-time Socket.IO tracking updates, notification preferences per customer.
**Addresses:** T3, T4, D1, D4, D5
**Avoids:** P4 (17TRACK rate limits — BullMQ rate limiter), P5 (silent notification failures — DLQ + monitoring), P7 (notification duplication — idempotency keys), P13 (HMAC verification), P15 (notification provider rate limits), P17 (free tier tracking), P18 (carrier list sync), P20 (template versioning)
**Stack used:** React Email + Resend, MSG91 WhatsApp, Socket.IO + Redis adapter, BullMQ `notifications` queue
**Architecture implemented:** Real-Time Hub, Notification Dispatcher, white-label Next.js apps (India + Sri Lanka), per-tenant branding system
**Research flags:** **YES — `/gsd-research-phase` recommended.** This phase has the highest failure surface: React PDF memory leak isolation strategy, MSG91 WhatsApp rate limits and business-hour restrictions, Resend batch API patterns, and notification template versioning all need deeper investigation during planning.

### Phase 4: Admin Operations (Quotes, Invoices, Lifecycle Pipeline)
**Rationale:** Closes the business loop — quote, ship, deliver, invoice. Requires customers, branches, and shipments to exist. Can be built in parallel with Phase 3 using Stream B (admin tools).
**Delivers:** Quotation management (draft → sent → accepted → converted), invoice generation (PDF via React PDF), full Quote → Shipment → Invoice lifecycle pipeline, admin KPIs dashboard.
**Addresses:** T8, T9, T12, D6, D7, D11
**Avoids:** P6 (React PDF memory leak — child process isolation)
**Stack used:** @react-pdf/renderer (in child process), BullMQ `pdf-gen` queue, existing shipment infrastructure
**Architecture implemented:** Quotation Manager, Invoice Manager, PDF Generator (isolated worker)
**Research flags:** None — quote/invoice CRUD patterns are standard. React PDF pattern is documented (child process isolation). Skip `/gsd-research-phase`.

### Phase 5: Super Admin & Cross-Tenant Intelligence
**Rationale:** Requires data from all tenants across all features to exist. Cross-tenant analytics are meaningless without data volume.
**Delivers:** Super admin cross-tenant dashboard (all orgs, shipments, revenue), analytics & reporting (carrier performance, on-time delivery, volume trends), CSV/PDF exports.
**Addresses:** D3, D10
**Avoids:** P9 (Socket.IO room cross-tenant broadcast — tenant prefix enforcement), P10 (Redis cache key collision), P11 (BullMQ Redis memory exhaustion), P12 (BullMQ workers losing tenant context)
**Architecture implemented:** Super Admin Views (CASL-gated tenantId bypass), Analytics Engine
**Research flags:** None — standard analytics patterns and infrastructure hardening. Skip `/gsd-research-phase`.

### Phase Ordering Rationale

- **Foundation-before-features:** Phase 1 must precede everything because tenant isolation is a prerequisite for any data operation. There is no shortcut.
- **Tracking-before-portals:** Phases 2 → 3 are sequential because customer portals only add value once tracking data is flowing.
- **Admin ops parallelizable:** Phase 4 can run in parallel with Phase 3 (they share no blocking dependencies beyond Phase 1). Two streams:
  - Stream A (Core domain): Phase 1 → Phase 2 → Phase 3
  - Stream B (Admin tools): Phase 1 → Phase 4
- **Intelligence last:** Phase 5 requires data from all preceding phases. Cannot start meaningfully until Phases 2-4 are producing real data.
- **Infrastructure pitfalls addressed at each layer:** Redis key prefixing (P10), Socket.IO room scoping (P9), BullMQ retention (P11), and worker context isolation (P12) are all reserved for Phase 5 because they only become critical at scale — but the patterns should be documented in shared package READMEs from Phase 1.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 14/17 technologies verified via official npm/GitHub sources. 3 (Coolify, MSG91, 17TRACK) at MEDIUM via web search. No deal-breakers. |
| Features | HIGH | Features sourced from official competitor docs (AfterShip, 17TRACK, Logixboard, Fourways Track) and industry analyses. Taxonomy is well-understood for shipment tracking. |
| Architecture | HIGH | Synthesized from official docs (Socket.IO, BullMQ, CASL, Hono, Drizzle) and existing GT Express patterns. The three-layer isolation pattern is industry-standard for shared-DB multi-tenancy. |
| Pitfalls | HIGH | 8 of 20 pitfalls sourced from official documentation or confirmed GitHub issues (react-pdf #2848, 17TRACK rate limits, BullMQ docs). The remaining from community/industry consensus (MEDIUM). |

**Overall confidence:** HIGH

### Gaps to Address

- **Drizzle ORM version decision:** The research cannot decide between v0.45.x and v1.0.0-rc.3. **Action:** Start with `^0.45.2` (stable) during Phase 1. Re-evaluate when v1.0.0 stable ships. Plan a discrete migration phase if warranted.
- **MSG91 WhatsApp rate limits:** MSG91's exact rate limits for WhatsApp Business API are not publicly documented. **Action:** Wrap MSG91 calls behind a rate-limiting abstraction in `packages/notifications` with configurable per-minute/per-hour limits. Default to conservative values (10/min) and tune after testing.
- **Resend daily quota limits:** Resend's free-tier and paid-tier daily send limits need confirmation from the Resend account setup. **Action:** Add configurable quota thresholds to the notification dispatcher with admin alerting when approaching limits.
- **Socket.IO + Hono server attachment:** The `@hono/node-server` → Socket.IO attachment pattern (sharing the HTTP server) needs validation in Phase 1. **Alternative:** Run Socket.IO on a separate port (4001). Allocate 1-2 days for integration testing.
- **17TRACK free tier monitoring:** 17TRACK changed pricing in January 2026 (200 tracking numbers one-time). The exact account-level metrics available via API need verification during 17TRACK integration. **Action:** Build the admin dashboard's 17TRACK usage widget to gracefully handle missing metrics.
- **React Email v6 upgrade path:** The unified `react-email` package is confirmed but the exact import path changes from `@react-email/components` need verification during Phase 3. **Action:** Start with a simple test template in Phase 1 to validate import paths.

## Sources

### Primary (HIGH confidence)
- [Hono npm](https://www.npmjs.com/package/hono) — v4.12.23, Web Standard API server
- [Better Auth GitHub](https://github.com/better-auth/better-auth) — 28.6K stars, native Drizzle adapter
- [BullMQ npm + docs](https://www.npmjs.com/package/bullmq) — v5.78.0, OTel support, queue patterns
- [Socket.IO v4 docs](https://socket.io/docs/v4/server-installation/) — room isolation, Redis adapter
- [Drizzle ORM npm](https://www.npmjs.com/package/drizzle-orm) — v0.45.2 / v1.0.0-rc.3
- [@casl/ability npm](https://www.npmjs.com/package/@casl/ability) — v7.0.0, ABAC
- [React Email npm](https://www.npmjs.com/package/react-email) — v6.1.4, unified package
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) — v4.5.1, memory leak #2848
- [Biome npm](https://www.npmjs.com/package/@biomejs/biome) — v2.4.13, 465 rules
- [Sentry Node npm](https://npmx.dev/package/@sentry/node/v/%5E10.55.0) — v10.55.0+, OTel-based
- [Next.js 16.2.6 Security Advisory](https://devtoolpicks.com/blog/nextjs-security-patches-may-2026-indie-hackers) — 13 CVEs, pin minimum
- [17TRACK API v2 Documentation](https://api.17track.net/en/doc) — rate limits, webhooks, 3,300+ carriers
- [AfterShip Official Features](https://aftership.com) — competitor feature baseline
- PostgreSQL RLS Docs — defense-in-depth tenant isolation
- Node.js AsyncLocalStorage Docs — tenant context propagation
- React-pdf GitHub Issue #2848 — confirmed memory leak

### Secondary (MEDIUM confidence)
- [Coolify v4.1.2 Release](https://releaseport.com/r/coolify/v4-1-2) — self-hosted PaaS
- [Drizzle + Nile Tutorial](https://drizzle-orm.com) — SET LOCAL pattern for tenant context
- [Logixboard](https://logixboard.com) — white-label portal feature breakdown
- [Freightify](https://checkthat.ai/brands/freightify) — quote automation feature analysis
- [Fourways Track](https://fourways-track.info) — admin dashboard patterns
- [Locus.sh Logistics Framework](https://locus.sh) — 8-capability logistics evaluation
- [Acquaint Softtech Logistics Guide 2026](https://acquaintsofttech.com) — industry analysis
- [17TRACK Pricing Change January 2026](https://www.17track.net) — free tier restructuring
- [Resend API Docs](https://resend.com/docs) — Idempotency-Key header support
- [Redis Best Practices for Multi-Tenant SaaS](https://redis.io) — tenant-prefixed keys
- Multi-tenant SaaS architecture guides (launchpad.io, bastionary.com, saaslaunchlab.com)
- [WorkOS CASL RBAC Guide](https://workos.com) — tenant-scoped role design

### Tertiary (LOW confidence)
- MSG91 npm package (v2.2.8 — stale, recommend wrapping REST API directly)
- Community patterns for server-side CASL ability building in Next.js
- BulkV/SMS rate limit documentation (MSG91 inferred from provider patterns)

---
*Research completed: 2026-06-13*
*Ready for roadmap: yes*
