# Roadmap: Gajan Traders — Multi-Tenant Shipment Tracking

## Overview

A multi-tenant shipment tracking platform for Gajan Traders serving two organizations with multiple branches. Three surfaces (admin app, India customer portal, Sri Lanka customer portal) share a single Hono API, with 17TRACK carrier tracking, email (Resend) and WhatsApp (MSG91) notifications, and tenant-isolated data. The roadmap builds in 10 phases, prioritizing the admin app first — customer portals postponed to Phase 9.

## Phases

- [x] **Phase 1: Tooling & Foundation**
- [x] **Phase 2: Auth & Multi-Tenancy**
- [x] **Phase 3: Infrastructure Backbone**
- [x] **Phase 4: Admin Core — Customers, Branches, Shipments**
- [x] **Phase 5: Tracking Engine** — 17TRACK + TrackingMore providers, webhooks, polling, dedup, carrier detection, tracking timeline
- [ ] **Phase 6: Notifications Engine** — Email (Resend), WhatsApp (MSG91), idempotency, dead letter queue
- [ ] **Phase 7: Admin Operations — Quotes & Invoices** — Quotations, invoices, PDF generation
- [ ] **Phase 8: Admin Dashboard & Intelligence** — KPIs, real-time metrics, exception detection
- [ ] **Phase 9: Customer Portals** — White-label India/Sri Lanka portals, tenant branding *(postponed)*
- [ ] **Phase 10: Deployment** — Docker, Coolify, domain routing
- [ ] **Phase 11: RBAC Hierarchy Enforcement** — Branch-scoped staff permissions, requireBranchScope middleware, queryScope data filters, billAmount protection
- [ ] **Phase 13: User Onboard Flow** — Direct user creation + token-based onboard page, no OTP

## Phase Details

### Phase 1: Tooling & Foundation
**Goal**: Development environment configured with consistent tooling, package versions, and database ORM
**Depends on**: Nothing (first phase)
**Requirements**: TOOL-01, TOOL-02, TOOL-03
**Success Criteria** (what must be TRUE):
  1. iome check passes across entire monorepo with zero errors
  2. All workspace packages resolve correctly with pnpm install and pnpm build
  3. Drizzle Kit can generate and apply a migration against a local PostgreSQL database
  4. All Next.js apps build successfully with version ^16.2.6 pinned
**Plans**: TBD

### Phase 2: Auth & Multi-Tenancy
**Goal**: Users can authenticate, are assigned role-based permissions, and are scoped to their tenant with defense-in-depth isolation
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
   1. Admin can log in with email/password and Google OAuth; session persists across browser restarts
   2. Tenant resolver middleware extracts tenant from subdomain (portals) or X-Tenant-ID header (admin) and injects it into request context
   3. Staff users (superadmin, tenant-admin, staff) can access admin app; customers are redirected/blocked
   4. CASL ability definitions enforce role-based permissions across all 4 roles
   5. PostgreSQL Row-Level Security policies prevent cross-tenant data access even if a query misses the tenantId filter
**Plans**: 7 plans (5 waves)
**UI hint**: yes

Plans:
- [ ] 02-01-PLAN.md — Database Schema: tenants, branches, tenant_domains, extended user table
- [x] 02-02-PLAN.md — Better Auth Config & Hono Integration
- [ ] 02-03-PLAN.md — CASL Permissions Package (@repo/permissions)
- [ ] 02-04-PLAN.md — Admin Login UI with HeroUI components
- [ ] 02-05-PLAN.md — Tenant Resolver Middleware with domain caching
- [ ] 02-06-PLAN.md — Route Guards: CASL middleware & Admin Access Control
- [ ] 02-07-PLAN.md — RLS Policies & Phase 2 Verification

### Phase 3: Infrastructure Backbone
**Goal**: Background job processing, caching, real-time messaging, error monitoring, and rate limiting are operational and tenant-aware
**Depends on**: Phase 1
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-05
**Success Criteria** (what must be TRUE):
  1. BullMQ workers connect to Redis and process jobs from queues with proper tenant context propagation
  2. Redis cache stores and retrieves values with tenant-prefixed keys (	:{tenantId}:)
  3. Socket.IO server accepts connections and broadcasts messages to tenant-scoped rooms (no cross-tenant bleed)
  4. Sentry captures errors with 	enantId tagged on every event
  5. Better Auth rate limiting protects auth endpoints (sign-in: 3 req/10s, sign-up: 5 req/hr)
