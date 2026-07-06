# Phase 4: Tenant Landing Pages - Research

**Researched:** 2026-07-06
**Domain:** Component extraction & landing page architecture with tenant theming
**Confidence:** HIGH

## Summary

This phase extracts the existing `PortalNav` into `@repo/ui`, builds two new shared components (`HeroSection`, `Footer`), and restructures the customer portal home page into a tenant-branded landing page. The current portal nav is already built with plain HTML/Tailwind (HeroUI v3 removed the Navbar component, but the existing code already matches the v3 pattern — no migration needed). The shared components accept a typed `tenant` prop and receive session/auth data from the consumer, keeping `@repo/ui` free of Better Auth and React Query dependencies.

**Primary recommendation:** Extract PortalNav as-is with minimal changes (convert internal hook calls to props), build HeroSection and Footer as new `@repo/ui` components, then compose them in the customer portal home page with a logged-in redirect to `/my-shipments`.

**Key HeroUI v3 finding:** The Navbar component was **removed** in HeroUI v3 [VERIFIED: heroiu.com/docs/react/migration/navbar]. The existing PortalNav already uses native `<header>`/`<nav>` elements with Tailwind — no HeroUI Navbar subcomponents to migrate. The new shared Navbar should continue this pattern.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Extract existing `PortalNav` from `apps/customer/components/portal-nav.tsx` into `@repo/ui`
- **D-02:** Shared Navbar receives tenant config via `tenant` prop (logo, brand name, theme color, nav links)
- **D-03:** Keep existing auth-aware link logic (logged-in vs logged-out links) — Navbar renders in both states
- **D-04:** Full marketing hero per tenant — headline, subtitle, CTA buttons, background image/illustration
- **D-05:** Both tenants are tracking-focused in messaging, differentiated by brand colors (Gajan = emerald, Lanka Mahal = violet)
- **D-06:** HeroSection component in `@repo/ui` accepts tenant config prop
- **D-07:** Tracking number search is a separate section BELOW the hero, not inside it
- **D-08:** Distinct section with its own background, title "Track Your Shipment", and search form
- **D-09:** Landing page sections in order: Hero → Tracking Search → Features → Footer
- **D-10:** Agent discretion on Features section details (what feature cards, layout, icons)
- **D-11:** Full footer component in `@repo/ui` with: copyright, nav links, contact info (address, phone), social media icons, optional newsletter signup
- **D-12:** Per-tenant content passed via tenant config prop
- **D-13:** Landing page lives in the existing customer portal app (`apps/customer/(portal)/page.tsx`)
- **D-14:** Domain routing via existing `proxy.ts` handles tenant detection (gajantraders.com vs lankamahal.lk)
- **D-15:** Landing page is for logged-out/anonymous visitors
- **D-16:** Logged-in customers redirect to `/my-shipments` on page load
- **D-17:** Shared components (`Navbar`, `HeroSection`, `Footer`) accept a typed `tenant` prop with `{ name: string; shortName: string; theme: 'emerald' | 'violet'; logo?: string; links: NavLink[]; contact?: ContactInfo }`
- **D-18:** Customer portal provides tenant config from existing `useTenantConfig()` hook when rendering shared components

### Agent's Discretion
- Features section design (icons, layout, copy)
- Exact background imagery approach for hero (gradient, pattern, or image per tenant)
- Newsletter signup implementation in footer
- Mobile breakpoint specifics
- Loading/error states for shared components

### Deferred Ideas (OUT OF SCOPE)
- None

