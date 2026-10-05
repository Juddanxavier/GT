# Rationale: reusable admin UI foundation

## Context

The admin app (`apps/admin`) is a real, working operations tool: roughly thirty pages covering shipments, customers, quotations, invoices, branches, users, rate cards, reports, and an audit log. Each list page was built by hand. The table markup, the loading and empty states, the status coloring, and the filter bars are repeated with small variations page to page. The dashboard was already refactored into named components (`apps/admin/components/dashboard/*`), which shows the team knows how to do this; every other list page skipped that step.

The shared package `@repo/ui` exists but holds almost nothing: a button, a card, a code block, and a status config. It is aspirational rather than real. Meanwhile `apps/customer` and `apps/lanka-mahal` each wrote a `DESIGN.md` and their own `globals.css`. The admin has a genuine and well built token set in `apps/admin/app/globals.css` (a Raycast inspired, dark first palette) but it lives only inside the admin app.

Three forces make this the right moment to fix it. First, the agreed plan for the admin is a full redesign, sliced feature by feature; without shared parts every slice re-solves the same problems and the slices drift apart. Second, the accessibility audit found failures (color only status signals, toast live regions, modal focus) that are cheapest to fix once in shared components rather than per page. Third, the status vocabulary has already forked. There are in fact four copies: `@repo/ui/status-config.ts` (semantic names, five groups including Available for Pickup), `apps/admin/lib/status-config.ts` (semantic names, four groups, plus `statusGroupCounts` and `INVOICE_STATUS_COLORS`), and separate `apps/customer/lib/status.ts` and `apps/lanka-mahal/lib/status.ts` (each with its own extras like `cancelled` and `delivery_failure`). The admin badge hardcodes Tailwind color classes rather than reading any config, and carries a `cancelled` group that maps no status. That fork will only widen. This feature reconciles the `@repo/ui` and admin copies; the two portal apps are explicitly out of scope and left as they are.

The cost of not deciding is concrete: more duplicated markup, more drift between the badge and the shared config, and a redesign that repeats itself on every page.

## Current state inventory

Collected while designing, from a read of the repo.

| Area | What exists now | Gap |
|---|---|---|
| `@repo/ui` | `button.tsx`, `card.tsx`, `code.tsx`, `status-config.ts` | No table, states, header, filter bar, or badge |
| Admin tokens | `apps/admin/app/globals.css` (full light and dark token set, glass utilities, table density classes) | Not shared; other apps cannot use it |
| Admin design doc | none | `apps/customer/DESIGN.md` and `apps/lanka-mahal/DESIGN.md` exist; admin has no equivalent |
| Status vocabulary | Four copies: `@repo/types/status` (nine statuses, labels), `@repo/ui/status-config.ts` (five groups), `apps/admin/lib/status-config.ts` (four groups, KPI counts, invoice colors), and per app `lib/status.ts` in both portals | Admin badge hardcodes colors and has a dead `cancelled` group; the group sets disagree; no `--secondary` token exists for `available_for_pickup` |
| Table | HeroUI Table used inline per page; `table-preferences.tsx` for density | No shared table; no sort, selection, or resize contract |
| States | `dashboard-skeleton.tsx`, per page loading files, ad hoc empty blocks | No shared `EmptyState`, `ErrorState`, `LoadingState` |

Evidence (verbatim, for the record):

- `packages/ui/src/status-config.ts` maps every status to a semantic color: `pending: 'warning'`, `in_transit: 'primary'`, `delivered: 'success'`, and so on.
- `apps/admin/components/shipment-status-badge.tsx` defines its own `STATUS_META` with hardcoded classes such as `text-amber-700 dark:text-amber-300` and `bg-amber-50 dark:bg-[#422006]`, and its own group map that includes `cancelled`.

## Options considered

### Option 1: Promote and standardize, then migrate one page (strangler, thin thread first)

Move the admin tokens into a shared CSS file in `@repo/ui`, build the shared component set there, and adopt it on the shipments list only as proof. Every other page keeps working and migrates in its own later slice.

**Pros**:
- The shared foundation is proven end to end on a real page before anything else depends on it.
- No page is forced to change at once, so the blast radius stays small.
- Matches the project's Tracer Bullet approach and the strangler instinct for a live system.

**Cons**:
- Two styling styles coexist for a while (shared and inline), which is a temporary inconsistency.
- The team must maintain `@repo/ui` as a real library from now on.

### Option 2: Migrate every admin list page in this feature

Build the shared set and immediately replace every list page.

**Pros**:
- One consistent admin surface when it lands.
- No period of mixed styling.

**Cons**:
- A large, wide blast radius touching every future slice up front.
- Higher chance of regressions across the whole tool at once.
- Held up by every page's individual quirks, so it lands late.

### Option 3: Fix in place, share nothing

Leave each page's markup, only fix the accessibility and color issues where they are.

**Pros**:
- Smallest change, no new package surface.

**Cons**:
- Does nothing about duplication; every future slice repeats the same work.
- The status fork between the badge and the shared config stays.
- Directly contradicts the agreed full redesign.

## Rationale

Option 1 is chosen because the forces here are duplication and drift across many pages, and the only durable fix is a shared layer, but a live operations tool cannot afford a big bang restyle (Option 2) while new slices are still being planned. The strangler path proves the foundation on the shipments page, the busiest list, before the rest depend on it, which is exactly the pattern that keeps a production tool usable throughout a redesign. Option 3 is rejected because it leaves the root cause (repetition) untouched and the status fork in place, so the redesign would keep re-solving solved problems.

On the two sub choices the engineer made that are worth recording:

- **TanStack Table over a thin HeroUI wrapper.** The engineer chose the headless library. This costs a new dependency and a real migration of each list, but it buys sorting, filtering, pagination, selection, column visibility, and column resize without hand rolling them, and it leaves the door open to virtualization later. The thinner HeroUI wrapper would have been less code now but would have been reworked as soon as selection and resize were needed. The engineer's call is sound given the full redesign.
- **Column resize now, virtualization later.** Resize is pure TanStack and cheap; virtualization only pays off on very large unpaginated lists, and the admin lists are paginated. Deferring virtualization avoids complexity the app does not need yet while building the table so it can be added later.

The token authority choice (a shared CSS file in `@repo/ui`) fits how the apps already work: they import `@heroui/styles` from CSS, so importing a shared token stylesheet is the same pattern, and it avoids the heavier TypeScript token provider alternative.