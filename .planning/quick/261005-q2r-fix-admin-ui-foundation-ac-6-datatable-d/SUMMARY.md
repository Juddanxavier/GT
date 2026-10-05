# Summary: Quick Task 261005-q2r

**Quick ID:** 261005-q2r
**Date:** 2026-10-05
**Status:** complete — verified, boxes ticked, ready to commit
**Workflow:** quick

## What this task closed

Feature 8 (`UI foundation & tokens`) in `docs/scope/admin/scope.md`: the last
unticked sub-box, `Accessibility + light/dark pass across shared components
(AC-6)`, plus `Build it` and `Verify it`, and the three still-unapplied tasks
carried over from quick task `261004-wf6`.

Feature 8's box list now reads all ticked. The heading status is still
`in-progress` pending the engineer's `done` call (`/check verify` offers rather
than gates it, Alpha tier).

## Tasks

### T1 — Wire the `DataTable` density prop — done

`packages/ui/src/data-table.tsx`: `cellPadding` is now used at all four cell
sites (select-all `th`, header `th`, checkbox `td`, data `td`) instead of the
hardcoded `px-4 py-2`. The `role="status"` paragraph above the table was left
alone, as planned.

Runtime confirmation: choosing `compact` in the Table options dialog took cell
padding to `4px 16px`, `comfortable` back to `8px 16px`.

### T2 — WCAG AA contrast pass on `packages/ui/src/tokens.css` — done, scope widened

Plan said six pale-background tokens. The engineer was asked and chose
**"Fix all 14 now"**, so the light theme strong colours were darkened about one
step as well (accent, danger, success, warning, info, and the derived
`accent-hover` / `accent-active` / `accent-glow` / `mesh-1` / `focus` values).
That is a visible light mode shift: cyan, red, emerald and amber each read about
one step darker.

Final light values: `--accent #0d6e88`, `--accent-hover #0b657c`,
`--accent-active #094f5e`, `--accent-soft-foreground #0d6e88`,
`--accent-glow rgba(13,110,136,0.28)`, `--mesh-1 rgba(13,110,136,0.06)`,
`--focus #0d6e88`, `--sidebar-muted #a1a1aa`, `--muted-light #6b6b73`,
`--field-placeholder #71717a`, `--success #047857`, `--warning #b45309`,
`--danger #b91c1c`, `--info #0d6e88`.
Dark: `--muted-light #8a8a93`, `--field-placeholder #8b8b93`.

Two pairs needed a second look because HeroUI resolves them through oklab:
`--default-hover` becomes `#e9e9ea`, so the secondary button label needs
`#0d6e88` (4.80, pass) rather than `#0e7490` (4.42, fail); and `--danger` has to
be `#b91c1c` rather than `#dc2626` because danger hover lightens to `#c33e36`
and white on it is 5.17.

`contrast-verify.cjs` in this task dir is the gate. It now exits 0 with zero
primary failures and zero derived / non-text failures (accent panel 4.63, danger
panel 4.98, success and warning avatars 4.37 and 4.01 against a 3:1 bar,
secondary label 4.80, white on danger hover 5.17).

### T3 — Last two a11y lint errors in the proof page — done

`apps/admin/components/shipments/shipments-table.tsx`: both wrapper `<span
onClick/onKeyDown>` blocks were removed (the CopyButton span and the actions
Dropdown span, the latter re-indented). Row behaviour is now protected by a
shared guard in `packages/ui/src/data-table.tsx`: `isInsideControl` matches a
control selector, and `handleRowKeyDown` also ignores events whose target is not
the row itself. `Dropdown.Trigger` renders react-aria's native `<button>`, so
the selector covers it.

### T4 — Green `check-types` — resolved without the planned steps

The plan expected a stale `apps/admin/.next` to be deleted and the dev server
restarted. The generated `.next/dev/types/routes.d.ts` had already self healed
(86 lines, no dangling `@example`), so nothing was deleted and no server was
restarted. `pnpm --filter=admin check-types` and `pnpm --filter=@repo/ui
check-types` both exit 0.

### T5 — Pending production-blocker tasks 2–4 — done

- `Dockerfile:11` now runs `RUN pnpm --filter=api build` before the runtime stage.
- `.dockerignore` adds `.env.production` and `.env.vercel`.
- `.github/workflows/ci.yml` matrix is `[20, 22]` (Node 18 is below Next 16's
  floor) and gains a `Build` step running `pnpm build` before the tests.

`pnpm build` failed on the first run for a reason outside this plan:
`packages/typescript-config/base.json` sets `declaration: true` and
`nextjs.json` only added `noEmit`, so `tsc` still demanded a portable name for
every exported function's inferred return type. That surfaced as `TS2742` in
`apps/customer` and `apps/lanka-mahal` on
`components/sections/ship-smarter-cta.tsx`, files this task never touched (last
changed 2026-09-09). Fixed at the root by adding `"declaration": false` and
`"declarationMap": false` to `packages/typescript-config/nextjs.json` — a Next
app is not a library and never emits declarations. All three Next apps type check
clean after it, and `pnpm build` goes 4 of 4.

### T6 — Verify, tick, commit

Verification results (see the `/check verify` report for the runtime evidence):

| Gate | Result |
|---|---|
| `pnpm lint` (root, `biome lint apps/api/src packages`) | exit 0 |
| `pnpm --filter=@repo/ui lint` (`biome check src/`) | exit 0, 12 files |
| `pnpm check-types` | 4 of 4, exit 0 |
| `pnpm build` | 4 of 4, exit 0 |
| `pnpm --filter=admin test` | 5 files, 40 tests, exit 0 |
| `node contrast-verify.cjs` | exit 0, 0 failures |

Scope ticked: `Build it`, the AC-6 sub-box, and `Verify it` in
`docs/scope/admin/scope.md`. There is no `verify.md` beside
`docs/specs/admin/0001-ui-foundation-tokens`, so there were no step boxes to
tick; the spec `**Status**:` line still reads `In Progress`, left alone until the
engineer calls `done`.

## Deviations from PLAN.md

1. **T2 scope widened** from six tokens to all fourteen, on the engineer's
   explicit "Fix all 14 now".
2. **T4 needed none of its planned steps** — the generated type file had already
   healed.
3. **T5 grew by one fix** — the `nextjs.json` `declaration` correction, which was
   required for the new `pnpm build` CI step to pass at all.
4. **Line endings fixed during verification.** `packages/ui/src/` had nine files
   written with Windows line endings, which made the package's own
   `biome check src/` gate fail (it checks formatting, unlike root `pnpm lint`,
   which only lints, so CI stayed green either way). Pre-existing files in that
   directory are LF, and `status-config.ts` was LF at HEAD, so this restored the
   original convention. Converted: `data-table.tsx`, `empty-state.tsx`,
   `error-state.tsx`, `filter-bar.tsx`, `loading-state.tsx`, `page-header.tsx`,
   `status-badge.tsx`, `status-config.ts`, `tokens.css`. No behaviour changed;
   lint, types, tests and build were all re run afterwards.

## Carried forward for feature 9 (Accessibility pass)

- Advancing the shipments table from page 1 to page 2 was not exercised. The
  tenant the app pins a superadmin to holds 23 shipments and the smallest page
  size offered is 25, so page 1 always holds every row. Needs a tenant with 26
  or more shipments, or a page size option below 25.
- The off page selection live region (`role="status"` above the table) only
  renders when selected rows sit off the current page, so it was not observed at
  runtime — same data limitation.
- 92 pre-existing admin lint errors remain out of scope (verified identical on a
  clean tree).
