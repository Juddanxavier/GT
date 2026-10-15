# Quick Task 261015-0mf: Full Octet palette retheme of admin + close retheme task 14 — Context

**Gathered:** 2026-10-15
**Status:** Ready for planning

<domain>
## Task Boundary

Replace the admin app's emerald-on-slate token values with the Octet "Data visualizations"
palette (https://octet.design/colors/palette/data-visualizations-color-palette-1731329696/),
as a **full retheme replacement** — not a charts-only swap. Then complete the still-open
spec `0001-a` task 14 (visual pass) and update the stale scope checkbox at
`docs/scope/admin/scope.md:101`.

### The palette (6 hexes, from the page's meta description — the page is client-rendered)

| Hex | Suggested role |
|---|---|
| `#fdfdfe` | near-white canvas |
| `#e9ecf3` | light blue-gray surface |
| `#dad1d2` | warm gray (muted) |
| `#a2b1ba` | slate gray (borders / secondary text) |
| `#4bc58f` | soft mint green (accent) |
| `#f78555` | coral (secondary / alert) |

</domain>

<decisions>
## Implementation Decisions

### Scope — full replacement (user chose over charts-only and accent+charts)
- The whole token sheet in `packages/ui/src/tokens.css` moves to this palette:
  accent, canvases, neutrals, secondary, warning/coral. Not just the chart ramp.
- The emerald family (`#065f46`, `#34d399`, `#10b981` etc.) is retired from the
  accent role. Where mint `#4bc58f` cannot carry a role on its own (a light-theme
  accent needs ~4.5:1 against white text), **derive** compliant variants from it —
  darken for light-theme solid accents, keep `#4bc58f` family for dark theme.
- Coral `#f78555` becomes the secondary / warning-family hue.
- Slate `#a2b1ba` drives borders and muted text; `#e9ecf3` / `#fdfdfe` drive
  light-theme canvases and surfaces.
- Roles the palette does not name (danger red, info, transit blue, success green)
  must still exist — derive them to sit with the palette rather than dropping them.

### Fold-in — retheme task 14 is part of this task (user chose to fold)
- Spec `docs/specs/admin/0001-ui-foundation-tokens/0001-a-shared-tokens-and-designmd.md`
  task 14 is marked **partly built**: lint/type-check/build clean, but
  *"the by eye visual pass is still owed"*.
- That visual pass runs **against the new palette**, on dashboard, shipments list,
  and shipment detail, in both themes.
- The stale scope checkbox at `docs/scope/admin/scope.md:101` (tasks 11 to 14)
  gets ticked, and the task-14 line in spec 0001-a gets its annotation updated
  to record the palette swap + visual pass.

### Claude's Discretion
- Exact hex derivation for every token the 6 palette colors do not name.
- Order of file edits and how verification is staged.

</decisions>

<specifics>
## Specific Ideas

- Keep Geist / Geist Mono and the `tracking-tight` heading work from tasks 8 and 11 —
  the palette changes colors, not typography.
- The contrast verifier `.planning/quick/261005-q2r-fix-admin-ui-foundation-ac-6-datatable-d/contrast-verify.cjs`
  is the gate: it must be **updated to the new hexes and re-run with zero failures
  in both themes** before this is called done. It reads its values from the tokens file.

</specifics>

<canonical_refs>
## Canonical References

- Spec (task 14 partly built): `docs/specs/admin/0001-ui-foundation-tokens/0001-a-shared-tokens-and-designmd.md`
- Scope row 19 (Admin retheme, in-progress): `docs/scope/admin/scope.md:93`
- Token sheet: `packages/ui/src/tokens.css`
- Design contract: `apps/admin/DESIGN.md`
- Contrast gate: `.planning/quick/261005-q2r-fix-admin-ui-foundation-ac-6-datatable-d/contrast-verify.cjs`
- Palette source: https://octet.design/colors/palette/data-visualizations-color-palette-1731329696/

</canonical_refs>
