# Implementation Plan

## Overview

Redesign the customer app hero section (Gajan Traders / Lanka Mahal) from a functional-but-heavy layout into a premium full-screen 100vh experience with ambient floating elements, an elevated tracking form, and split-out tracking results rendered below the hero — while preserving all existing tracking/claim logic and tenant-aware theming.

The current hero packs too much: gradient backdrop, branding, heading, tracking form, and an inline result panel with full event timeline + claim button. This makes the hero unpredictably tall and undermines the Stripe-inspired "clean, airy" design mandate. The redesign separates concerns: the hero becomes a focused statement (brand → hook → track form), while the tracking result moves to its own section below. This also improves mobile usability and scroll behavior.

**Context:** Multi-tenant customer portal (Gajan Traders = emerald, Lanka Mahal = violet). Next.js 16, React 19, HeroUI v3, Tailwind CSS v4, TypeScript. All components are `'use client'`. Existing hooks (`useTrackShipment`, `useClaimShipment`, `useScrollReveal`, `useTenantConfig`) are reused as-is.

## Types

No new types are required. The existing `TrackResult` and `TrackEvent` interfaces from `lib/queries.ts` are reused unmodified.

Existing interfaces reused:
- `TrackResult` (trackingNo, status, carrier, origin, destination, estimatedDelivery, actualDelivery, lastTrackedAt, claimed, events: TrackEvent[])
- `TrackEvent` (status, description, location, eventTime)
- `TenantSlug` ('gajan-traders' | 'lanka-mahal')

## Files

One file modified, one file created, one file may need keyframe additions. No files deleted.

### Modified Files

1. **`apps/customer/components/sections/hero-section.tsx`** — Complete rewrite. Strips inline tracking results and claim logic. New architecture:
   - Full-screen min-h-screen with 100vh layout
   - Ambient floating decorative icons (Package, MapPin, Plane, Truck) using CSS `@keyframes float-slow/medium/fast` (already exist in globals.css)
   - Landing tagline pill badge
   - Main heading + subheading
   - Tracking form (existing `TextField` + `Button` pattern, untouched logic)
   - Auth links (create account / sign in) — moved to hero bottom area
   - No tracking result rendering — results emit upward via a callback or reactive state consumed by parent

2. **`apps/customer/components/sections/tracking-results.tsx`** — New file. Receives `TrackResult | undefined` from parent, renders the result card, events timeline, and claim button logic (moved from old hero-section.tsx). Uses `useClaimShipment` and `useTenantConfig` directly. Exported as `TrackingResults`.
   - Props: `result: TrackResult | undefined`, `loading: boolean`, `searchError: string`, `trackingNo: string`, `session: Session | undefined`, `onClear: () => void`
   - Renders the full tracking card, events timeline, and claim flow exactly as current but in its own section

3. **`apps/customer/components/public-landing.tsx`** — Modified to orchestrate the new split:
   - Import `TrackingResults` from sections
   - Import `useTrackShipment` from queries
   - Add tracking state (trackingNo, searchQuery, claimSuccess, claimError) at PublicLanding level
   - Pass tracking result to `TrackingResults` below `HeroSection` and above `StatsSection`
   - Remove inline tracking state from HeroSection (now lifted to PublicLanding)

4. **`apps/customer/app/globals.css`** — Minor additions:
   - New `@keyframes float-drift` for ambient icon animation (a gentler drift variant)
   - Optional: `text-gradient` utility class for gradient text on headings

### Files Not Modified
- `lib/queries.ts` — Hooks used as-is
- `lib/tenant-config.ts` — No changes
- `lib/use-tenant-config.ts` — No changes
- `lib/use-scroll-reveal.ts` — No changes
- `package.json` — No dependency changes

## Functions

### New Functions

None. The hero section uses existing hooks and React patterns. Callback-based state lifting (trackingNo → searchQuery) replaces the old internal setState pattern.

### Modified Functions

1. **`HeroSection`** (`components/sections/hero-section.tsx`) — Signature remains `(): ReactNode`. Internal logic simplified:
   - Remove `useTrackShipment`, `useClaimShipment`, `result`, `searchError` state
   - Remove `claimSuccess`, `claimError` state
   - Remove `handleClaim` function
   - Remove inline tracking result JSX
   - Add `onTrack: (trackingNo: string) => void` props interface (or use a shared state approach via parent)
   - Implementation: accept `onTrack` callback prop, call it on form submit with the tracking number
   - Visual: full-screen layout with floating ambient icons, gradient background, auth links at bottom

2. **`PublicLanding`** (`components/public-landing.tsx`) — Modified:
   - Add state: `trackingNo`, `searchQuery`, `claimSuccess`, `claimError` (moved from HeroSection)
   - Add: `useTrackShipment(searchQuery)` call at this level
   - Add: tracking form submit handler passed as `onTrack` to HeroSection
   - Add: `<TrackingResults>` component insertion between `HeroSection` and `StatsSection`

3. **`handleSubmit`** — Moves from HeroSection to PublicLanding, same logic (`setSearchQuery(trackingNo.trim())` after reset)

### Removed Functions
- `handleClaim` — Moves into TrackingResults.tsx (same logic, same implementation)

## Classes

No classes are modified or removed. All components are functional.

## Dependencies

No new packages. All required dependencies are already in `package.json`:
- `@heroui/react` — `TextField`, `Button`, `Chip`, `Input` (already used)
- `lucide-react` — `PackageSearch`, `Truck`, `MapPin`, `Clock`, `ArrowRight`, `CheckCircle2`, `RefreshCw`, `Package`, `Plane`, etc. (already used)
- `@tanstack/react-query` — `useQuery`, `useMutation` (already used)

## Testing

No existing test framework is configured. The implementation relies on TypeScript strict mode for type safety. Visual regression can be verified by running the customer dev server (`pnpm --filter=customer dev`) and navigating to localhost:3002. Verify:
- Full-screen hero renders at 100vh with no vertical scroll on load
- Floating icons animate without jank
- Tracking form submits and shows result in dedicated section below hero
- Claim flow works for authenticated users
- Tenant theming correct (emerald for Gajan, violet for Lanka)

## Implementation Order

1. Add floating drift keyframe to globals.css (if desired, can be skipped since existing `float-slow`/`float-medium`/`float-fast` keyframes already exist)
2. Rewrite `hero-section.tsx` with new 100vh layout, ambient icons, callback-based tracking form, auth links
3. Create `tracking-results.tsx` with the extracted tracking result card, timeline, and claim button
4. Modify `public-landing.tsx` to orchestrate state lifting and render TrackingResults between hero and stats
5. Run dev server and verify all flows (tracking, claim, tenant switch, mobile)