**Plans**: 1 plan (03-01-PLAN.md)
**Completed**: 2026-06-14

### Phase 4: Admin Core — Customers, Branches, Shipments
**Goal**: Staff can create and manage the core business entities — customers, branches, shipments, and quotations — through the admin app
**Depends on**: Phase 2
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-04, ADMIN-06
**Success Criteria** (what must be TRUE):
   1. Staff can create, edit, view, and deactivate customers scoped to their org/branch
   2. Staff can add and edit branches within their organization
   3. Staff can create shipments with tracking numbers, edit shipment details, and deactivate shipments
   4. All CRUD operations are tenant-isolated — staff only see data from their own org and assigned branches
   5. Form dropdowns (customer, branch, status) are scoped to the user's org and permissions
**Completed Milestones**:
   - DB schema: customer, quotation, quote_item, shipment tables with indexes + RLS
   - Migration 0004 applied to NeonDB
   - Zod validation schemas for all entities
   - API routes: branches CRUD (4), customers CRUD (5), quotations CRUD + status transitions + convert-to-shipment (6), shipments CRUD (5)
   - HeroUI v3 installed as shared design system in @repo/ui (replaces shadcn)
   - All list pages: HeroUI Table with sorting, pagination, KPI cards, status filter Tabs, dropdown context menu, create Modal, delete Modal
   - All detail pages: Read-only Card view, edit Modal, delete Modal
   - Create/Edit as Modals (no separate /entity/new pages) — Modal.Backdrop controlled pattern
   - Responsive search+filters (flex-col sm:flex-row)
   - KPI card redesign: modern minimal cards with trend badges and sparklines
**UI framework**: HeroUI v3 (@heroui/react 3.1.0) — accessed from @repo/ui, no Provider wrapper needed
**UI hint**: yes
**Completed**: 2026-06-14

### Phase 5: Tracking Engine
**Goal**: Shipments are automatically tracked via 17TRACK/TrackingMore with status changes flowing into the system through webhooks with polling fallback
**Depends on**: Phase 3, Phase 4
**Success Criteria** (what must be TRUE):
   1. Staff searches customers by email/phone on shipment create/edit; "Self" toggle for no-customer shipments
   2. Carrier detection flow: click Detect → auto-detects → if fails, carrier dropdown appears → register with selected carrier
   3. New shipments are automatically tracked (registered via detect flow)
   4. Webhooks are received, HMAC verified, 200 OK immediately, async processing
   5. Tracking timeline with all status events visible on shipment detail page
   6. Polling fallback (6h) catches events missed by webhooks
**Plans**: 05-01-PLAN.md (completed 2026-06-15)

### Phase 6: Notifications Engine
**Goal**: Customers automatically receive email and WhatsApp notifications when their shipment tracking status changes, with idempotency guarantees
**Depends on**: Phase 5
**Requirements**: TRACK-03, TRACK-04, INFRA-07, INFRA-08
**Success Criteria** (what must be TRUE):
  1. Email notification (React Email template with tenant branding) is sent via Resend API on each unique status change
  2. WhatsApp notification is sent via MSG91 on each unique status change, using tenant-scoped sender numbers
  3. Duplicate webhook events do not produce duplicate notifications — idempotency keys prevent re-sends
  4. Failed notification jobs (after N retries) are moved to a dead letter queue with Sentry alerting
  5. Email and WhatsApp templates use tenant-branded content (logo, colors, locale, sender identity)
**Plans**: 5 plans (06-01 through 06-05)

Plans:
- [ ] 06-01-PLAN.md — ZeptoMail Provider + React Email Templates
- [ ] 06-02-PLAN.md — Trigger Integration: Map 17TRACK Events → Notification Queue
- [ ] 06-03-PLAN.md — Idempotency + Dead Letter Queue + Sentry Alerting
- [ ] 06-04-PLAN.md — WhatsApp Notifications via MSG91
- [ ] 06-05-PLAN.md — Admin Notification Settings UI (optional, low priority)