</user_constraints>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@repo/ui` (workspace) | 0.0.0 | Shared component library | Project standard — all shared components live here |
| `@heroui/react` | ^3.1.0 | UI primitive components (Button, Input, Card, Link, Chip) | Already in both `@repo/ui` and customer portal |
| `lucide-react` | ^1.18.0 | Icons for nav links, hero, features, footer | Already in customer portal, used throughout |
| `next/navigation` | Next.js 16 | `useRouter`, `usePathname` for nav state | Standard Next.js routing |

### Components to Create in `@repo/ui`

| Component | File | Type |
|-----------|------|------|
| `Navbar` | `packages/ui/src/navbar.tsx` | `'use client'` |
| `HeroSection` | `packages/ui/src/hero-section.tsx` | `'use client'` (if animations/CTA handlers) or server |
| `Footer` | `packages/ui/src/footer.tsx` | `'use client'` (if newsletter form) or server |
| `TenantConfig` types | `packages/ui/src/tenant-types.ts` | Pure types (no directive needed) |

### Dependencies

No new packages needed:
- `@heroui/react` is already in `packages/ui/package.json` and `apps/customer/package.json`
- `lucide-react` is already in `apps/customer/package.json`
- `@repo/ui` is already a workspace dependency of customer portal

---

## Component Library Structure

### Exports Pattern

`@repo/ui` uses a glob exports map in `packages/ui/package.json`:
```json
{
  "exports": {
    "./*": "./src/*.tsx"
  }
}
```

This means any file at `packages/ui/src/foo.tsx` is automatically available as `import { Foo } from '@repo/ui/foo'`. **No barrel exports** — the project convention is direct file imports [VERIFIED: AGENTS.md conventions].

### Files to Create

```
packages/ui/src/
├── tenant-types.ts       # Shared types: NavLink, ContactInfo, TenantTheme, TenantConfig
├── navbar.tsx            # Extracted + refactored PortalNav
├── hero-section.tsx      # New marketing hero component
└── footer.tsx            # New footer component
```

### Files to Modify

```
apps/customer/components/
├── portal-nav.tsx        # REMOVE — extracted to @repo/ui
├── gajan/layout.tsx      # REMOVE inline footer — use shared Footer
└── lanka/layout.tsx      # REMOVE inline footer — use shared Footer

apps/customer/app/
├── (portal)/page.tsx     # Replace with new landing page (Hero → Tracking Search → Features → Footer)
├── layout.tsx            # Keep GajanLayout/LankaLayout wrappers, or simplify
└── (portal)/layout.tsx   # Replace PortalNav import with @repo/ui Navbar
```

### Convention Compliance

- All new files use `kebab-case.tsx` naming [VERIFIED: AGENTS.md conventions]
- Named exports only (no default exports except Next.js pages) [VERIFIED]
- Components with `'use client'` directive when using browser APIs, hooks, interactivity [VERIFIED]

---

## Component Extraction Plan

### Navbar (`portal-nav.tsx` → `@repo/ui/navbar.tsx`)

**Current state** (`apps/customer/components/portal-nav.tsx`):
- `'use client'` component that reads `useTenantConfig()` and `authClient.useSession()` directly
- Uses `useRouter`, `usePathname` from Next.js
- Renders auth-aware links (logged-in: My Shipments, Quotations, Invoices, Notifications, Profile, Sign Out | logged-out: Sign In, Register)
- Theme switching via `isEmerald ? 'emerald-600' : 'violet-600'` conditional classes
- Layout: sticky header with `border-b`, `backdrop-blur-sm`, max-w-5xl centered

**Extraction plan:**

1. **Strip internal data fetching** — remove `useTenantConfig()`, `authClient.useSession()`, `useUnreadCount()` calls
2. **Accept data via props** — `tenant: TenantConfig`, `session: Session | null`, `unreadCount: number`, and callbacks for `onSignOut`
3. **Keep all rendering** — the JSX structure, link logic, theme classes, responsive behavior stay identical
4. **Re-export from customer portal** — the consumer wraps with data hooks and passes props

```typescript
// @repo/ui/navbar.tsx — new prop-based API
'use client';

import { type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@heroui/react';
// ... lucide icons
import type { TenantConfig } from './tenant-types';

interface NavLink {
  label: string;
  href: string;
  icon?: ReactNode;
  match?: string[];  // path prefixes that count as "active"
}

interface NavbarProps {
  tenant: TenantConfig;
  links: {
    loggedIn: NavLink[];
    loggedOut: NavLink[];
  };
  session: { user: { name: string; email: string } } | null;
  unreadCount: number;
  onSignOut: () => Promise<void>;
}

export function Navbar({ tenant, links, session, unreadCount, onSignOut }: NavbarProps): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const isEmerald = tenant.theme === 'emerald';
  // ... same JSX as current PortalNav
}
```

**What stays the same:**
- `useRouter()`, `usePathname()` stay (these are Next.js, not auth/data)
- All link rendering, active state detection, theme classes, responsive behavior
- Mobile hamburger (if any) — the current PortalNav doesn't have one, it only uses `hidden sm:inline` for labels

**Consumer side** (`apps/customer/app/(portal)/layout.tsx`):
```typescript
import { Navbar } from '@repo/ui/navbar';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { authClient } from '@/lib/auth-client';
import { useUnreadCount } from '@/lib/queries';

