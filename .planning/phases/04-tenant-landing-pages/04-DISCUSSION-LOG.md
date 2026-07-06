# Phase 4: Tenant Landing Pages - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-06
**Phase:** 04-tenant-landing-pages
**Areas discussed:** Navbar approach, Hero section, Footer approach, Home page location, Component theming API, Tracking search placement, Page structure, Logged-in vs logged-out

---

## Navbar Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Extract PortalNav → @repo/ui | Refactor existing PortalNav into @repo/ui with tenant theming props — keeps current behavior, adds reusability | ✓ |
| Rebuild from scratch in @repo/ui | New Navbar component designed specifically for the landing page — lighter, marketing-focused | |
| Both: PortalNav stays, new Navbar in @repo/ui | PortalNav keeps serving logged-in customer portal, new Navbar for landing/public pages | |

**User's choice:** Extract PortalNav → @repo/ui
**Notes:** PortalNav already tenant-aware and handles auth state — extraction is the pragmatic path

---

## Hero Section

| Option | Description | Selected |
|--------|-------------|----------|
| Brand hero + tracking search | Big brand headline + subtitle + CTA buttons per tenant, then tracking search below | |
| Full marketing hero | Headline, subtitle, CTA buttons, background image/illustration per tenant, with tracking search as a secondary section below | ✓ |
| Keep current hero, just extract to @repo/ui | Extract existing inline hero from page.tsx into @repo/ui as-is | |

**User's choice:** Full marketing hero
**Notes:** Per-tenant content with different brand colors, tracking-focused messaging

---

## Hero Content Per Tenant

| Option | Description | Selected |
|--------|-------------|----------|
| I'll provide content during planning | Decide headlines, CTAs, and images later | |
| Gajan: logistics-focused, Lanka: hospitality-focused | Different messaging per tenant | |
| Both: tracking-focused | Same core message, different branding colors | ✓ |

**User's choice:** Both: tracking-focused
**Notes:** Same tracking-focused messaging, differentiated by brand colors (emerald/violet)

---

## Footer Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: copyright + brand | Just copyright line per tenant | |
| Standard: copyright + links + contact | Copyright, nav links, contact info | |
| Full: above + newsletter/social | Standard footer plus social media icons, optional newsletter signup | ✓ |

**User's choice:** Full: above + newsletter/social
**Notes:** Copyright, nav links, contact, social icons, optional newsletter

---

## Home Page Location

| Option | Description | Selected |
|--------|-------------|----------|
| Existing customer portal app | Replace/redesign current home page at apps/customer/(portal)/page.tsx | ✓ |
| New standalone app | Separate Next.js app for marketing | |

**User's choice:** Existing customer portal app
**Notes:** Domain routing via proxy.ts already handles tenant detection

---

## Component Theming API

| Option | Description | Selected |
|--------|-------------|----------|
| tenant prop | Components accept a tenant config object | ✓ |
| TenantContext provider | Wrap app in context, components consume from context | |
| CSS custom properties | Set CSS vars per tenant, components use var() | |

**User's choice:** tenant prop
**Notes:** Simplest, pure, framework-agnostic approach for @repo/ui components

---

## Tracking Search Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Below the hero | Hero first (branding/CTAs), then tracking search below | ✓ |
| Inside the hero | Tracking search stays inside hero area | |
| Separate full-width section | Hero at top, then distinct "Track your shipment" section | |

**User's choice:** Below the hero
**Notes:** Distinct section with its own background and title

---

## Page Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Hero → Tracking → Features → Footer | Marketing hero, tracking, features grid, footer | ✓ |
| Hero → Tracking → Stats → Features → Footer | Same plus stats/counters section | |
| Hero → Tracking → Testimonials → Footer | Simpler with testimonials | |
| You decide | Agent discretion on additional sections | ✓ |

**User's choice:** Hero → Tracking → Features → Footer (with agent discretion on details)
**Notes:** Agent has flexibility on Features section design

---

## Logged-in vs Logged-out

| Option | Description | Selected |
|--------|-------------|----------|
| Landing page for logged-out, redirect to /my-shipments when logged in | Logged-in users skip the landing page entirely | ✓ |
| Landing page for everyone | Same page for both states | |
| Landing page with embedded dashboard section | Logged-in users get dashboard panel integrated | |
| You decide | Agent discretion | |

**User's choice:** Landing page for logged-out, redirect to /my-shipments when logged in
**Notes:** The landing page is purely for anonymous visitors

---

## Deferred Ideas

None — discussion stayed within phase scope