### Phase 7: Admin Operations — Quotes & Invoices
**Goal**: Staff can manage the full financial workflow — quotations and invoices with PDF generation
**Depends on**: Phase 3, Phase 4
**Requirements**: ADMIN-04, ADMIN-05, INFRA-04
**Success Criteria** (what must be TRUE):
  1. Staff can create quotations from scratch or in response to customer requests, with status tracking
  2. Quotations transition through well-defined states (draft → sent → accepted → converted to shipment)
  3. Staff can generate invoices and download them as PDFs within seconds
  4. PDF generation runs in an isolated worker process (no API server memory impact from react-pdf)
  5. Invoices contain all required fields: shipment reference, customer details, charges, taxes, totals
**Plans**: TBD
**UI hint**: yes

### Phase 8: Admin Dashboard & Intelligence
**Goal**: Staff see real-time operational KPIs and exception alerts at a glance
**Depends on**: Phase 4, Phase 5, Phase 7
**Requirements**: ADMIN-03
**Success Criteria** (what must be TRUE):
  1. Dashboard displays active shipments, in-transit count, delivered-today, and exceptions in real-time
  2. Dashboard metrics update via Socket.IO push as tracking events arrive (no manual refresh needed)
  3. All dashboard data is tenant-scoped — each admin sees only their org's metrics
  4. Exception flags highlight shipments that missed expected ETAs or have stale tracking status
**Plans**: TBD
**UI hint**: yes

### Phase 9: Customer Portals *(postponed)*
**Goal**: Customers can log into their tenant's white-label portal to view shipments, tracking status, quotes, and invoices with their organization's branding
**Depends on**: Phase 2, Phase 5, Phase 6, Phase 7
**Success Criteria** (what must be TRUE):
   1. Customer can create an account on both India and Sri Lanka portals (but not on admin app)
   2. Customer can log in and see only their own shipments with live tracking status from 17TRACK
   3. Customer can view their quotations and download their invoices
   4. Each portal displays correct tenant branding (logo, colors, domain, locale) loaded from packages/tenant-config
   5. Real-time tracking updates appear on the portal via Socket.IO without page refresh
**UI hint**: yes

### Phase 10: Deployment
**Goal**: All four apps are containerized, configured for standalone Next.js output, and deployed via Coolify with their own domains
**Depends on**: Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, Phase 7, Phase 8, Phase 9
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03
**Success Criteria** (what must be TRUE):
  1. Docker Compose builds 4 containers (admin, india, srilanka, api) with Next.js standalone output
  2. Each app deploys as a separate Coolify project with its own environment variables and domain
  3. Traefik (Coolify proxy) routes requests to the correct container by domain or subdomain
  4. Tenant resolution works correctly in production — subdomain-based routing resolves the right portal
**Plans**: TBD

## Execution Strategy

Finish admin app before customer portals. Streams are sequential after Phase 4:

| Order | Phase | Dependency |
|-------|-------|------------|
| 1-4 | Foundation → Auth → Infra → Admin CRUD | — |
| 5 | Tracking Engine (with async customer search) | P3, P4 |
| 6 | Notifications Engine | P5 |
| 7 | Quotes & Invoices | P3, P4 |
| 8 | Dashboard & Intelligence | P5, P7 |
| 9 | Customer Portals *(postponed)* | P2, P5, P6, P7 |
| 10 | Deployment | All

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Tooling & Foundation | 1/1 | Complete | 2026-06-14 |
| 2. Auth & Multi-Tenancy | 7/7 | Complete | 2026-06-14 |
| 3. Infrastructure Backbone | 1/1 | Complete | 2026-06-14 |
| 4. Admin Core — CRUD | 1/1 | Complete | 2026-06-14 |
| 5. Tracking Engine | 1/1 | Complete | 2026-06-15 |
| 6. Notifications Engine | 0/5 | **Ready to plan** | - |
| 7. Quotes & Invoices | 0/TBD | Not started | - |
| 8. Dashboard & Intelligence | 0/TBD | Not started | - |
| 9. Customer Portals | 0/TBD | Postponed | - |
| 10. Deployment | 0/TBD | Not started | - |

