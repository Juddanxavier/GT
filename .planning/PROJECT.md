# Gajan Traders — Multi-Tenant Shipment Tracking

## What This Is

A multi-tenant shipment tracking platform for Gajan Traders, a logistics company with 2 organizations and multiple branches per org. Three surfaces share a single Hono API: an admin app for managing shipments, customers, quotations, invoices, and branches; white-label customer portals for India and Sri Lanka where customers see their shipments and quotes; and a super admin view that cross-cuts all tenants. Integrates with 17TRACK for carrier tracking, sends email (ZeptoMail/Resend) and WhatsApp (MSG91) notifications on status changes.

## Core Value

A shipment gets added → tracked via 17TRACK → status changes trigger email + WhatsApp to the right customer — without leaking data between tenants.

## Requirements

### Validated

- ✓ Turborepo + pnpm v9 monorepo setup — existing
- ✓ Hono API server on port 3001 — existing
- ✓ React 19 shared UI component library (`@repo/ui`) — existing
- ✓ ESLint + TypeScript shared config packages — existing
- ✓ Git repository initialized — existing

### Active

- **Auth & Multi-Tenancy**
- [ ] **AUTH-01**: Better Auth with Drizzle adapter — sessions, Google OAuth, refresh tokens
- [ ] **AUTH-02**: CASL roles — superadmin, tenant-admin, staff, customer
- [ ] **AUTH-03**: Tenant resolver middleware (X-Tenant-ID / subdomain) — single DB, tenantId scoping on all queries
- [ ] **AUTH-04**: Customer account creation in India / Sri Lanka portals only
- [ ] **AUTH-05**: Admin app restricted to staff roles (no customer login)
- **Admin App**
- [ ] **ADMIN-01**: Add and manage shipments
- [ ] **ADMIN-02**: Customer management (CRUD)
- [ ] **ADMIN-03**: Dashboard with key metrics
- [ ] **ADMIN-04**: Quotation management (create, respond to requests)
- [ ] **ADMIN-05**: Invoice generation
- [ ] **ADMIN-06**: Branch management (add/edit per org)
- **Customer Portals**
- [ ] **PORTAL-01**: White-label customer portal per tenant (India + Sri Lanka)
- [ ] **PORTAL-02**: Customers view their shipments with tracking status
- [ ] **PORTAL-03**: Customers view their quotations
- [ ] **PORTAL-04**: Per-tenant branding (logo, colors, domain, locale via packages/tenant-config)
- **Tracking & Notifications**
- [ ] **TRACK-01**: 17TRACK API integration + webhook listener for carrier tracking
- [ ] **TRACK-02**: Email notifications via Resend (React Email templates, tenant-branded)
- [ ] **TRACK-03**: WhatsApp notifications via MSG91 (tenant-scoped sender numbers)
- **Infrastructure**
- [ ] **INFRA-01**: BullMQ + Redis for background jobs (notifications, PDF gen, tracking sync)
- [ ] **INFRA-02**: Redis cache with tenant-prefixed keys
- [ ] **INFRA-03**: Socket.IO + Redis adapter for real-time tracking updates
- [ ] **INFRA-04**: React PDF for invoice/shipment PDF generation
- [ ] **INFRA-05**: Sentry + OpenTelemetry with tenantId-tagged spans
- [ ] **INFRA-06**: Arcjet rate limiting + bot protection
- **Deployment**
- [ ] **DEPLOY-01**: Docker + Coolify — 4 containers (admin, india, srilanka, api)
- [ ] **DEPLOY-02**: Each app standalone Next.js output (`output: standalone`)
- **Tooling**
- [ ] **TOOL-01**: Biome replacing ESLint + Prettier

### Out of Scope

- Mobile apps — web-only for now
- Payment processing — not in scope
- Additional countries beyond India/Sri Lanka — future, but architecture supports adding via tenant config

## Context

The company already runs GT Express which uses BullMQ and MSG91. These patterns carry forward. The existing monorepo scaffold is a Turborepo starter with a Hono API health endpoint, empty admin app directory, and shared UI/ESLint/TypeScript config packages. All features are greenfield from here.

## Constraints

- **Tech stack**: Hono API, Next.js frontends, Drizzle ORM + PostgreSQL, Better Auth, CASL, Redis, Socket.IO, Docker/Coolify
- **Multi-tenant isolation**: Single DB with tenantId column — no separate schemas or per-tenant DBs
- **Notification providers**: Resend (email), MSG91 (WhatsApp/SMS) — already proven in GT Express
- **Tooling**: Biome to replace ESLint + Prettier

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single DB with tenantId | Simpler ops, lower cost vs separate schemas/DBs | — Pending |
| Better Auth over Passport/JWT | Session rotation, CSRF, token blacklisting built-in. Drizzle adapter native | — Pending |
| CASL over Casbin | TypeScript-native, unit-testable permissions, use in API + React UI | — Pending |
| React PDF over Puppeteer | ~50ms render vs 2-3s, no Docker Chrome dependency | — Pending |
| Hono over NestJS | Lightweight, fast, fits TypeScript monorepo | — Pending |
| Docker + Coolify over Vercel/Railway | Self-hosted, 4 separate projects, own domains/env per app | — Pending |
| Resend over Nodemailer/SMTP | React Email templates, tenant-branded from: addresses | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-13 after initialization*
