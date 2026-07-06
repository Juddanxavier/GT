# Phase 4: Tenant Landing Pages - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Domain-aware home/landing pages for Gajan Traders and Lanka Mahal with shared Navbar, HeroSection, and Footer components in `@repo/ui`. Landing page serves anonymous visitors — logged-in customers redirect to `/my-shipments`.

</domain>

<decisions>
## Implementation Decisions

### Navbar
- **D-01:** Extract existing `PortalNav` from `apps/customer/components/portal-nav.tsx` into `@repo/ui`
- **D-02:** Shared Navbar receives tenant config via `tenant` prop (logo, brand name, theme color, nav links)
- **D-03:** Keep existing auth-aware link logic (logged-in vs logged-out links) — Navbar renders in both states

### Hero Section
- **D-04:** Full marketing hero per tenant — headline, subtitle, CTA buttons, background image/illustration
- **D-05:** Both tenants are tracking-focused in messaging, differentiated by brand colors (Gajan = emerald, Lanka Mahal = violet)
- **D-06:** HeroSection component in `@repo/ui` accepts tenant config prop

### Tracking Search
- **D-07:** Tracking number search is a separate section BELOW the hero, not inside it
- **D-08:** Distinct section with its own background, title "Track Your Shipment", and search form

### Page Structure
- **D-09:** Landing page sections in order: Hero → Tracking Search → Features → Footer
- **D-10:** Agent discretion on Features section details (what feature cards, layout, icons)

### Footer
- **D-11:** Full footer component in `@repo/ui` with: copyright, nav links, contact info (address, phone), social media icons, optional newsletter signup
- **D-12:** Per-tenant content passed via tenant config prop

### Home Page Location
- **D-13:** Landing page lives in the existing customer portal app (`apps/customer/(portal)/page.tsx`)
- **D-14:** Domain routing via existing `proxy.ts` handles tenant detection (gajantraders.com vs lankamahal.lk)

### Auth State
- **D-15:** Landing page is for logged-out/anonymous visitors
- **D-16:** Logged-in customers redirect to `/my-shipments` on page load

### Component Theming API
- **D-17:** Shared components (`Navbar`, `HeroSection`, `Footer`) accept a typed `tenant` prop with `{ name: string; shortName: string; theme: 'emerald' | 'violet'; logo?: string; links: NavLink[]; contact?: ContactInfo }`
- **D-18:** Customer portal provides tenant config from existing `useTenantConfig()` hook when rendering shared components

### the agent's Discretion
- Features section design (icons, layout, copy)
- Exact background imagery approach for hero (gradient, pattern, or image per tenant)
- Newsletter signup implementation in footer
- Mobile breakpoint specifics
- Loading/error states for shared components

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Components to Extract
- `apps/customer/components/portal-nav.tsx` — Existing tenant-aware Navbar to extract to `@repo/ui`
- `apps/customer/components/gajan/layout.tsx` — GajanLayout with inline footer (source for footer extraction)
- `apps/customer/components/lanka/layout.tsx` — LankaLayout with inline footer (source for footer extraction)
- `apps/customer/app/(portal)/page.tsx` — Current home page with inline hero, tracking search, dashboard

### Tenant Configuration
- `apps/customer/lib/tenant-config.ts` — TenantSlug type + config map (name, shortName, theme)
- `apps/customer/lib/use-tenant-config.ts` — Client-side hook that reads tenant from DOM

### Domain Routing
- `apps/customer/proxy.ts` — Hostname to tenant slug mapping
- `apps/customer/lib/tenant.ts` — Server-side `getTenantSlug()` via headers

### Shared Package
- `packages/ui/package.json` — Exports map for `@repo/ui` components
- `packages/ui/src/` — Existing scaffold components (button, card, code)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PortalNav` (`apps/customer/components/portal-nav.tsx`): Tenant-aware nav component — extract to `@repo/ui`, refactor to accept `tenant` prop
- `tenant-config.ts`: Config type + map — already has the data shape, can be used as prop type reference
- `use-tenant-config.ts`: Client hook reading tenant from DOM — consumer passes to shared components
- `proxy.ts`: Domain routing already handles tenant detection — no changes needed

### Established Patterns
- Tenant theming via conditional Tailwind class-switching (`isEmerald ? 'emerald-600' : 'violet-600'`)
- HeroUI design system + lucide-react icons throughout
- Auth state via `authClient.useSession()` from Better Auth
- React Query for data fetching

### Integration Points
- `apps/customer/app/(portal)/page.tsx` — Landing page entry point (replace current home page)
- `apps/customer/app/(portal)/layout.tsx` — Wraps PortalNav — may need updates for new Navbar from `@repo/ui`
- `apps/customer/app/layout.tsx` — Root layout selects GajanLayout/LankaLayout — footer will come from shared component instead

</code_context>

<specifics>
## Specific Ideas

- Both Gajan Traders and Lanka Mahal are tracking/logistics focused in messaging
- Gajan = emerald theme, Lanka Mahal = violet theme (existing pattern)
- "Track Your Shipment" is the core CTA for both tenants

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-tenant-landing-pages*
*Context gathered: 2026-07-06*