### Phase 11: RBAC — maintain hierarchy and tenant admin and staff of that branch can only see shipment, quotes, users, invoice, branch

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 4 (Admin Core CRUD)
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 11 to break down)

### Phase 13: User Onboard Flow

**Goal:** Replace invite flow with direct user creation + token-based onboard page. Admin creates user, email links to `/onboard?token=xxx`, user sets password + confirms name in one step. No OTP, no forgot-password confusion.

**Depends on:** Phase 4
**Plans:** 1 plan (13-user-onboard-flow/PLAN.md)

---

### Phase 12: Filtering & Security Hardening

**Goal:** Close all filtering gaps to ensure tenant and branch data isolation is watertight across all surfaces (API routes, Socket.IO, frontend state, DB schema).

**Depends on:** Phase 2 (Auth), Phase 4 (Admin Core), Phase 8 (Dashboard)

**Requirements:**

| ID | Requirement | Severity | Batch |
|----|-------------|----------|-------|
| SEC-01 | Socket.IO must authenticate connections via session cookie and verify tenant/branch room membership server-side before allowing joins | Critical | 2 |
| SEC-02 | Customers PATCH/DELETE must use `getQueryScope(c)` and `requireBranchScope()` to prevent cross-branch writes | High | 2 |
| SEC-03 | Shipments POST must validate `branchId` in request body against the user's assigned branch (staff) or override (tenant-admin) | High | 2 |
| SEC-04 | Shipments DELETE must include `scope.branchId` in WHERE clause to prevent cross-branch deletion | High | 2 |
| SEC-05 | Shipments stop-tracking must include `scope.branchId` in WHERE clause | High | 2 |
| SEC-06 | `trackingEvents` and `invoices` tables must gain a `branchId` column (migration) with branch-level filtering in queries | High | 1 |
| SEC-07 | Frontend localStorage filters must be cleared on session change/logout to prevent stale X-Branch-ID from breaking the next user's session | High | 6 |
| SEC-08 | Quotations POST must validate `branchId` in request body against the user's branch scope | Medium | 2 |
| SEC-09 | Branch validation cache (`middleware/branch.ts`) must support invalidation on branch update/delete | Medium | 2 |
| SEC-10 | `X-Branch-ID: "undefined"` or `"null"` string values should be silently ignored instead of returning 400 | Low | 2 |
| SEC-11 | Add unique constraint on `(tenantId, trackingNo)` to prevent cross-tenant webhook ambiguity | Low | 2 |
| SEC-12 | CORS origin must be configurable via env var, not hardcoded | Critical | 2 |
| SEC-13 | CSRF protection — add SameSite=Strict on cookies or token validation | Critical | 2 |
| SEC-14 | Debug endpoint `POST /api/debug/fire-notification` must be authenticated | Critical | 2 |
| SEC-15 | RLS must be enabled on `tracking_event` and `invoice` tables | Critical | 2 |
| SEC-16 | Add security headers middleware (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) | High | 2 |
| SEC-17 | Forgot-password must not leak user enumeration — return generic message | High | 2 |
| SEC-18 | Webhook `TRACK_WEBHOOK_SECRET` must have a non-empty default or validation | High | 2 |
| SEC-19 | Staff PATCH allowlist must remove `branchId` | High | 2 |
| SEC-20 | Bull Board `/jobs` must be authenticated with `requireRole` | High | 2 |
| SEC-21 | Superadmin must be allowed to use X-Branch-ID header | High | 2 |
| SEC-22 | Webhook handler must include `tenant_id` in shipment lookup | High | 2 |
| SEC-23 | RLS must be enabled on `onboard_tokens` table | Medium | 2 |
| SEC-24 | User table RLS policy must use `is_tenant_accessible()` helper | Medium | 2 |
| SEC-25 | Customer email/phone should have at least one required | Medium | 2 |
| SEC-26 | Session cookie must set explicit SameSite attribute | Low | 2 |
| SEC-27 | Password policy must require complexity (upper+lower+digit+min 8) | Low | 2 |
| SEC-28 | Webhook body verification must use raw bytes, not JSON.stringify reconstruction | Low | 2 |
| DTA-01 | Add `courierCode` and `customerName` columns to shipments schema | Critical | 1 |
| DTA-02 | Fix `customerId ?? ''` to `customerId ?? null` in auto-invoice | Critical | 1 |
| DTA-03 | Wrap all multi-table writes in `db.transaction()` | Critical | 1 |
| DTA-04 | Fix migration journal — add 0017/0018 entries, handle 0002 gap | High | 1 |
| DTA-05 | Batch event insertion — use `db.insert().values(events).onConflictDoNothing()` | High | 1 |
| DTA-06 | Remove duplicate `shipments.payload` JSONB or add sync guarantee | High | 1 |
| DTA-07 | Change `paid_at` default from `NOW()` to `NULL` | Medium | 1 |
| DTA-08 | Fix `paid_at` default in migration 0014 | Medium | 1 |
| DTA-09 | Add DOWN migrations for each existing migration | Low | 1 |
| DTA-10 | Define squash checkpoint strategy | Low | 1 |
| DTA-11 | Make seed script deterministic | Low | 1 |
| RATE-01 | Add global rate limiter middleware | Critical | 3 |
| RATE-02 | Add rate limiting on create endpoints (shipments, invoices) | Medium | 3 |
| RATE-03 | Re-enable rate limiting on `/get-session` | Low | 3 |
| OBS-01 | Add `process.on('unhandledRejection')` and `process.on('uncaughtException')` handlers | Critical | 4 |
| OBS-02 | Add SIGTERM/SIGINT graceful shutdown handler | Critical | 4 |
| OBS-03 | Replace `.catch(() => {})` with `.catch(err => Sentry.captureException(err))` | Critical | 4 |
| OBS-04 | Replace `console.*` with structured logger (pino) | High | 4 |
| OBS-05 | Report errors from `app.onError` to Sentry | High | 4 |
| OBS-06 | Add `/health` or `/api/health` endpoint | High | 4 |
| OBS-07 | Add request ID middleware (X-Request-ID) | High | 4 |
| OBS-08 | Move `import './instrument'` to be the very first import | High | 4 |
| OBS-09 | Set `tracesSampleRate` to 0.1 in dev, configurable via env var | Medium | 4 |
| OBS-10 | Add `profilesSampleRate` to Sentry config | Medium | 4 |
| OBS-11 | Log Redis errors instead of silently suppressing | Medium | 4 |
| PERF-01 | Increase connection pool from 10 to 25-50 | High | 5 |
| PERF-02 | Add missing indexes on `branch_id`, `tenant_id`, `created_at`, `user_id` | High | 5 |
| PERF-03 | Add trigram indexes for LIKE queries on tracking_no, customer name/email | Medium | 5 |
| PERF-04 | Add pagination to invoice list endpoint | Medium | 5 |
| API-01 | Return full `{ data, total, page, limit }` envelope from API client | Critical | 6 |
| API-02 | Unify Zod schemas — single source of truth in `@repo/validators` | High | 6 |
| API-03 | Add input validation to invoice creation endpoint | High | 6 |
| API-04 | Add API versioning prefix (`/api/v1/`) | Medium | 6 |
| API-05 | Remove `as never` assertions from invoice routes | Medium | 6 |
| UI-01 | Migrate detail page to React Query | Critical | 6 |
| UI-02 | Add ErrorBoundary to all dashboard pages | High | 6 |
| UI-03 | Add `global-error.tsx` and `error.tsx` to admin app | High | 6 |
| UI-04 | Add optimistic updates to `useCreateShipment` and `useUpdateShipment` | Medium | 6 |
| UI-05 | Parallelize tracking + invoice fetches on detail page | Medium | 6 |
| UI-06 | Show error state UI instead of `null` on detail page | Medium | 6 |
| UI-07 | Send server-side filters from frontend (status, search) | Low | 6 |

**Plans:** 1 plan (6 batches)

Plans:
- [ ] TBD (run /gsd-plan-phase 12 to break down)

## Phases (full table)
