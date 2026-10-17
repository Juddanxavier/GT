---
status: complete
quick_id: 261017-e9u
date: 2026-10-17
title: Redesign admin KPI cards and mini charts
---

# Quick Task 261017-e9u — Redesign admin KPI cards and mini charts

## What changed

Richer, more expressive KPI cards and mini charts across every admin surface,
still inside the Lime & Paper contract and still on live data. No data plumbing
touched — every card reads the same real stats as before.

### `apps/admin/components/kpi-card.tsx`
- Title is now a semibold near-foreground label (`text-[13px] font-semibold text-foreground/80`).
- The trend moved from inline text to a tinted pill: glyph + percentage on
  `bg-success/10` / `bg-danger/10`, neutral `bg-default-100` for a flat or
  unknown change (`—`). `invertTrend` still flips the tone, not the arrow.
- The chart block gained a `border-divider` hairline and now reads the window
  length into the caption (`{n}d · min–max`, e.g. `14d · 3–12`). The min–max
  stays printed as text for the a11y contract.
- Icon badge grew to `w-9 h-9 rounded-xl` and is `aria-hidden`.
- Interaction contract unchanged (`href` → link, `onPress` → button, else panel);
  `hasSeriesSignal` still drops the chart on a zero count / all-zero series.

### `apps/admin/components/dashboard/mini-chart.tsx`
- `Sparkline`: highlighted latest-point dot (theme-aware ring via `--content1`), softer gradient.
- `MiniBars`: rounded tops on a `border-divider` baseline; the peak bar renders at full strength.
- `MiniDonut`: thicker ring (4.5) and quieter track.
- Still dependency-free SVG; exported API and `aria-hidden` unchanged.

### List surfaces
- `shipments-kpi-row.tsx` and `invoices/page.tsx` now pass `chart="line"`, so the
  sparklines they already compute from real trend data actually render.

### `apps/admin/DESIGN.md`
- `### KPI card` bullets describe the new anatomy; a new Intentional visual
  changes entry records it.

## Verification
- `pnpm --filter admin check-types` — passes.
- `pnpm lint` (biome) — 119 warnings, the documented baseline; zero a11y errors.
  The 5 warnings touching changed files are pre-existing (unused imports/vars in
  `invoices/page.tsx`; `noArrayIndexKey` in the chart, as before).
- Manual checklist left for the reviewer: dashboard / superadmin / shipments /
  invoices cards show the new anatomy; a zero-count card drops its chart; light
  and dark both read; reduce motion collapses the entrance.

## Commit status — deferred
The working tree already carried a large uncommitted admin retheme (these five
files hold substantial pre-existing diffs on top of the last commit). Committing
them would sweep that unrelated in-progress work into this task's commit, so the
code change was left staged-ready but uncommitted. Only planning artifacts are
recorded.
