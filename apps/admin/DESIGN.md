# Admin App — Design System (Raycast-inspired, dark-first)

Reference: the shipped admin console. Dense operations tool, glass surfaces, emerald accent over blue gray neutrals, dark mode first with full light support. This is the design contract for `apps/admin`. Token values live in `packages/ui/src/tokens.css`; this file holds direction and rules. If values and prose disagree, the CSS wins.

## Principles
1. **Density without noise** — many records per screen, calm chrome, content first.
2. **Glass over flat** — frosted panels, hairline borders, soft shadows; depth from blur and light.
3. **One accent, used with intent** — emerald for actions, selection, focus, and active nav only.
4. **Quiet motion** — short ease-out transitions for color, border, shadow, and opacity; honor reduced motion.

## Color (from shared tokens — do not hardcode hex in components)
| Token | Value (light) | Use |
| --- | --- | --- |
| `--background` | `#f1f5f9` | page canvas |
| `--surface` | `rgba(255,255,255,0.92)` | frosted panels |
| `--foreground` | `#0f172a` | headings, body |
| `--muted` | `#475569` | secondary text |
| `--border` | `#e2e8f0` | hairlines, dividers |
| `--accent` | `#065f46` | actions, selection, focus |
| `--sidebar` | `#0f172a` | dark rail in both themes |
| `--sidebar-active-bg` / `--fg` | `#064e3b` / `#6ee7b7` | active nav item |

Both themes are tinted blue gray, never zinc. Dark moves to canvas `#0c0f14`, foreground `#f8fafc`, muted `#94a3b8`, translucent surfaces and borders built from `rgba(148, 163, 184, ...)`, rail `#0a0d12`, and lifts the accent to `#34d399` with `#052e1b` as its foreground. Always use semantic classes or `var()` references: `bg-background`, `text-foreground`, `text-muted`, `border-border`, `bg-[var(--glass-bg)]`.

### Status colors (shared config is the source)
`@repo/ui/status-config.ts` maps each shipment status to a semantic color and a token pair. Never invent a status color in a page. The badge always shows label text plus color — color alone is not enough.

- `pending` and `info_received` are `warning`; `exception` and `failed_attempt` are `danger`; `in_transit` and `out_for_delivery` are `transit`. Statuses share colors on purpose: it is what makes them read as groups.
- **`transit` is its own blue pair**, so an in transit badge can never be mistaken for the accent: light `#2563eb` strong / `#eff6ff` soft / `#1d4ed8` soft foreground; dark `#60a5fa` strong / `rgba(96,165,250,0.12)` soft / `#93c5fd` soft foreground.
- No shipment status resolves to `primary` or `accent`. The accent and `--success` are both emerald, one scale step apart in light and identical in dark, so an accent badge and a delivered badge look alike; the label carries the distinction.
- Cyan survives only as `--info` (quotation `sent`). `--secondary` stays teal.

## Chart palette
Every dashboard, reports, and KPI series color comes from this one six step ramp. Write ramp colors as literal hex (`bg-[#f43f5e]`), never as a Tailwind color class: this app runs Tailwind 4, where `emerald-500`, `blue-500` and the rest resolve to different hexes than the ramp.

| Step | Name | Hex | Meaning |
| --- | --- | --- | --- |
| 1 | emerald | `#10b981` | success outcomes: delivered, paid, accepted |
| 2 | blue | `#3b82f6` | totals and outbound: `total`, `out_for_delivery` |
| 3 | violet | `#8b5cf6` | in transit: `in_transit` |
| 4 | amber | `#f59e0b` | waiting and warnings: pending, unpaid, overdue, revenue, converted |
| 5 | rose | `#f43f5e` | problems: exceptions, rejected, failed attempt, notification |
| 6 | slate | `#94a3b8` | unknown and inactive: not tracked, expired, other |

`available_for_pickup` is the one step outside the ramp, on the `--secondary` teal. The audit timeline's entity colors are exempt from the ramp: they name entities rather than values.

## Typography
- Font: `Geist` via the Next font loader, variable `--font-geist`, applied globally.
- Mono: `Geist Mono`, variable `--font-geist-mono`, for tracking numbers, label codes, invoice numbers, quote numbers, and ids. Never fall back to `ui-monospace`, which renders differently on every machine.
- Scale: page title `text-lg font-bold tracking-tight`, section `text-base font-semibold`, body `text-sm`, meta `text-xs text-muted`.
- Uppercase micro labels (`text-[0.625rem] font-semibold tracking-wider`) for ops section headers only.
- **Heading tracking:** every `h1`, `h2`, and `h3` carries `tracking-tight`, because Geist is tighter than Inter and headings want to be tighter still. Excluded: headings that already carry a tracking class, uppercase micro labels (`tracking-wider` / `tracking-widest`), monospaced `ops-mono` headings, and the print label document. Body copy, paragraphs, and spans keep default tracking.