function PortalLayout({ children }) {
  const config = useTenantConfig();
  const { data: session } = authClient.useSession();
  const { data: unreadData } = useUnreadCount();

  return (
    <>
      <Navbar
        tenant={config}
        links={/* define nav links with icons */}  // or receive from tenant config
        session={session ?? null}
        unreadCount={unreadData?.count ?? 0}
        onSignOut={async () => { await authClient.signOut(); }}
      />
      <main>{children}</main>
    </>
  );
}
```

### HeroSection (new component)

**Design constraints from CONTEXT.md:**
- Full marketing hero per tenant — headline, subtitle, CTA buttons
- Both tenants tracking-focused, differentiated by brand colors
- Accepts `tenant` prop

```typescript
// packages/ui/src/hero-section.tsx
import type { ReactNode } from 'react';
import type { TenantConfig } from './tenant-types';

interface HeroSectionProps {
  tenant: TenantConfig;
  headline: string;
  subtitle: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  background?: 'gradient' | 'pattern' | 'image';
}

export function HeroSection({ tenant, headline, subtitle, ctaPrimary, ctaSecondary, background = 'gradient' }: HeroSectionProps): ReactNode {
  const isEmerald = tenant.theme === 'emerald';
  // ... render
}
```

**Background imagery approach (agent discretion):** Recommend gradient-based as it's zero-dependency and performs well:
- Gajan Traders: `bg-gradient-to-br from-emerald-50 via-white to-emerald-100` with pattern overlay
- Lanka Mahal: `bg-gradient-to-br from-violet-50 via-white to-violet-100` with pattern overlay

### Footer (new component)

**Design constraints from CONTEXT.md:**
- Full footer: copyright, nav links, contact info (address, phone), social media icons, optional newsletter signup
- Per-tenant content via `tenant` prop

```typescript
// packages/ui/src/footer.tsx
import type { ReactNode } from 'react';
import type { TenantConfig, ContactInfo, SocialLink } from './tenant-types';

interface FooterProps {
  tenant: TenantConfig;
  contact?: ContactInfo;
  socialLinks?: SocialLink[];
  navLinks?: { label: string; href: string }[];
  newsletter?: boolean;  // agent discretion — enable/disable
}

export function Footer({ tenant, contact, socialLinks, navLinks, newsletter }: FooterProps): ReactNode {
  // ...
}
```

**Current state:** GajanLayout and LankaLayout have bare inline footers:
```jsx
<footer className="border-t border-separator py-6 text-center text-sm text-muted">
  &copy; {new Date().getFullYear()} Gajan Traders
</footer>
```

These get replaced by the shared Footer component.

---

## Tenant Prop API Design

### Shared Type Definition

```typescript
// packages/ui/src/tenant-types.ts

export type TenantTheme = 'emerald' | 'violet';

export interface NavLink {
  label: string;
  href: string;
  icon?: string;        // lucide icon name — consumer resolves to component
  match?: string[];      // path prefixes for active state detection
}

export interface ContactInfo {
  address?: string;
  phone?: string;
  email?: string;
}

export interface SocialLink {
  platform: string;     // 'facebook' | 'twitter' | 'instagram' | 'linkedin'
  url: string;
}

export interface TenantConfig {
  name: string;          // "Gajan Traders"
  shortName: string;     // "GT"
  theme: TenantTheme;    // 'emerald' | 'violet'
  logo?: string;         // URL or empty — fall back to shortName badge
  title?: string;        // "Track Your Shipment"
}

