# Requirements — Gajan Traders Shipment Tracking

## v1 Requirements

### Auth & Multi-Tenancy
- [ ] **AUTH-01**: Better Auth with Drizzle adapter — sessions, Google OAuth, refresh tokens, CSRF protection
- [ ] **AUTH-02**: CASL roles — superadmin, tenant-admin, staff, customer
- [ ] **AUTH-03**: Tenant resolver middleware (X-Tenant-ID / subdomain) — single DB, tenantId scoping on all queries
- [ ] **AUTH-04**: Customer account creation (portal apps only, not admin)
- [ ] **AUTH-05**: Admin app restricted to staff roles (superadmin, tenant-admin, staff)
- [ ] **AUTH-06**: PostgreSQL Row-Level Security as defense-in-depth for tenant isolation

### Admin App
- [ ] **ADMIN-01**: Add, edit, view, deactivate shipments with tracking numbers
- [ ] **ADMIN-02**: Customer management (CRUD per org/branch)
- [ ] **ADMIN-03**: Dashboard — active shipments, in-transit, delivered today, exceptions
- [ ] **ADMIN-04**: Quotation management (create, respond, track status)
- [ ] **ADMIN-05**: Invoice generation (create, view, download PDF)
- [ ] **ADMIN-06**: Branch management (add/edit per org)

### Customer Portals
- [ ] **PORTAL-01**: White-label customer portal per tenant (India + Sri Lanka apps)
- [ ] **PORTAL-02**: Customers view their shipments with real-time tracking status
- [ ] **PORTAL-03**: Customers view their quotations and invoices
- [ ] **PORTAL-04**: Per-tenant branding via packages/tenant-config (logo, colors, domain, locale)

### Tracking & Notifications
- [ ] **TRACK-01**: 17TRACK API integration — multi-carrier tracking + webhook listener
- [ ] **TRACK-02**: Webhook-to-queue pipeline — 17TRACK → BullMQ → update DB + emit Socket.IO + enqueue notifications
- [ ] **TRACK-03**: Email notifications via Resend (React Email templates, tenant-branded from: address)
- [ ] **TRACK-04**: WhatsApp notifications via MSG91 (tenant-scoped sender numbers, template approval)
- [ ] **TRACK-05**: Status polling fallback if 17TRACK webhooks miss events

### Infrastructure
- [ ] **INFRA-01**: BullMQ + Redis for background jobs (notifications, PDF gen, tracking sync)
- [ ] **INFRA-02**: Redis cache with tenant-prefixed keys (t:{tenantId}:)
- [ ] **INFRA-03**: Socket.IO + Redis adapter for real-time tracking updates (rooms namespaced by tenantId)
- [ ] **INFRA-04**: React PDF for invoice/shipment PDF generation (isolated in worker process)
- [ ] **INFRA-05**: Sentry + OpenTelemetry with tenantId-tagged spans
- [ ] **INFRA-06**: Arcjet rate limiting + bot protection + signup shield
- [ ] **INFRA-07**: Notification idempotency keys to prevent duplicate sends
- [ ] **INFRA-08**: Dead letter queue for failed jobs

### Deployment
- [ ] **DEPLOY-01**: Docker — 4 containers (admin, india, srilanka, api)
- [ ] **DEPLOY-02**: Coolify — each app = separate project, own domain, own env
- [ ] **DEPLOY-03**: Standalone Next.js output (output: standalone)

### Tooling
- [x] **TOOL-01**: Biome replacing ESLint + Prettier (one biome.json at workspace root)
- [x] **TOOL-02**: Next.js pinned to ^16.2.6 (security patches)
- [x] **TOOL-03**: Drizzle ORM v0.45.x (stable, plan v1 migration later)

## v2 (Deferred)
- Additional countries (architecture supports via tenant-config)
- Email notification preferences per customer (opt-in/out per event type)

## Out of Scope
- Mobile apps — web-only for this phase
- Payment processing — no payment integration
- Fleet tracking / route optimization / returns management
- EDI connections
- Warehouse management (WMS)

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 8 | Pending |
| AUTH-05 | Phase 2 | Pending |
| AUTH-06 | Phase 2 | Pending |
| ADMIN-01 | Phase 4 | Pending |
| ADMIN-02 | Phase 4 | Pending |
| ADMIN-03 | Phase 9 | Pending |
| ADMIN-04 | Phase 7 | Pending |
| ADMIN-05 | Phase 7 | Pending |
| ADMIN-06 | Phase 4 | Pending |
| PORTAL-01 | Phase 8 | Pending |
| PORTAL-02 | Phase 8 | Pending |
| PORTAL-03 | Phase 8 | Pending |
| PORTAL-04 | Phase 8 | Pending |
| TRACK-01 | Phase 5 | Pending |
| TRACK-02 | Phase 5 | Pending |
| TRACK-03 | Phase 6 | Pending |
| TRACK-04 | Phase 6 | Pending |
| TRACK-05 | Phase 5 | Pending |
| INFRA-01 | Phase 3 | Pending |
| INFRA-02 | Phase 3 | Pending |
| INFRA-03 | Phase 3 | Pending |
| INFRA-04 | Phase 7 | Pending |
| INFRA-05 | Phase 3 | Pending |
| INFRA-06 | Phase 3 | Pending |
| INFRA-07 | Phase 6 | Pending |
| INFRA-08 | Phase 6 | Pending |
| DEPLOY-01 | Phase 10 | Pending |
| DEPLOY-02 | Phase 10 | Pending |
| DEPLOY-03 | Phase 10 | Pending |
| TOOL-01 | Phase 1 | Complete |
| TOOL-02 | Phase 1 | Complete |
| TOOL-03 | Phase 1 | Complete |

All 35 v1 requirements mapped ✓