## Spacing & shape
- 8px baseline grid; Tailwind steps in multiples of 2.
- Radius: `0.75rem` panels (`.content-panel`), `0.5rem` inputs (`.input-surface`), full pills/badges.
- Borders: 1px hairlines via tokens, never raw gray.
- Page padding: `p-4 sm:p-6 lg:p-8`; tables scroll horizontally on small screens, never clip.
- Table density via `.table-density-compact` / `.table-density-comfortable`.

## Components
### PageHeader
- Title (h1), optional description, optional breadcrumb slot, actions slot. One per page.

### FilterBar
- Generic shell: filter controls as children plus an optional clear action. Not tied to any domain.

### DataTable
- Server-driven, fully controlled (sort, page, visibility, selection in; callbacks out). Slots for empty, error, loading. Sort headers announce via `aria-sort`; selection via checkboxes with labels; resize by drag with double-click reset.

### StatusBadge
- Pill with label text plus a status dot, colored from the shared token pairs. Reads `@repo/ui/status-config.ts`.

### Empty / Error / Loading
- `EmptyState`: message plus one optional action. `ErrorState`: message plus optional retry. `LoadingState`: skeleton shaped like the table.

## Accessibility

Feature 9 set the bar for everything built after it. The spec is `docs/specs/admin/0002-accessibility-pass.md`; this section is the durable version of the rules plus the checklist the verify walkthrough runs.

### Rules

**Colour is never the only signal.** `@repo/ui/status-badge` prints its label next to the dot, `kpi-card` shows a trend glyph and a percentage, `dashboard/status-breakdown` prints name and value as text, every dashboard sparkline shows a text range beside the chart (closes WR-19), and the notifications trigger's accessible name carries the unread count (`Notifications, N unread`). A new indicator that only changes colour is not done.

**One `h1` per route.** `packages/ui/src/page-header.tsx` owns it. `apps/admin/components/page-header.tsx` only maps the admin props (`subtitle`, `icon`, `action`) onto it and emits no heading of its own. Pages without a PageHeader (detail pages, login, unauthorized, error and not-found) declare their own single `h1`. Nothing may be the first heading on a page while sitting below `h1`; a heading that is only supporting copy (the auth panel tagline) is a `p`, not an `h2`.

**Landmarks are named.** `main#main-content` is `Main content`, the sidebar is `Main navigation`, the profile rail is `Profile sections`, breadcrumbs are `Breadcrumb`. Add a label to any new `nav`.

**Dialogs name themselves and hold focus.** Prefer a `Modal.Heading` inside `Modal.Header`; where the header is built by hand, put `aria-label` on `Modal.Dialog`. HeroUI's Modal already traps focus, closes on Escape, and returns focus to the trigger, so do not add those by hand. Every confirmation goes through `packages/ui/src/confirm-dialog.tsx` (cancel first for initial focus, `isPending` blocks dismissal). `window.confirm` and hand drawn overlay dialogs are gone; do not reintroduce them.

**Toasts announce once.** Each toast item carries `role="alert"`, the container stays `aria-live="polite"`, the dismiss control is a real button with `type="button"` and `aria-label="Dismiss"`. Never put `role="alert"` on the container: it would ask for attention and patience on the same node.

**Keyboard.** Every control is a button, link, or field, and a button that does not submit says `type="button"`. Hand written disclosures carry `aria-expanded`: the shipment details expander, the audit timeline group headers, and the sidebar collapse and menu buttons. HeroUI and react-aria emit `aria-expanded` themselves on dropdowns, selects, and menus: never hand add it there, and confirm on the rendered DOM.

**Typeaheads** (`assigned-to.tsx`, `customer-assigner.tsx`) use `role="combobox"` on the input with `aria-expanded` and `aria-controls`, and `role="listbox"` with `role="option"` rows. They do not implement `aria-activedescendant` arrow navigation: options are real buttons, so Tab walks them.

**Tables.** Accessible name follows `<Page name> table` (`Branches table`, `Customers table`, `Shipments table`). react-aria renders the `<th>` itself and filters `scope` out of props, so list pages call `useTableHeaderScope()` from `components/use-table-header-scope.ts`, which stamps `scope="col"` after every render. Call it on any new HeroUI table page. The shared `DataTable` emits `scope`, `aria-sort`, and its selection labels in its own markup and needs no call. Pagination shows `Prev`/`Next` text and the page size select says `aria-label="Rows per page"`.

**Decorative graphics.** Any svg that only sits beside text gets `aria-hidden="true" focusable="false"`. A meaningful svg gets a `<title>`.

**Motion.** The `prefers-reduced-motion: reduce` block at the bottom of `app/globals.css` collapses animation and transition durations for the whole admin app: HeroUI's animations, the dashboard skeleton, the `@repo/ui` `loading-state` shimmer, and `animate-spin` loaders. It is admin only; the portals keep their own behaviour.

**Focus on navigation.** `app/(dashboard)/layout.tsx` focuses `main#main-content` (`tabIndex={-1}`) on every pathname change except the first render, so the new page is announced. The skip link lands on the same element and becomes visible through the shared `:focus-visible` ring in `@repo/ui/tokens.css`.

