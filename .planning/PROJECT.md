# Gajan Traders — Multi-Tenant Shipment Tracking

## What This Is

A multi-tenant shipment tracking platform for Gajan Traders, a logistics company with 2 organizations and multiple branches per org. Three surfaces share a single Hono API: an admin app for managing shipments, customers, quotations, invoices, and branches; white-label customer portals for India and Sri Lanka where customers see their shipments and quotes; and a super admin view that cross-cuts all tenants. Integrates with 17TRACK for carrier tracking, sends email (Resend) and WhatsApp (MSG91) notifications on status changes.

## Core Value

A shipment gets added → tracked via 17TRACK → status changes trigger email + WhatsApp to the right customer — without leaking data between tenants.

## Requirements

### Validated

- ✓ Turborepo + pnpm v9 monorepo setup (Phase 1)
- ✓ Hono API server on port 3001 (Phase 1)
- ✓ React 19 shared UI component library (@repo/ui) (Phase 1)
- ✓ ESLint + TypeScript shared config packages (Phase 1)
- ✓ Git repository initialized (Phase 1)
- ✓ Biome replaces ESLint + Prettier — TOOL-01 (Phase 1)
- ✓ Better Auth with Drizzle adapter — AUTH-01 (Phase 2)
- ✓ CASL roles — superadmin, tenant-admin, staff, customer — AUTH-02 (Phase 2)
- ✓ Tenant resolver middleware (X-Tenant-ID / subdomain) — AUTH-03 (Phase 2)
- ✓ Admin app restricted to staff roles (no customer login) — AUTH-05 (Phase 2)
- ✓ RLS via PostgreSQL session variables + defense-in-depth — AUTH-06 (Phase 2)
- ✓ BullMQ + Redis for background jobs — INFRA-01 (Phase 3)
- ✓ Redis cache with tenant-prefixed keys — INFRA-02 (Phase 3)
- ✓ Socket.IO + Redis adapter for real-time tracking updates — INFRA-03 (Phase 3)
- ✓ Sentry + OpenTelemetry with tenantId-tagged spans — INFRA-05 (Phase 3)
- ✓ Better Auth rate limiting (replaces Arcjet) — INFRA-06 (Phase 3)
- ✓ Branch management (add/edit per org) — ADMIN-06 (Phase 4)
- ✓ Customer management (CRUD) — ADMIN-02 (Phase 4)
- ✓ Add and manage shipments — ADMIN-01 (Phase 4)
- ✓ Quotation management (create, respond to requests, status transitions, convert to shipment) — ADMIN-04 (Phase 4)

### Active

- **Tracking & Notifications**
- [ ] **TRACK-01**: 17TRACK API integration + webhook listener for carrier tracking
- [ ] **TRACK-02**: Polling fallback for missed webhook events
- [ ] **TRACK-03**: Email notifications via Resend (React Email templates, tenant-branded)
- [ ] **TRACK-04**: WhatsApp notifications via MSG91 (tenant-scoped sender numbers)
- [ ] **TRACK-05**: Rate-limited 17TRACK API calls (3 req/s) via BullMQ
- **Admin App**
- [ ] **ADMIN-05**: Invoice generation
- [ ] **ADMIN-03**: Dashboard with key metrics
- **Customer Portals**
- [ ] **PORTAL-01**: White-label customer portal per tenant (India + Sri Lanka)
- [ ] **PORTAL-02**: Customers view their shipments with tracking status
- [ ] **PORTAL-03**: Customers view their quotations
- [ ] **PORTAL-04**: Per-tenant branding (logo, colors, domain, locale via packages/tenant-config)
- **Infrastructure**
- [ ] **INFRA-04**: React PDF for invoice/shipment PDF generation
- **Deployment**
- [ ] **DEPLOY-01**: Docker + Coolify — 4 containers (admin, india, srilanka, api)
- [ ] **DEPLOY-02**: Each app standalone Next.js output (output: standalone)