export interface FooterConfig {
  contact?: ContactInfo;
  socialLinks?: SocialLink[];
  navLinks?: { label: string; href: string }[];
}
```

### Data Flow

```
Customer Portal (apps/customer)
─────────────────────────────────
  proxy.ts → sets x-tenant-slug header
    ↓
  app/layout.tsx — reads header, picks GajanLayout/LankaLayout
    ↓
  app/(portal)/layout.tsx — renders Navbar from @repo/ui
    ├─ useTenantConfig() → TenantConfig (from DOM data-tenant-slug)
    ├─ authClient.useSession() → session
    └─ useUnreadCount() → unread count
          ↓
        passes all as props to <Navbar>

  app/(portal)/page.tsx — renders landing page
    ├─ useTenantConfig() → TenantConfig
    └─ authClient.useSession() → session (null → show landing, exists → redirect)
          ↓
        passes tenant to <HeroSection>, <Footer>
```

### Consumer Hook

The existing `useTenantConfig()` returns the current shape:
```typescript
{ name: 'Gajan Traders', shortName: 'GT', title: 'Track Your Shipment', theme: 'emerald' }
```

This is compatible with `TenantConfig` (title is optional at the shared level). No changes needed to the hook — it reads `data-tenant-slug` from `document.documentElement`.

---

## Page Architecture

### Structure

```
apps/customer/app/(portal)/page.tsx
────────────────────────────────────
'use client'  (needs authClient.useSession())

┌─ HomePage ──────────────────────────────────────────┐
│  useEffect: if session → router.push('/my-shipments') │
│                                                       │
│  <HeroSection tenant={config} />                      │
│  <TrackingSearchSection />  (inline or extracted)     │
│  <FeaturesSection />         (inline or extracted)    │
│  <Footer tenant={config} />                           │
└───────────────────────────────────────────────────────┘
```

### Sections

| Section | Component | Location | Content |
|---------|-----------|----------|---------|
| Navbar | `@repo/ui/navbar` | Portal layout | Logo, nav links, auth-aware |
| Hero | `@repo/ui/hero-section` | page.tsx | Headline, subtitle, CTA buttons |
| Tracking Search | Inline in page.tsx | page.tsx | "Track Your Shipment" title, TextField + Button |
| Features | Inline or extracted | page.tsx | Feature cards (agent discretion) |
| Footer | `@repo/ui/footer` | page.tsx | Copyright, links, contact, social, newsletter |

### Logged-in Redirect

```typescript
'use client';

function HomePage() {
  const config = useTenantConfig();
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  // Redirect logged-in users
  useEffect(() => {
    if (!isPending && session) {
      router.push('/my-shipments');
    }
  }, [session, isPending, router]);

  // Show nothing while checking session (or a brief loader)
  if (isPending) return <PageSkeleton />;
  if (session) return null;  // redirect fires in effect

  // Show landing page for logged-out
  return (
    <>
      <HeroSection tenant={config} ... />
      <TrackingSearchSection />
      <FeaturesSection />
      <Footer tenant={config} ... />
    </>
  );
}
```

**Important:** This redirect replaces the current approach where the home page renders both dashboard (logged-in) and hero (logged-out). The new page is anonymous-only.

### Route Group Structure

The existing `(portal)` route group wraps all portal pages. The portal layout currently renders inside GajanLayout/LankaLayout which includes PortalNav:
```
app/layout.tsx → Providers wrapper
  └─ GajanLayout → PortalNav + <main>{children}</main> + inline footer
       └─ (portal) layout.tsx (nonexistent) / page.tsx
```

For Phase 4, the Navbar moves from the per-tenant layouts to the portal layout:
```
app/layout.tsx → Providers wrapper
  └─ GajanLayout → wrapper div (no PortalNav, no footer)
       └─ (portal) layout.tsx → Navbar (from @repo/ui) + <main>{children}</main>
            └─ page.tsx → HeroSection + TrackingSearch + Features + Footer
