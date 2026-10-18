# Quick Task 261015-0mf: Graphite & Signal retheme of admin + close retheme task 14 — Context

**Gathered:** 2026-10-15
**Status:** Built and verified by tooling; the by eye visual pass is the one owed item.
**Supersedes:** the Octet "Data visualizations" palette direction (`#4bc58f` mint / `#f78555` coral). Octet is retired before any build; this document is the authority.

<domain>
## Task Boundary

Move the admin app off emerald-on-slate onto **Graphite & Signal**: a true neutral
graphite scale (no blue tint) with a single desaturated signal cyan-teal accent, flat
opaque surfaces (no card shadows, no accent glow, no frosted glass, no mesh gradient),
and an evolved shell (the rail stops being a dark slab, the topbar becomes an opaque
hairline bar, content gains a max width). Then complete the still-open spec `0001-a`
task 14 (visual pass) and update the stale scope checkbox at
`docs/scope/admin/scope.md:101`.

This is a **full visual redesign**, not a token-value swap: palette, surfaces, shell,
and typography all move. It is the fifth of the retheme family (cyan/zinc → emerald/slate
→ Octet (retired, unbuilt) → Graphite & Signal).

### Direction

| Axis | Before | After |
|---|---|---|
| Neutrals | slate blue gray (`#f1f5f9` / `#0c0f14`) | true neutral graphite (`#f5f5f5` / `#0d0d0d`) |
| Accent | emerald `#065f46` / `#34d399` | signal violet `#4f46e5` / `#a5b4fc` (final; the first cut was signal cyan-teal `#0e7490` / `#4dd4e8`, dropped when violet was picked) |
| Surfaces | frosted glass, `backdrop-filter`, layered shadows | opaque, hairline borders only |
| Page bg | `app-mesh-bg` radial gradients | flat solid canvas |
| Brand mark | `shadow-glow-accent` halo | no halo, flat accent square |
| Rail | dark slab always darker than canvas | matches surface tone, slimmer |
| Topbar | frosted `glass-topbar` | opaque hairline bar |
| Type | Geist / Geist Mono | IBM Plex Sans / IBM Plex Mono, tabular figures |

### Accent rule

Violet is the accent and is reserved for actions, selection, active nav, and focus. The
accent owns violet, so `--info` stays cyan (`#0e7490` / `#22d3ee`) — it moved off violet
once the accent claimed it. `--secondary` (teal) stays the one adjacent hue and keeps its
`available_for_pickup` meaning.

Two amendments landed after the first plan draft, both from user review:

- **Radius tightened.** Cards and panels `rounded-xl` → `rounded-md` (`0.75rem` → `0.375rem`),
  modals `rounded-2xl` → `rounded-lg`, `--radius` and `--field-radius` `0.5rem` → `0.25rem`.
- **The shell gained a theme-switch animation.** `lib/use-theme.ts` now wraps the
  `data-theme` swap in the View Transitions API (`::view-transition-old/new(root)`), with a
  reduced-motion collapse. The topbar was also redesigned as a flat hairline instrument bar:
  square `size-8` icon controls and hairline cluster dividers.

</domain>

<decisions>
## Implementation Decisions

### Scope — full visual redesign (user chose over palette-only)
- Palette, surfaces, shell, and type all move. Removing shadows and glow is required;
  removing frosted blur and the mesh gradient is required.
- Both themes are kept, dark-first. The `data-theme` mechanism and `use-theme.ts` are
  untouched.

### Where values live — the shared token sheet, not an override block
- Values go in `packages/ui/src/tokens.css`. It is imported by exactly one app
  (`apps/admin/app/globals.css`); the portals never import it, so blast radius is already
  admin-only. `contrast-verify.cjs` parses its theme blocks directly, so an override block
  in the app would break the gate.
- `packages/ui/src/status-config.ts` uses only `var()` references and needs no edit.

### Shell — evolve, not replace (user chose over keep / top-nav rewrite)
- Keep the left rail and the frosted-free topbar structure. The rail is slimmed and its
  background matches the surface family instead of a dark slab. Long lists get a content
  max width so they stop stretching on ultrawide.

### Typography
- Geist / Geist Mono are replaced by IBM Plex Sans / IBM Plex Mono. Numbers in tables,
  KPIs, and tracking/label/invoice codes use tabular figures. `tracking-tight` heading
  work from task 11 is preserved.

### Fold-in — retheme task 14 is part of this task
- Spec `docs/specs/admin/0001-ui-foundation-tokens/0001-a-shared-tokens-and-designmd.md`
  task 14 is marked **partly built**: lint/type-check/build clean, but the by-eye visual
  pass is still owed.
- That visual pass runs **against the new palette**, on dashboard, shipments list, and
  shipment detail, in both themes.
- The stale scope checkbox at `docs/scope/admin/scope.md:101` (tasks 11 to 14) gets
  ticked, and the task-14 line in spec 0001-a gets its annotation updated.

### Claude's Discretion
- Exact hex derivation for every token the direction does not name (status hues, dark
  pairs, rgba triplets).
- Order of file edits and how verification is staged.

</decisions>

<specifics>
## Specific Ideas

- The contrast verifier `.planning/quick/261005-q2r-fix-admin-ui-foundation-ac-6-datatable-d/contrast-verify.cjs`
  is the gate: it must be updated to the new hexes and re-run with **zero failures in
  both themes** (text and non-text/derived sections) before this is called done.
- The chart ramp collapses onto six literal hexes, one meaning per hex, written as literals
  (Tailwind 4 resolves `emerald-500` etc. to different hexes than the ramp).
- Deliberate survivors, do not "fix": rate-cards `#E8621A` orange and its
  `bg-green-100 text-green-800` / `bg-red-100 text-red-800` chips (portal brand), and the
  audit timeline's non-accent entity colors.

</specifics>

<canonical_refs>
- Spec (task 14 partly built): `docs/specs/admin/0001-ui-foundation-tokens/0001-a-shared-tokens-and-designmd.md`
- Scope row 19 (Admin retheme, in-progress): `docs/scope/admin/scope.md:93`
- Token sheet: `packages/ui/src/tokens.css`
- Design contract: `apps/admin/DESIGN.md`
- Contrast gate: `.planning/quick/261005-q2r-fix-admin-ui-foundation-ac-6-datatable-d/contrast-verify.cjs`
</canonical_refs>