### Out of Scope

- Mobile apps — web-only for now
- Payment processing — not in scope
- Additional countries beyond India/Sri Lanka — future, but architecture supports adding via tenant config

## Context

Phase 1-4 complete. The monorepo has a fully functional Hono API with auth (Better Auth), multi-tenant infrastructure (CASL, tenant resolver, RLS), infrastructure backbone (BullMQ, Redis, Socket.IO, Sentry), and a complete admin app with HeroUI components for managing branches, customers, shipments, and quotations. Login credentials: admin@gajanindia.com / Admin123! (superadmin). Next up: Phase 5 — 17TRACK carrier tracking integration.

## Constraints

- **Tech stack**: Hono API, Next.js frontends, Drizzle ORM + PostgreSQL, Better Auth, CASL, Redis, Socket.IO, Docker/Coolify
- **Multi-tenant isolation**: Single DB with tenantId column — no separate schemas or per-tenant DBs
- **Notification providers**: Resend (email), MSG91 (WhatsApp/SMS) — already proven in GT Express
- **Tooling**: Biome replacing ESLint + Prettier — done (Phase 1)
- **UI Framework**: HeroUI v3 (@heroui/react) — no custom components, all HeroUI inline

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single DB with tenantId | Simpler ops, lower cost vs separate schemas/DBs | ✓ Good (Phase 2) |
| Better Auth over Passport/JWT | Session rotation, CSRF, token blacklisting built-in. Drizzle adapter native | ✓ Good (Phase 2) |
| CASL over Casbin | TypeScript-native, unit-testable permissions, use in API + React UI | ✓ Good (Phase 2) |
| React PDF over Puppeteer | ~50ms render vs 2-3s, no Docker Chrome dependency | — Pending (Phase 7) |
| Hono over NestJS | Lightweight, fast, fits TypeScript monorepo | ✓ Good (Phase 1) |
| Docker + Coolify over Vercel/Railway | Self-hosted, 4 separate projects, own domains/env per app | — Pending (Phase 10) |
| Resend over Nodemailer/SMTP | React Email templates, tenant-branded from: addresses | — Pending (Phase 6) |
| NeonDB for development Postgres | Serverless Postgres, simpler than local Docker | ✓ Good (Phase 1) |
| HeroUI v3 over shadcn | Consistent design system, no Provider wrapper in v3, 120+ components | ✓ Good (Phase 4) |
| Modal.Backdrop controlled pattern | Backdrop wraps Container > Dialog (not Modal isOpen={}) for correct slot resolution | ✓ Good (Phase 4) |
| Form inside Modal.Body | form element goes inside Modal.Body with id, footer submit uses form=id — avoids wrapping Body/Footer | ✓ Good (Phase 4) |
| No custom React components | Every UI element is HeroUI or raw HTML/SVG inline — zero custom components to maintain | ✓ Good (Phase 4) |
| Bad Auth rate limiting replaces Arcjet | Better Auth's built-in rate limiter handles auth endpoint protection | ✓ Good (Phase 3) |
| Upstash free tier for Redis | Serverless Redis, zero infra, 256MB/500K commands free | ✓ Good (Phase 3) |
| Graceful degradation without Redis | All Redis features degrade gracefully when UPSTASH_REDIS_URL unset | ✓ Good (Phase 3) |
| Bull Board over Workbench | @bull-board/hono resolves correctly with pnpm; Workbench had subpath export issues | ✓ Good (Phase 3) |
| KPI card minimal design | No borders/icon circles/top strip — just rounded-2xl bg-surface shadow-sm, large number, trend badge, sparkline | ✓ Good (Phase 4) |
| Create/Edit as Modals not pages | New/Edit open HeroUI Modal on same page; no /entity/new routes | ✓ Good (Phase 4) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via /gsd-transition):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via /gsd-complete-milestone):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-14 after Phase 4 completion*
