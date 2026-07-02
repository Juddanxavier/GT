# Gajan Traders — Multi-Tenant Shipment Tracking

## What This Is

A multi-tenant shipment tracking platform for Gajan Traders, a logistics company managing operations across 2 organizations (Gajan Traders in India, Lanka Mahal in Sri Lanka) with 3 branches each. The platform serves 3 surfaces sharing a single Hono API:

1. **Admin App** (Next.js 16 + HeroUI) — Internal ops dashboard for managing shipments, customers, quotations, invoices, branches, users, and viewing reports/analytics
2. **Customer Portal** (Next.js 16 + HeroUI) — White-label portals per tenant where customers track shipments, view quotes/invoices, and manage their account
3. **API** (Hono + Drizzle + PostgreSQL) — Unified backend with multi-tenant isolation, Better Auth, Redis caching, Socket.IO real-time, BullMQ job queues

## Core Value

**A shipment gets added → tracked via 17TRACK → status changes trigger email + WhatsApp to the right customer — without leaking data between tenants.**

## Existing Capabilities (Validated)

### API (apps/api)
- Multi-tenant Hono API with tenant/branch middleware (tenantId column isolation)
- Better Auth: email/password, Google OAuth, 2FA, RBAC (superadmin, tenant-admin, staff, customer), rate limiting, session management
- Full CRUD routes: tenants, branches, customers, quotations (with line items), shipments, invoices, users, invitations
- 17TRACK integration for carrier tracking with webhook receiver
- Public tracking endpoint (no auth required)
- Claim-shipment flow for customer portal
- Dashboard/stats aggregation endpoints
- Reports and global search endpoints
- Notification CRUD with real-time push (Socket.IO)
- BullMQ job queues for async processing (workers for tracking, notifications)
- Email provider (ZeptoMail/Resend) with React Email templates
- Audit logging service
- Archive service for data retention
- Redis caching and rate limiting
- Sentry error monitoring
- Zod request validation

### Admin App (apps/admin)
- Dashboard with KPI cards, charts (Recharts), per-tenant/branch views, superadmin cross-tenant overview, trends, activity log
- Shipments: CRUD with pagination, search, filters, status chips, customer assignment, detailed tracking view with timeline
- Customers: Management with search
- Quotations: CRUD with pagination, status management, quote-to-shipment conversion
- Invoices: CRUD with email send, pagination
- Branches: CRUD with detail pages
- Users: Management with role/banned filters
- Invitations: Management for tenant onboarding
- Reports: Reports page
- Audit Log: Event timeline viewer
- Global search dialog (Cmd+K)
- Notifications dropdown with real-time unread count
- Profile page
- Auth: login, forgot password, reset password, onboarding
- Theme toggle (light/dark)
- Responsive sidebar layout with tenant/branch filtering

### Customer Portal (apps/customer)
- Tenant-aware routing via domain (gajantraders.com / lankamahal.lk)
- Per-tenant branding (Gajan Traders = violet theme, Lanka Mahal = emerald theme)
- Public tracking number lookup (no auth required)
- Claim shipment to account
- My Shipments list for logged-in users
- Detailed tracking view with timeline
- Auth: login, register, forgot/reset password
- Auth-aware navigation with portal layout components

### Packages
- `@repo/auth-config`: Better Auth configuration with email templates, RBAC, 2FA, custom session
- `@repo/permissions`: CASL-based permission abilities and guards
- `@repo/ui`: Shared HeroUI components (button, card, code)
- `@repo/typescript-config`: Shared TypeScript configs

## Requirements

### Validated (Existing)

