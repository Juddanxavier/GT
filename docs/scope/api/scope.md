# Scope: API Server

The Hono API behind all three frontends: auth, tenancy, shipments, tracking, notifications, invoices, caching, and the background workers. This scope covers the hardening and performance pass on top of what already ships.

**Build approach:** Tracer Bullet (each improvement built end to end and verified before the next).
**Workflow:** Beta (after develop, run check verify, then test). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Auth, sessions & account flows | existing | existing |
| 2 | Multi-tenant isolation & authorization | existing | existing |
| 3 | Shipments, tracking & provider sync | existing | existing |
| 4 | Notifications (email + WhatsApp) | existing | existing |
| 5 | Invoices, quotations & PDFs | existing | existing |
| 6 | Branches, customers, rate cards & users | existing | existing |
| 7 | Workers, queues & webhooks | existing | existing |
| 8 | Dashboard, reports, search & audit routes | existing | existing |
| 9 | Middleware, rate limits & security headers | existing | existing |
| 10 | Redis caching layer | existing | existing |
| 11 | Vitest test suite | existing | existing |
| 12 | Logging adoption & request correlation | Foundation | done |
| 13 | Error response unification | Foundation | planned |
| 14 | Production lockdown of seed & debug routes | Foundation | planned |
| 15 | Index & query review | Slice 1 | planned |
| 16 | Cache invalidation coverage | Slice 1 | planned |
| 17 | Worker metrics & DLQ alerting | Slice 2 | planned |
| 18 | Route contract tests | Slice 2 | planned |
| 19 | Published API contract (OpenAPI) | Slice 3 | planned |

## Existing

### 1. Auth, sessions & account flows · existing
Better Auth handlers, sign in, forgot and reset password with rate limiting, OTP, invitation acceptance, and session middleware. code in `apps/api/src/auth.ts`, `apps/api/src/auth-api.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/services/otp.ts`

### 2. Multi-tenant isolation & authorization · existing
Tenant and branch middleware, CASL based authorization, row level security migration, and the tenant isolation test suite that guards the boundary. code in `apps/api/src/middleware/tenant.ts`, `apps/api/src/middleware/branch.ts`, `apps/api/src/middleware/authorization.ts`, `apps/api/src/db/apply-rls.ts`

### 3. Shipments, tracking & provider sync · existing
Shipment CRUD, status transitions, 17TRACK and TrackingMore providers, event normalization, dedup, retrack, and the public track endpoint. code in `apps/api/src/routes/shipments.ts`, `apps/api/src/shipment-providers/`, `apps/api/src/services/shipment.ts`

### 4. Notifications (email + WhatsApp) · existing
Event map, idempotency keys, preference filtering, Resend email templates, and MSG91 WhatsApp provider with its own rate limit cooldown. code in `apps/api/src/notifications/`, `apps/api/src/email/`

### 5. Invoices, quotations & PDFs · existing
Invoice and quotation routes, PDF rendering with custom fonts, report PDFs, and the invoice service that pulls rates and line items. code in `apps/api/src/routes/invoices.ts`, `apps/api/src/routes/quotations.ts`, `apps/api/src/invoice/`

### 6. Branches, customers, rate cards & users · existing
Standard CRUD route groups with pagination, validation, audit writes, and soft archive. code in `apps/api/src/routes/branches.ts`, `apps/api/src/routes/customers.ts`, `apps/api/src/routes/rate-cards.ts`, `apps/api/src/routes/users.ts`

### 7. Workers, queues & webhooks · existing
Webhook receiver with signature verification, webhook worker, retrack scheduling, and a DLQ monitor that reports to Sentry. code in `apps/api/src/workers/`, `apps/api/src/queues/`, `apps/api/src/routes/webhooks.ts`

### 8. Dashboard, reports, search & audit routes · existing
Aggregated KPI stats with short TTL cache, report endpoints, cross entity search, and grouped audit log listing. code in `apps/api/src/routes/dashboard.ts`, `apps/api/src/routes/reports.ts`, `apps/api/src/routes/search.ts`, `apps/api/src/routes/audit-logs.ts`

### 9. Middleware, rate limits & security headers · existing
CORS, request ID, global and per route rate limits, account lockout, timeout, compression, payload cap, security headers, and Sentry instrumentation, applied in a deliberate order in `index.ts`. code in `apps/api/src/middleware/`, `apps/api/src/index.ts`

### 10. Redis caching layer · existing
Tenant prefixed keys, `withCache` read through helper, and `cacheDel` invalidation already called from the shipment, invoice, quotation, branch, and customer writes. code in `apps/api/src/cache.ts`

### 11. Vitest test suite · existing
Around 26 test files covering middleware, validators, routes, tenant isolation, workers, and an end to end smoke test. code in `apps/api/vitest.config.ts`, `apps/api/src/**/*.test.ts`

## Foundation

