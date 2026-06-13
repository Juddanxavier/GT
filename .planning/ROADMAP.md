# Roadmap: Gajan Traders — Multi-Tenant Shipment Tracking

## Overview

A multi-tenant shipment tracking platform for Gajan Traders serving two organizations with multiple branches. Three surfaces (admin app, India customer portal, Sri Lanka customer portal) share a single Hono API, with 17TRACK carrier tracking, email (Resend) and WhatsApp (MSG91) notifications, and tenant-isolated data. The roadmap builds in 10 phases: tooling foundation → auth/tenancy → infrastructure backbone → admin core CRUD → tracking engine → notifications engine → admin financial operations → customer portals → intelligence dashboard → production deployment. Two parallel workstreams accelerate delivery after Phase 2.

## Phases

- [ ] **Phase 1: Tooling & Foundation** — Biome, Next.js pin, Drizzle ORM, monorepo config
- [ ] **Phase 2: Auth & Multi-Tenancy** — Better Auth, CASL roles, tenant resolver, RLS, admin access control
- [ ] **Phase 3: Infrastructure Backbone** — BullMQ, Redis cache, Socket.IO, Sentry, Arcjet
- [ ] **Phase 4: Admin Core — Customers, Branches, Shipments** — CRUD operations for core business entities
- [ ] **Phase 5: Tracking Engine** — 17TRACK API, webhooks, status polling, tracking sync
- [ ] **Phase 6: Notifications Engine** — Email (Resend), WhatsApp (MSG91), idempotency, dead letter queue
- [ ] **Phase 7: Admin Operations — Quotes & Invoices** — Quotations, invoices, PDF generation
- [ ] **Phase 8: Customer Portals** — White-label India/Sri Lanka portals, customer auth, tenant branding
- [ ] **Phase 9: Admin Dashboard & Intelligence** — KPIs, real-time metrics, exception detection
- [ ] **Phase 10: Deployment** — Docker, Coolify, standalone output, domain routing

## Phase Details

### Phase 1: Tooling & Foundation
**Goal**: Development environment configured with consistent tooling, package versions, and database ORM
**Depends on**: Nothing (first phase)
**Requirements**: TOOL-01, TOOL-02, TOOL-03
**Success Criteria** (what must be TRUE):
  1. `biome check` passes across entire monorepo with zero errors
  2. All workspace packages resolve correctly with `pnpm install` and `pnpm build`
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
  4. All Drizzle queries against tenant-scoped tables automatically include `tenantId` filter (type-safe via `withTenant`)
  5. PostgreSQL Row-Level Security policies prevent cross-tenant data access even if a query misses the tenantId filter
**Plans**: TBD
**UI hint**: yes

### Phase 3: Infrastructure Backbone
**Goal**: Background job processing, caching, real-time messaging, error monitoring, and security middleware are operational and tenant-aware
**Depends on**: Phase 1
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. BullMQ workers connect to Redis and process jobs from queues with proper tenant context propagation
  2. Redis cache stores and retrieves values with tenant-prefixed keys (`t:{tenantId}:`)
  3. Socket.IO server accepts connections and broadcasts messages to tenant-scoped rooms (no cross-tenant bleed)
  4. Sentry captures errors with `tenantId` tagged on every span and transaction
  5. Arcjet rate limiting blocks excessive requests and bot traffic before they reach application routes
**Plans**: TBD

### Phase 4: Admin Core — Customers, Branches, Shipments
**Goal**: Staff can create and manage the core business entities — customers, branches, and shipments — through the admin app
**Depends on**: Phase 2
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-06
**Success Criteria** (what must be TRUE):
  1. Staff can create, edit, view, and deactivate customers scoped to their org/branch
  2. Staff can add and edit branches within their organization
  3. Staff can create shipments with tracking numbers, edit shipment details, and deactivate shipments
  4. All CRUD operations are tenant-isolated — staff only see data from their own org and assigned branches
  5. Form dropdowns (customer, branch, status) are scoped to the user's org and permissions
**Plans**: TBD
**UI hint**: yes

### Phase 5: Tracking Engine
**Goal**: Shipments are automatically tracked via 17TRACK with status changes flowing into the system through webhooks with polling fallback
**Depends on**: Phase 3, Phase 4
**Requirements**: TRACK-01, TRACK-02, TRACK-05
**Success Criteria** (what must be TRUE):
  1. New shipments are automatically registered with 17TRACK API upon creation (respecting 3 req/s rate limit)
  2. 17TRACK webhooks are received, HMAC signatures verified, and immediately acknowledged (200 OK) before async processing
  3. Tracking status updates are reflected on the shipment record within seconds of webhook receipt
  4. A scheduled polling job catches tracking events missed by webhooks and reconciles statuses
  5. All 17TRACK API calls go through a rate-limited BullMQ queue (max 3 req/s) with retry logic
**Plans**: TBD

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
**Plans**: TBD

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

### Phase 8: Customer Portals
**Goal**: Customers can log into their tenant's white-label portal to view shipments, tracking status, quotes, and invoices with their organization's branding
**Depends on**: Phase 2, Phase 5, Phase 6, Phase 7
**Requirements**: PORTAL-01, PORTAL-02, PORTAL-03, PORTAL-04, AUTH-04
**Success Criteria** (what must be TRUE):
  1. Customer can create an account on both India and Sri Lanka portals (but not on admin app)
  2. Customer can log in and see only their own shipments with live tracking status from 17TRACK
  3. Customer can view their quotations and download their invoices
  4. Each portal displays correct tenant branding (logo, colors, domain, locale) loaded from `packages/tenant-config`
  5. Real-time tracking updates appear on the portal via Socket.IO without page refresh
**Plans**: TBD
**UI hint**: yes

### Phase 9: Admin Dashboard & Intelligence
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

## Parallelization Strategy

After Phase 2 completes, two workstreams run simultaneously:

| Stream | Phases | Dependency Chain |
|--------|--------|-----------------|
| **Stream A: Core Domain** | P3 → P5 → P6 → P8 | Infrastructure → Tracking → Notifications → Portals |
| **Stream B: Admin Tools** | P4 → P7 → P9 | Admin CRUD → Quotes/Invoices → Dashboard |

- P3 (Infrastructure) and P4 (Admin Core) can be planned in parallel since they share no blocking dependency beyond P2
- P5 (Tracking) and P7 (Quotes/Invoices) can execute in parallel since P7 only needs P3+P4, not P5
- P9 (Dashboard) and P8 (Portals) can be partially parallel — both depend on data flowing from prior phases

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Tooling & Foundation | 0/TBD | Not started | - |
| 2. Auth & Multi-Tenancy | 0/TBD | Not started | - |
| 3. Infrastructure Backbone | 0/TBD | Not started | - |
| 4. Admin Core — Customers, Branches, Shipments | 0/TBD | Not started | - |
| 5. Tracking Engine | 0/TBD | Not started | - |
| 6. Notifications Engine | 0/TBD | Not started | - |
| 7. Admin Operations — Quotes & Invoices | 0/TBD | Not started | - |
| 8. Customer Portals | 0/TBD | Not started | - |
| 9. Admin Dashboard & Intelligence | 0/TBD | Not started | - |
| 10. Deployment | 0/TBD | Not started | - |