**Search palette.** `components/search-dialog.tsx` is built on HeroUI ComboBox: the input gets `role="combobox"`, `aria-expanded`, and `aria-activedescendant` from react-aria, rows are `listbox`/`option`, and a `role="status"` region announces the result count. Feature 15 (global search) must keep these semantics.

### The gate

- `pnpm lint` runs `biome lint apps/api/src packages` and then `pnpm --filter admin lint`. The a11y group is at `error` everywhere, and both runs must report zero errors.
- The root script is not `turbo run lint` even though AC-10 asked for it: the portals' `next lint` scripts are broken on Next 16, so a turbo-wide lint run fails on work this feature does not own. The admin app is covered explicitly instead. If the portals are fixed, move the root script to `turbo run lint`.
- Baseline, `apps/admin/**` only, all at `warn`: `useHookAtTopLevel`, `noUnusedVariables`, `noArrayIndexKey`, `useIterableCallbackReturn`, `useTemplate`. These are ~119 pre-existing warnings that this feature did not create. The a11y group is not downgraded anywhere, and warnings in other groups are still debt to burn down.
- `biome.json` is strict JSON. **Never add a comment to it.** A single `// probe` line makes Biome silently ignore the entire config: the run then reports 158 files and 22 errors as if they were new, or worse, reports nothing and exits 0. Rationale belongs here, not in the config.
- `css.parser.tailwindDirectives` is on so Biome can parse `app/globals.css`.

### Verify checklist

| AC | Walkthrough |
|----|-------------|
| AC-1 | Status badge shows a label, KPI cards show a glyph plus a percentage, status breakdown prints names and values, each dashboard sparkline has a text range beside it, the notifications trigger's name contains the unread count. Spot check a table and a chart with a colour filter (or grayscale) and confirm the meaning survives. |
| AC-2 | Tab into every button that opens a dialog: focus lands inside, Tab cycles inside, Escape closes and focus returns to the trigger. Every dialog announces a name. No `window.confirm` in the bundle and no bare `fixed inset-0 z-50` overlay in source. |
| AC-3 | Trigger a success and an error toast. With a screen reader or the a11y tree, the item is announced once, the container is polite, and the dismiss button reads `Dismiss`. |
| AC-4 | Keyboard only pass over the shell: sidebar links, header buttons, dropdowns, filter selects. Active sidebar link reports `aria-current="page"`, the sidebar buttons report `aria-expanded`, the mobile backdrop is a button named `Close navigation menu`, every icon only button has a name, and no element has an `onClick` without a role. |
| AC-5 | Press Cmd/Ctrl+K: the input reports `combobox` with `aria-expanded`, rows report `option`, arrow keys and mouse highlight the same row, Enter opens it, and the result count is announced politely. |
| AC-6 | Each list page's table reports its `<Page name> table` name, header cells carry `scope="col"` on the rendered DOM, pagination reads `Prev`/`Next`, and rows per page says `Rows per page`. |
| AC-7 | Exactly one `h1` per route (detail, login, unauthorized, error, not-found included), no page starts below `h1`, the skip link appears on focus and jumps to `main#main-content`, and `nav` and `main` report names. |
| AC-8 | Navigate between routes: focus lands on `main#main-content` every time except the first render, and the page heading is announced. |
| AC-9 | Enable reduce motion in the OS, reload: no shimmer, no spinner rotation, no modal or dropdown animation, no skeleton sweep. |
| AC-10 | `pnpm lint` exits 0 with zero a11y errors in `apps/admin` and `packages/ui`; `pnpm --filter admin check-types` and `pnpm --filter @repo/ui check-types` pass; this section and its checklist exist. |

## Do / Don't
- DO read every color from a token; DON'T paste hex in a component (the chart ramp above is the one exception, written as literals).
- DO pick chart colors from the six step ramp; DON'T introduce a seventh hue for a new series.
- DO keep dark and light equal; DON'T ship a dark-only component.
- DO give every status a label or icon; DON'T rely on color alone.
- DO put a new status in the shared config plus `@repo/types/status`; DON'T add a local status map.
- DO use the shared table for lists; DON'T copy table markup page to page.
- DO keep `@repo/ui` free of API calls; DON'T import app queries there.
- DO give headings `tracking-tight`; DON'T tighten body copy.
- DO keep interactive elements keyboard reachable with a visible focus ring; DON'T leave focus to browser default.

## Intentional visual changes (recorded per spec 0001)
- Accent moved from cyan `#0d6e88` / `#22d3ee` to emerald `#065f46` / `#34d399`.
- Both neutrals moved from zinc to slate blue gray (`#f1f5f9` light, `#0c0f14` dark).
- `in_transit` and `out_for_delivery` moved from `primary` to the new `transit` pair.
- Charts collapsed onto one six step ramp; the reports shipment rows now render the shared `StatusBadge` instead of a local map.
- Inter replaced by Geist with Geist Mono.
