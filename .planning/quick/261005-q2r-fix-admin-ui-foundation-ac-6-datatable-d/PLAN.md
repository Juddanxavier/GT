# Quick Task: Feature 8 AC-6 (accessibility + light/dark pass) + pending production blockers

**Quick ID:** 261005-q2r
**Date:** 2026-10-05
**Workflow:** quick (no research / no plan-check / no verifier — `.planning/config.json`)
**Commit docs:** true

## Goal

Close the last two unticked boxes of `docs/scope/admin/scope.md` feature 8
(`Accessibility + light/dark pass across shared components (AC-6)` and
`Verify it: /check verify`), and apply the three still-unapplied tasks from the
existing production-blocker quick plan
`.planning/quick/261004-wf6-fix-production-blockers-inverted-error-t/261004-PLAN.md`.

## Why now

`packages/ui` is the shared foundation for every later admin slice. It currently
ships one lint error (`noUnusedVariables`), a dead density control, and six WCAG
AA contrast misses in the token sheet. Feature 9 (accessibility pass) and
feature 10 (type safety pass) both sit behind feature 8.

## Constraints (from spec 0001 cross-child contract)

- No hardcoded hex in any `@repo/ui` component; every colour comes from a token.
- Components stay headless of data (props only, no API/query imports).
- Light **and** dark both render correctly.
- Status badge is exempt from "renders identically" (intentional token change).

## Tasks

### T1 — Wire the `DataTable` density prop

`packages/ui/src/data-table.tsx` line 92 computes `cellPadding`
(`compact` → `px-4 py-1`, `comfortable` → `px-4 py-2`) and then never uses it.
Four sites hardcode `px-4 py-2`:

- L188 `<th scope="col" className="w-10 px-4 py-2">` (select-all header cell)
- L220 header content `className="relative px-4 py-2 text-xs ..."`
- L310 `<td className="px-4 py-2">` (row checkbox cell)
- L328 `<td className="px-4 py-2">` (data cell)

Replace each with `` {cellPadding} `` (keeping the extra classes). L166 is the
"N selected rows are not on this page" `role="status"` paragraph above the table
— not a cell, leave it.

Satisfies: removes the only `@repo/ui` lint error; makes the density preference
in `TablePreferences` actually work on the migrated shipments table.
`.table-density-*` in `tokens.css` targets HeroUI's `.table__cell` /
`.table__column` (invoices/customers tables) and stays as is.

### T2 — WCAG AA contrast pass on `packages/ui/src/tokens.css` (both themes)

Verified with `contrast-verify.cjs` (in this task dir). Current misses and the
replacement values (all confirmed ≥ 4.5:1 against their real rendered
background, alpha-composited over the canvas):

| Token | Theme | Now | → | Was / reason |
|---|---|---|---|---|
| `--muted-light` | light | `#71717a` (4.40 on canvas) | `#6b6b73` | login page `placeholder:text-muted-light` |
| `--muted-light` | dark | `#71717a` (4.12 canvas / 3.75 surface) | `#8a8a93` | same, on `rgba(24,24,27,.85)` surface |
| `--field-placeholder` | light | `#a1a1aa` (2.56 on white) | `#71717a` | every HeroUI `Input`/`Textarea` placeholder |
| `--field-placeholder` | dark | `#71717a` (3.72 on field) | `#8b8b93` | same |
| `--accent-soft-foreground` | light | `#0891b2` (3.54 on `--accent-soft`) | `#0e7490` | soft chips + `.button--secondary` label |
| `--sidebar-muted` | light | `#71717a` (3.67 on `--sidebar`) | `#a1a1aa` | sidebar is `#18181b` in **both** themes |

Explicitly **out of scope for this task** (recorded as findings for feature 9
"Accessibility pass", which owns "bring the admin surface to WCAG AA"): the
light-theme strong-colour pairs — `--accent`/`--danger`/`--success`/`--warning`/
`--info` with `*-foreground: #ffffff`, plus `text-*` on canvas. Fixing those is
a palette redesign (cyan-600 → cyan-700, red-500 → red-700 …) that needs a
design decision in `/architect accessibility pass`, and the soft pairs already
carried by `StatusBadge` all pass.

Satisfies: AC-6 contrast half.

### T3 — Clear the last two a11y lint errors in the proof page

`apps/admin/components/shipments/shipments-table.tsx`:

- L190–193 wrapper `<span onClick … onKeyDown … role="presentation">` around `CopyButton`
- L253 wrapper `<span onClick … onKeyDown …>` around `Dropdown.Root`

Both are `noStaticElementInteractions`. Fix by removing the wrapper handlers
and instead ignoring bubbled row clicks that originate inside an interactive
control, in the row `onClick`/`onKeyDown` already owned by `DataTable`'s caller
— or by moving the stopPropagation onto the real button. Choose the smallest
change that keeps "clicking copy / opening the actions menu does not open the
row".

Satisfies: AC-6 keyboard/roles half; `pnpm --filter=admin lint` gains no new
errors (92 pre-existing are out of scope).

### T4 — Green `check-types`

`pnpm --filter=admin check-types` currently fails on the corrupt generated
`.next/dev/types/routes.d.ts` (duplicated block, dangling `* @example` at L92).
The `next dev` process (PID 22796) rewrites it, so:

1. Stop the admin dev server.
2. Delete `apps/admin/.next` (regenerates on next build/dev).
3. Run `pnpm --filter=admin check-types` → expect green.
4. Restart `pnpm dev`.

No source change.

### T5 — Pending production-blocker tasks 2–4

From `.planning/quick/261004-wf6-fix-production-blockers-inverted-error-t/261004-PLAN.md`
(task 1 — the inverted error ternary — already applied at `apps/api/src/index.ts:632`):

1. **Dockerfile** — add `RUN pnpm --filter=api build` so the API emits `dist/`
   before the runtime stage copies it.
2. **`.dockerignore`** — add `.env.production` and `.env.vercel`.
3. **CI** (`.github/workflows/ci.yml`) — node matrix `[18, 20, 22]` is invalid for
   Next 16 (needs ≥ 20.9); drop 18, and add a `pnpm build` step.

### T6 — Verify, tick, commit

- `pnpm --filter=@repo/ui check-types` and `pnpm --filter=@repo/ui lint` green
  (0 errors in `packages/ui`).
- `pnpm --filter=admin test` → 40/40.
- `pnpm --filter=admin check-types` green (T4).
- `node contrast-verify.cjs ../../packages/ui/src/tokens.css` → 0 failures.
- Run `/check verify UI foundation & tokens`.
- Tick feature 8's remaining boxes in `docs/scope/admin/scope.md`.
- Atomic commit(s) covering the uncommitted feature-8 work + this task.

## Out of scope

- The 92 pre-existing admin lint errors (verified identical on a clean tree).
- `@repo/ui` having no `build` script (expected — only `check-types`).
- Features 9, 10 and slices 1–7.

## Risks

- Deleting `apps/admin/.next` while `next dev` is watching may race — stop the
  process first.
- Contrast value changes shift light-theme placeholder/sidebar/secondary-button
  colours slightly. Each is verified numerically before the edit; the status
  badge and all soft status pairs are unchanged.