### 12. Logging adoption & request correlation · in-progress
Pino already exists but roughly 140 `console.*` calls (38 in `index.ts`, the rest in seed, workers, redis, and providers) bypass it, so production logs are not structured and nothing correlates to a request ID.
**Done when:** every log in `src/` goes through the pino logger, request ID and tenant ID ride along on each line, and searching one request ID reconstructs the whole request path.
- [x] Design it (spec): `/architect logging adoption & request correlation`
- [x] Build it: /develop logging adoption & request correlation
   - [x] Core logger upgrades and one proven request path: `createLogger` factory, tenantId rebind, middleware order, level by status, masking hook, id validation, `LOG_PRETTY`, silent tests, awaited flush, then grep one minted id end to end (AC-2, AC-4, AC-5, AC-6)
   - [x] Convert every remaining console area: routes, services, middleware, providers, email, workers, cache, redis, realtime, seed and migration scripts, root scripts (AC-1, AC-3)
   - [x] Flip `noConsole` on with lint green (lint task widened) and mint ids in the admin proxy (AC-1, AC-7)
- [x] Verify it: /check verify logging adoption & request correlation
- [x] Test it: /test logging adoption & request correlation
Spec [0001](../../specs/api/0001-logging-request-correlation.md) · code in `apps/api/src/logger.ts`, `apps/api/src/logging-guard.test.ts`, `apps/api/src/index.ts`

### 13. Error response unification · needs a decision
Two error shapes coexist: the `errorResponse` helper with a code and request ID (27 uses) and about 276 hand rolled `c.json({ error: ... })` bodies, so clients must parse both and codes drift per route.
**Done when:** every route returns `{ error: { code, message }, requestId }` from the one helper, codes are documented in a single place, and a test asserts no route escapes the shape.
- [ ] Design it (spec): `/architect error response unification`

### 14. Production lockdown of seed & debug routes · needs a decision
`/api/seed/superadmin` and `/api/seed/tenant` are guarded only by a shared secret that can be left set in production, and seed credentials default to a real looking email; debug routes are already gated but the pattern needs one rule. Note from the Oct 15 replan: the production refusal already ships (both seed routes return `CONFIG_ERROR` when `NODE_ENV` is production and the `SEED_*` password or email env vars are unset, and the CLI seeder exits instead of using fallbacks), so the spec only owes the single rule, its test, and the debug route pattern. code in `apps/api/src/index.ts`, `apps/api/src/db/seed-superadmin.ts`
**Done when:** seed routes refuse to run when `NODE_ENV` is production, no credential defaults exist, and the rule is stated once and tested.
- [ ] Design it (spec): `/architect production lockdown of seed & debug routes`

## Slice 1: Performance

### 15. Index & query review · needs a decision
List, filter, and search queries run on tenant, status, date, and text columns against a schema with about 41 declared indexes, none verified against real query plans; the dashboard and shipment detail also fan out per row lookups.
**Done when:** the hot queries (shipment list, dashboard stats, search, shipment detail) are checked with `EXPLAIN`, missing indexes are added in a migration, and no hot path does an N+1.
- [ ] Design it (spec): `/architect index & query review`

### 16. Cache invalidation coverage · needs a decision
Writes to shipments, invoices, quotations, branches, and customers invalidate their keys, but dashboard stats, search, and the tenant scoped lists can serve stale data until their TTL lapses after a status change.
**Done when:** every mutation invalidates each cached read it affects, a status change is visible on the dashboard immediately, and a test proves no stale read survives a write.
- [ ] Design it (spec): `/architect cache invalidation coverage`

## Slice 2: Observability & tests

### 17. Worker metrics & DLQ alerting · needs a decision
The DLQ monitor captures to Sentry but queue depth, failure rate, provider latency, and retrack backlog are only visible by reading logs, so a stalled worker goes unnoticed until a customer complains.
**Done when:** queue depth, job failures, and provider latency are emitted as metrics, a DLQ growth alert fires, and one dashboard view answers "is the pipeline healthy".
- [ ] Design it (spec): `/architect worker metrics & DLQ alerting`

### 18. Route contract tests
Extend the existing suite with contract tests per route group: status codes, error shape, auth and tenant boundaries, and pagination semantics, so a refactor cannot silently break a frontend.
**Done when:** each route group has at least one happy path, one unauthenticated rejection, one cross tenant rejection, and an error shape assertion, all running in the default `test` task.
- [ ] Build it: /develop route contract tests

## Slice 3: Contract

### 19. Published API contract (OpenAPI) · needs a decision
The three frontends hand write their API types (`apps/admin/lib/queries/types.ts` and friends), which drift from the routes; publish a generated contract so clients can generate theirs and a CI check catches drift.
**Done when:** the contract generates from the routes in CI, describes auth, tenancy, and error codes, and a drift check fails the build when a route changes without updating it.
- [ ] Design it (spec): `/architect published API contract (OpenAPI)`

## Deferred
Out of scope for this pass, kept so the plan stays honest.
- **Rate limit tuning per route**: the global limiter and per route cooldowns stay as they are until real traffic shows a problem.
- **Socket.IO to SSE migration**: same as the admin scope, deferred until bundle size is measured.
- **Read replica / query offload**: not worth it until the index review proves the primary is the bottleneck.
- **API versioning (`/v2`)**: no breaking change is planned, so no version prefix yet.
- **Request body logging**: PII heavy, deferred rather than add redaction surface area.

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+) |
| `in-progress` (building) | `/develop` | milestone sub-boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is** | boxes you ran ticked, skipped ones marked skipped; for Beta the suggested point is after `/test` |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop`. The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Workflow** (header line) is the project default, what runs after `/develop`: **Beta** = `/check verify` then `/test`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