- ✓ **AUTH-01**: User can log in with email/password across admin and customer portals
- ✓ **AUTH-02**: User can reset forgotten password via email link
- ✓ **AUTH-03**: Multi-tenant RBAC with roles: superadmin, tenant-admin, staff, customer
- ✓ **AUTH-04**: 2FA with authenticator app and backup codes
- ✓ **AUTH-05**: Session management with idle timeout and cross-subdomain cookie support
- ✓ **SHIP-01**: Admin can create, view, update, and delete shipments
- ✓ **SHIP-02**: Shipments are tracked via 17TRACK with status updates
- ✓ **SHIP-03**: Public can look up shipment status by tracking number
- ✓ **SHIP-04**: Customers can claim shipments to their account
- ✓ **SHIP-05**: Multi-carrier support with status mapping
- ✓ **CUST-01**: Admin can manage customers (CRUD)
- ✓ **QUOTE-01**: Admin can create and manage quotations with line items
- ✓ **QUOTE-02**: Quotations can be converted to shipments
- ✓ **INV-01**: Admin can generate and send invoices
- ✓ **BRN-01**: Admin can manage branches per tenant
- ✓ **TENANT-01**: Superadmin can manage tenants
- ✓ **USER-01**: Superadmin/tenant-admin can manage users
- ✓ **INVITE-01**: Tenant admins can invite users via email
- ✓ **DASH-01**: Admin dashboard shows KPIs, charts, and trends
- ✓ **DASH-02**: Superadmin sees cross-tenant overview
- ✓ **NOTIF-01**: Notifications for shipment status changes via email + WhatsApp
- ✓ **NOTIF-02**: In-app notification bell with unread count
- ✓ **REALTIME-01**: Real-time dashboard updates via Socket.IO
- ✓ **SEARCH-01**: Global search across shipments, customers, quotations
- ✓ **REPORT-01**: Reports with filtering
- ✓ **AUDIT-01**: Audit log for security events
- ✓ **CUST-PORTAL-01**: Customer can track shipments by number
- ✓ **CUST-PORTAL-02**: Customer can view their claimed shipments
- ✓ **CUST-PORTAL-03**: Tenant-specific branding and layout
- ✓ **ONBOARD-01**: New tenant onboarding flow with invitations

### Active (To Build)

- **UI-01**: Extract shared admin UI patterns into `@repo/ui` component library (DataTable, PageHeader, StatusBadge, FilterBar, ConfirmDialog, EmptyState, ErrorState, LoadingState)
- **UI-02**: Establish consistent design system tokens (spacing, typography, color semantics) across admin and customer apps
- **UI-03**: Refactor admin pages from monolithic components into composable page sections
- **UI-04**: Customer portal dashboard with shipment summary, recent updates, and key metrics
- **UI-05**: Customer profile management (edit name, email, password, notification preferences)
- **UI-06**: Customer quotation viewing and acceptance flow
- **UI-07**: Customer invoice viewing and payment status tracking
- **UI-08**: Responsive mobile layouts for both admin and customer apps
- **UI-09**: Consistent error, loading, and empty states across all pages
- **UI-10**: Customer notification preferences (email/WhatsApp opt-in per category)
- **UI-11**: Admin page performance optimization (code splitting, reduced bundle size)
- **UI-12**: Customer portal "My Quotes" and "My Invoices" pages

### Out of Scope

- Payment processing integration — customers pay offline
- Mobile native apps — web-only (responsive)
- Multi-language/i18n — English only for v1
- Public API for third-party integrators — internal use only
- Automated billing/subscriptions — manual invoicing model
- Warehouse/inventory management — tracking-only platform

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single DB with tenantId column | Simple isolation, shared migrations, single connection pool | Adopted |
| HeroUI v3 + Tailwind v4 | Consistent design system, saves building from scratch | Adopted |
| Better Auth for auth | Handles sessions, OAuth, 2FA, RBAC, rate limiting out of box | Adopted |
| TanStack Query for client state | Caching, persistence, optimistic updates, devtools | Adopted |
| Socket.IO for real-time | Bidirectional, room support for tenant isolation, Redis adapter | Adopted |
| BullMQ for queues | Redis-backed, delayed jobs, rate limiting, dashboard UI | Adopted |
| 17TRACK for carrier tracking | Supports 800+ carriers, webhook-based status updates | Adopted |
| Flat file structure in admin/components/ | Growing — will extract shared patterns to @repo/ui | Pending |

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
*Last updated: 2026-07-02 after initialization*
