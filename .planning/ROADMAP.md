# Roadmap: Gajan Traders Shipment Tracking

## Overview

The project has a fully functional backend API, a comprehensive admin panel, and a basic customer portal. The next milestone focuses on UI restructuring and customer portal enhancements: extract shared component patterns into `@repo/ui`, refactor admin pages for consistency and maintainability, then build out the customer portal with dashboard, profile, quotes, invoices, and notification preferences.

## Phases

- [ ] **Phase 1: UI Foundation** — Extract shared UI component library from admin patterns into `@repo/ui` with design tokens
- [ ] **Phase 2: Admin UI Restructuring** — Refactor all admin pages to use shared components, improve mobile layout, add consistent states
- [ ] **Phase 3: Customer Portal Enhancement** — Build customer dashboard, profile, quotes, invoices, notification prefs, improved tracking UX
- [ ] **Phase 4: Tenant Landing Pages** — Domain-aware home/landing pages for Gajan Traders and Lanka Mahal with shared Navbar, HeroSection, and Footer components in `@repo/ui`

## Phase Details

### Phase 1: UI Foundation
**Goal**: A reusable component library in `@repo/ui` with consistent design tokens that all apps consume
**Depends on**: Nothing (first phase)
**Requirements**: UI-FOUND-01, UI-FOUND-02, UI-FOUND-03, UI-FOUND-04, UI-FOUND-05, UI-FOUND-06, UI-FOUND-07, UI-FOUND-08, UI-FOUND-09
**Success Criteria** (what must be TRUE):
  1. Admin and customer apps import shared components from `@repo/ui` instead of inline definitions
  2. Design tokens (color semantics, spacing scale, typography) are defined in a single place and consumed by both apps
  3. A DataTable component supports sorting, pagination, column visibility, and action slots — used by at least one admin page
  4. Shared EmptyState, ErrorState, and LoadingState components exist and render correctly in dark/light mode
  5. PageHeader, StatusBadge, FilterBar, ConfirmDialog, and KpiCard components exist with documented props
**Plans**: TBD
**UI hint**: yes

### Phase 2: Admin UI Restructuring
**Goal**: All admin pages are consistent, maintainable, mobile-responsive, and use shared components
**Depends on**: Phase 1
**Requirements**: ADMIN-UI-01, ADMIN-UI-02, ADMIN-UI-03, ADMIN-UI-04, ADMIN-UI-05, ADMIN-UI-06, ADMIN-UI-07, ADMIN-UI-08, ADMIN-UI-09, ADMIN-UI-10, ADMIN-UI-11, ADMIN-UI-12, ADMIN-UI-13
**Success Criteria** (what must be TRUE):
  1. Every admin list page (shipments, customers, quotations, invoices, branches, users, invitations, reports, audit log) uses shared DataTable, FilterBar, StatusBadge, and PageHeader from `@repo/ui`
  2. Admin navigation and data tables are usable on mobile viewports (sidebar collapses, tables scroll horizontally)
  3. Every admin page displays a loading skeleton on fetch and a meaningful error state on failure
  4. Empty states show a helpful illustration/message and a CTA rather than a blank page
  5. Dashboard sections are extracted into named components and the dashboard page loads without duplication
**Plans**: TBD
**UI hint**: yes

### Phase 3: Customer Portal Enhancement
**Goal**: Customers have a full-featured portal with dashboard, profile management, quotes, invoices, notifications, and polished UX
**Depends on**: Phase 2
**Sub-phases**:
  - **3a: Dashboard & Home** — Dashboard API + UI (KPI cards, recent shipments, alerts); home landing page redesign (CUST-PORTAL-04, CUST-PORTAL-01)
  - **3b: Profile** — Profile edit page (name, email, password change) — new API endpoints (CUST-PORTAL-05)
  - **3c: Quotations** — Quotations list + detail with line items — new API endpoints (CUST-PORTAL-06)
  - **3d: Invoices** — Invoices list + detail + PDF download — new API endpoints (CUST-PORTAL-07)
  - **3e: Notifications** — Bell icon with unread count, notification list, mark read — API exists (CUST-PORTAL-08)
  - **3f: My Shipments & Tracking** — Search, status filtering, enhanced tracking timeline — API exists (CUST-PORTAL-09, CUST-PORTAL-12)
  - **3g: Mobile & States** — Responsive nav, loading/error/empty states across all pages (CUST-PORTAL-10, CUST-PORTAL-11)
  - **3h: Auth & Theme** — Polish auth pages, consistent brand theming, custom fonts (CUST-PORTAL-02, CUST-PORTAL-03)

### Phase 4: Tenant Landing Pages
**Goal**: Domain-aware home/landing pages for Gajan Traders and Lanka Mahal with shared Navbar, HeroSection, and Footer components in `@repo/ui`
**Depends on**: Nothing (standalone — shared components built directly into new or existing apps)
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
   1. Gajan Traders (gajantraders.com) and Lanka Mahal (lankamahal.lk) each display their own branded home page
   2. Navbar shows tenant logo, nav links, and is responsive on mobile
   3. HeroSection displays tenant-specific imagery, headline, and CTA
   4. Footer shows tenant contact info, links, and social
   5. All three components are reusable from `@repo/ui` with tenant theming props
**Plans**: 2 plans, 2 waves
**UI hint**: yes

Plans:
- [ ] 04-01-PLAN.md — Tenant types, Navbar extraction, portal layout restructure
- [ ] 04-02-PLAN.md — HeroSection & Footer components, landing page compose, cleanup

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. UI Foundation | 0/0 | Not started | - |
| 2. Admin UI Restructuring | 0/0 | Not started | - |
| 3a. Dashboard & Home | 1/1 | **Planned** | - |
| 3b. Profile | 0/0 | Not started | - |
| 3c. Quotations | 0/0 | Not started | - |
| 3d. Invoices | 0/0 | Not started | - |
| 3e. Notifications | 0/0 | Not started | - |
| 3f. My Shipments & Tracking | 0/0 | Not started | - |
| 3g. Mobile & States | 0/0 | Not started | - |
| 3h. Auth & Theme | 0/0 | Not started | - |
| 4. Tenant Landing Pages | 0/2 | **Planned** | - |
| 5. Shipment Module Improvements | 0/4 | **Planned** | - |

### Phase 5: lets improve and debug existing shipment module

**Goal:** Harden and polish the existing shipment module across all three surfaces (API, Admin, Customer Portal). Fix inconsistencies, close gaps, resolve bugs, and improve UX.
**Requirements**: TBD
**Depends on:** Phase 4
**Plans:** 4 plans

Plans:
- [ ] 05-01-PLAN.md — Types, status config & database schema foundation
- [ ] 05-02-PLAN.md — API backend — routes, services, email branding & permissions
- [ ] 05-03-PLAN.md — Notification & webhook reliability (BullMQ queue, LRU fallback)
- [ ] 05-04-PLAN.md — UI — shipment detail redesign, tracking timeline, notification pages
