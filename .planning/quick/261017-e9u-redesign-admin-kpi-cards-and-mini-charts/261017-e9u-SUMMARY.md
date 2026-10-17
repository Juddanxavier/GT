---
status: complete
quick_id: 261017-e9u
date: 2026-10-17
title: Admin KPI overhaul — Radio Band (hero + banded tiles)
---

# Quick Task 261017-e9u — Admin KPI overhaul (Direction C "Radio Band")

## Context

A first pass (pill + chart dot) was too quiet and was rejected as "looks the
same". After a structured round of questions and three throwaway HTML previews
(`previews/`), the chosen direction is **C — Radio Band**: a split hero over a
roster of banded tiles, with soft per-metric colour fills, contract relaxed for
the KPI section only, all on live data.

## What changed

### `components/dashboard/kpi-hero.tsx` (new)
- Split hero (`lg:grid-cols-[minmax(0,360px)_1fr]`): number, trend pill, and
  sublabel on the left over a soft `color-mix` wash; large `AreaChart` with
  gridlines and a range/peak caption on the right behind a hairline.
- Link variant via `href`; drops the chart on a zero/all-zero series.

### `components/kpi-card.tsx` (tile)
- Top **signal band** (5px, ramp → transparent) plus a soft per-metric wash on
  the body — the sanctioned break from the no-gradient rule, KPI section only.
- Trend pill moved into the header; value grew to `text-[38px]`; chart block
  keeps the `border-divider` hairline and `{window}d · min–max` caption.
- `tall` is now `min-h-[164px]`; interaction + a11y contract unchanged.

### `components/dashboard/mini-chart.tsx`
- New `AreaChart` (gridlines + gradient + latest-point dot) for the hero.
- `Sparkline` latest-point dot, `MiniBars` baseline + full-strength peak,
  `MiniDonut` thicker ring.

### Dashboards + group
- `kpi-stat-card.tsx` `KpiGroup` now takes an optional `hero` and renders
  heading → hero → tile grid.
- `operational-dashboard.tsx`: hero = Total Shipments (`s.total`, `sparks.total`,
  new `trends.total`); tiles = In Transit, Out for Delivery, Delivered Today.
- `superadmin-dashboard.tsx`: hero = Total Shipments; tiles = In Transit,
  Delivered Today (Total removed from the tiles).
- `dashboard-skeleton.tsx`: skeleton now mirrors hero + tile roster.

### List surfaces
- `shipments-kpi-row.tsx` and `invoices/page.tsx` still pass `chart="line"`
  (from the first pass), so those computed sparklines render.

### `DESIGN.md`
- KPI card section documents the Radio Band band/wash and the `KpiHero`; pixel
  and intentional-change entries updated.

## Preview
- `previews/index.html` — the three direction options.
- `previews/final-radio-band.html` — the chosen direction, rendered as shipped.

## Verification
- `pnpm --filter admin check-types` — passes.
- `pnpm exec biome lint` on the changed files — 4 warnings, all pre-existing
  (`noArrayIndexKey` in the chart/skeleton, `noUnusedFunctionParameters` in the
  operational dashboard, `noNonNullAssertion` in the superadmin dashboard).
  Zero a11y errors.
- Reviewer walkthrough: dashboard + superadmin show the hero and banded tiles;
  a zero-count card drops its chart; light and dark both read; reduce motion
  collapses the stagger.

## Commit status — deferred
The working tree still carries the large uncommitted admin retheme, so the code
changes are left uncommitted to avoid sweeping unrelated work into this task.
Only the quick-task planning artifacts and previews are committed.
