---
status: complete
quick_id: 261017-e9u
date: 2026-10-17
title: Admin KPI overhaul — bento board (Layout C "Column")
---

# Quick Task 261017-e9u — Admin KPI overhaul (bento "Column")

## How it got here

Three passes, each rejected as too quiet:

1. Tinted pill + chart dot — "looks the same".
2. Direction C "Radio Band" (split hero + banded tiles) — shipped, then
   superseded.
3. **Bento board** — the final direction. Chosen from three throwaway previews
   (`previews/bento-*.html`): **C — Column** (2×2 feature square, tall status
   rail, small-tile row), **bento on every KPI row**, **donut ring** for status.

## What changed

### New primitives
- `apps/admin/components/bento.tsx` — `BentoBoard` (2 cols below `lg`, 4 at
  `lg`, `minmax(156px, auto)` rows), `BentoWidget`, `bentoSpan`
  (`base`/`wide`/`tall`/`feature`), and `bentoRowSpans(count)` so a uniform
  list row always fills its grid.

### `apps/admin/components/kpi-card.tsx`
- One tile grammar with a `size` prop. `feature` renders a `text-[54px]` value
  and the large gridlined `AreaChart`; every other size renders its `MiniChart`.
- Keeps the 5px signal band and the soft per-metric `color-mix` wash.

### Dashboards
- `operational-dashboard.tsx` — Column board: `feature` Total Shipments,
  In Transit, tall `StatusDonut`, Out for Delivery, Delivered Today, Exceptions,
  By Carrier, By Branch. When the viewer is not a tenant admin, By Carrier
  widens to `lg:col-span-2` so the board still fills.
- `superadmin-dashboard.tsx` — Column board: `feature` Total, In Transit, tall
  `StatusDonut`, Delivered Today.
- The `ShipmentTrendChart` is now full width below the board.
- `dashboard-skeleton.tsx` mirrors the board.

### Status widget
- `components/dashboard/status-donut.tsx` (new) — segmented SVG ring with a
  legend that prints every status name and value as text. Replaced the stacked
  bar panel.

### List rows (bento everywhere)
- `shipments-kpi-row.tsx` — the active filter tile takes the `feature` square
  and the mosaic reflows around it.
- `invoices/page.tsx` — `feature` Total + two `wide` tiles.
- `reports/page.tsx` — `bentoRowSpans` across the 5- or 4-card set.

### Removed
- `components/dashboard/kpi-hero.tsx`, `kpi-stat-card.tsx`,
  `status-breakdown.tsx`, and the `KpiHeroItem` type — one tile grammar plus the
  board replaced them.

### `DESIGN.md`
- KPI card section rewritten for the board, the sizes, the donut, and
  `bentoRowSpans`; the intentional-changes entry records the mosaic.

## Previews
- `previews/bento-index.html` — the three layouts.
- `previews/bento-c-column.html` — the chosen layout.
- `previews/bento-a-anchor.html`, `previews/bento-b-ribbon.html` — runners-up.
- Earlier KPI previews under `previews/*.html` are kept for history.

## Verification
- `pnpm --filter admin check-types` — passes.
- `pnpm --filter admin lint` — **119 warnings**, exactly the documented
  baseline; zero new, zero a11y errors. (Reports/invoices carry their
  pre-existing unused-import, `useHookAtTopLevel`, and `noNonNullAssertion`
  warnings.)
- Reviewer walkthrough: both dashboards show the Column board; a zero-count tile
  drops its chart; the shipments filter grows the active tile; the donut legend
  carries every value as text; light and dark both read; reduce motion collapses
  the stagger.

## Commit status — deferred
The working tree still carries the large uncommitted admin retheme, so the code
changes are left unstaged to avoid sweeping unrelated work in. Only the
quick-task planning artifacts and previews are committed.