```

**Simplification option:** Since Navbar and Footer are now shared components rendered inside the page/layout rather than GajanLayout/LankaLayout, those layout wrappers become thinner — they may only need to apply tenant-specific body classes if any. Consider whether they're still needed at all.

---

## Risks and Gotchas

### 1. SSR / Client-Server Boundary

**What goes wrong:** The shared components in `@repo/ui` use `'use client'` because they need `useRouter`, `usePathname`, event handlers, etc. Next.js client components in a shared package work fine when imported from a Next.js app, but `next/navigation` is a Next.js-specific module.

**Why it works:** `@repo/ui` is only consumed by Next.js apps in this project. The hooks (`useRouter`, `usePathname`) are only used in the Navbar, which already has `'use client'`. HeroUI components are also client components with `'use client'` already declared internally.

**How to avoid:**
- Keep `'use client'` on Navbar (it was already client in the source)
- HeroSection can be a server component if it has no interactivity (pure presentational). Make it `'use client'` only if adding animations or JS event handlers.
- Footer can be a server component if newsletter is server-rendered form only. Add `'use client'` only if adding interactive JS.

### 2. NavLink Icon Passing

**What goes wrong:** If nav link icons are defined as lucide icon components and passed via props from customer portal to `@repo/ui`, the shared package needs `lucide-react` as a dependency — but it currently isn't in `packages/ui/package.json`.

**How to avoid:** Two options:
1. **Add `lucide-react` to `packages/ui/package.json`** — cleanest, Navbar renders icons internally. `lucide-react` is tree-shakeable.
2. **Pass icon ReactNodes as props** — consumer renders icons and passes them. Avoids the dependency but makes the prop object inconsistent (mixing strings and elements in the `links` array).

Recommend **option 1** — add `lucide-react` to `@repo/ui` dependencies. It's already a transitive dependency through the customer portal and used widely.

### 3. `data-tenant-slug` SSR Timing

**What goes wrong:** `useTenantConfig()` reads `document.documentElement.getAttribute('data-tenant-slug')`. This only works client-side. During SSR, it falls back to `'gajan-traders'`. The `data-tenant-slug` attribute is set server-side in `app/layout.tsx` via the `getTenantSlug()` call, so the server-rendered HTML has the correct attribute — but `useTenantConfig()` can't read it during SSR because `document` is undefined.

**Impact:** The SSR fallback returns Gajan Traders config. After hydration, the client reads the correct slug. This means Lanka Mahal visitors see a brief flash of Gajan-styled content during SSR rendering.

**Mitigation for shared components:** The `Navbar` component receives `tenant` as a prop — the consumer (`useTenantConfig()`) handles the SSR fallback. This is acceptable (it's how the current portal works). Alternatively, the consumer can use `getTenantSlug()` server-side and pass the resolved config.

### 4. Layout Restructuring

**What goes wrong:** Currently, PortalNav is rendered inside GajanLayout/LankaLayout (children of `app/layout.tsx`). After extraction, the Navbar moves to `(portal)/layout.tsx`. The GajanLayout/LankaLayout wrappers need updating to remove inline Navbar and footer.

**What to change:**
- `apps/customer/components/gajan/layout.tsx` — remove `<PortalNav />` and inline footer, just render `<main>{children}</main>` with any tenant-specific wrappers
- `apps/customer/components/lanka/layout.tsx` — same
- Add `apps/customer/app/(portal)/layout.tsx` — new layout that renders Navbar + children

### 5. Home Page Route Compatibility

**What goes wrong:** The current `apps/customer/app/(portal)/page.tsx` has `'use client'` and uses `authClient.useSession()`. After Phase 4, it redirects logged-in users to `/my-shipments`. This changes the behavior for authenticated users who visit `/`.

**Impact:** Existing users who visit `/` will now redirect to `/my-shipments`. This is the intended behavior per D-15/D-16. No backward compatibility concern — it's a UX improvement.

### 6. HeroUI v3 Component Changes

**What goes wrong:** The codebase uses `@heroui/react` ^3.1.0 which is HeroUI v3 (major rewrite from v2). Some component APIs changed:

| v2 Pattern | v3 Pattern | Found in Current Code? |
|------------|-----------|----------------------|
| `Navbar` subcomponents | **Removed** — use native HTML | Current PortalNav already uses native HTML ✅ |
| `Button` variants | Different API | Current code uses simple variants ✅ |
| `TextField` + `Input` composition | Updated but compatible | Current code uses `TextField` with `Input` child ✅ |
| `Chip color` | Same API | ✅ |
| `Skeleton` | Available | ✅ |

[VERIFIED: heroiu.com/docs/react/migration/navbar]

No breaking changes expected since the current components already work on `@heroui/react` ^3.1.0.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HeroUI v2 Navbar component | Removed in v3 — manual HTML/Tailwind | v3.0.0 | Existing PortalNav was built correctly without it |
| `export default` components | Named exports only | Project convention | All new `@repo/ui` components use named exports |
| Inline footers in GajanLayout/LankaLayout | Shared Footer component in `@repo/ui` | This phase | More consistent, tenant-configurable footers |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `lucide-react` is not yet a dependency of `@repo/ui` | Dependencies | LOW — just needs `pnpm add lucide-react` in packages/ui |
| A2 | Current PortalNav doesn't use HeroUI's Navbar subcomponents | Component Extraction | LOW — verified by reading source code, confirmed by HeroUI v3 migration docs |
| A3 | The consumer pattern of passing session as a prop (not importing authClient in @repo/ui) is the recommended approach | Component Extraction | LOW — standard React prop pattern, keeps @repo/ui framework-agnostic |
| A4 | GajanLayout/LankaLayout can be simplified to remove inline footer/Navbar | Layout Restructuring | LOW — they're thin wrappers, minimal risk |

---

## Open Questions

1. **Where to render the Footer?**
   - Option A: In `(portal)/layout.tsx` (appears on all portal pages)
   - Option B: Only in the landing `page.tsx` (doesn't appear on logged-in pages like /my-shipments)
   - **Recommendation:** D-09 says Footer is part of the landing page structure. Render in page.tsx. Logged-in pages already have their own layout structure. If needed later, the Footer can be moved to the layout.

2. **Should the Navbar define its own nav links or receive them as props?**
   - D-02 says "tenant config prop (logo, brand name, theme color, nav links)"
   - **Recommendation:** Pass nav links as part of the tenant config. This allows the consumer to customize which links show for each tenant without modifying @repo/ui.

3. **What happens to the current GajanLayout/LankaLayout after extraction?**
   - They currently wrap PortalNav + main + footer
   - After extraction, Navbar moves to (portal)/layout.tsx and Footer renders in page.tsx
   - **Recommendation:** Keep them as simple wrappers that apply tenant-specific classes/containers. If nothing is left, remove them and render children directly in RootLayout.

---

## Environment Availability

**Step 2.6: SKIPPED** (no external dependencies beyond the existing Node.js/pnpm toolchain — all work is code changes to existing packages/apps)

---

## Sources

### Primary (HIGH confidence)
- [HeroUI v3 Navbar Migration Guide](https://heroui.com/docs/react/migration/navbar) — verified Navbar component removed in v3, confirmed manual HTML/Tailwind pattern
- [@repo/ui package.json](C:\websites\gt\packages\ui\package.json) — exports map `"./*": "./src/*.tsx"`
- [PortalNav source](C:\websites\gt\apps\customer\components\portal-nav.tsx) — full implementation read and analyzed
- [GajanLayout/LankaLayout source](C:\websites\gt\apps\customer\components\gajan\layout.tsx) — inline footers verified
- [Home page source](C:\websites\gt\apps\customer\app\(portal)\page.tsx) — current hero/tracking/dashboard composition
- [Tenant config source](C:\websites\gt\apps\customer\lib\tenant-config.ts) — data shape analyzed
- [useTenantConfig source](C:\websites\gt\apps\customer\lib\use-tenant-config.ts) — SSR behavior documented
- [proxy.ts source](C:\websites\gt\apps\customer\proxy.ts) — domain routing working, no changes needed
- [AGENTS.md](C:\websites\gt\AGENTS.md) — project conventions (named exports, kebab-case, barrel export prohibition, `'use client'` directives)

### MEDIUM confidence
- HeroUI v3 component catalog from `llms.txt` — confirms available components (Button, Input, Link, Card, Skeleton, Chip are all available in v3)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already installed, no new package decisions
- Architecture: HIGH — clearly documented in CONTEXT.md decisions
- Pitfalls: HIGH — verified by reading source code and HeroUI v3 migration docs

**Research date:** 2026-07-06
**Valid until:** 2026-08-06 (stable stack, no fast-moving dependencies involved)
