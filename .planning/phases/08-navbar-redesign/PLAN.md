# Phase 8: Navbar Redesign (Customer Portal)

**Goal**: Redesign the customer-portal navbar into a minimal, scroll-aware glass bar
with a mobile hamburger menu. Scope is navbar-only — landing page and all other
pages untouched.

**Depends on**: Nothing (standalone, builds on existing Phase 4 landing work)

**Design decisions (confirmed with user)**:
- **Style**: Minimal glass — transparent over hero at scrollY=0, frosted
  `bg-surface/90 backdrop-blur-md` after scrolling past 20px. Text auto-switches
  between white (over hero) and tenant theme color (scrolled).
- **Mobile**: Hamburger icon toggles a dropdown/full menu on small screens.
- **Scope**: Navbar component only.

## Requirements
- NAV-01: Navbar is `fixed top-0` and overlays the landing hero (no background at top).
- NAV-02: Scroll listener toggles glass background at `scrollY > 20`.
- NAV-03: Nav links + brand + auth buttons auto-recolor for hero vs scrolled state.
- NAV-04: Mobile (< `sm`) collapses secondary links behind a hamburger menu.
- NAV-05: Logged-in vs logged-out nav states preserved (My Shipments/Quotations/
  Invoices/Notifications/Profile/Sign-out vs Sign in/Register).
- NAV-06: Unread notification badge preserved on mobile + desktop.
- NAV-07: Build passes; no regressions on `/`, `/dashboard`, auth pages.

## Files
- `apps/customer/components/portal-nav.tsx` — rewrite with scroll state + hamburger
- `apps/customer/components/gajan/layout.tsx` — `pt-14` on `<main>` (already done, keep)
- `apps/customer/components/lanka/layout.tsx` — `pt-14` on `<main>` (already done, keep)

## Verification
1. `npx next build` in `apps/customer` passes.
2. At `/` (logged out): navbar transparent over hero, white text; scroll → frosted bar.
3. At `/` (logged in): dashboard link set visible behind hamburger on mobile.
4. Resize to mobile: hamburger appears, menu toggles, badge visible.
5. Sign in/out state switches nav contents correctly.
