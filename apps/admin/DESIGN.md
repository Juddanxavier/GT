# Admin App — Design System (Lime & Paper, light-first)

Reference: the shipped admin console. Soft, light fintech UI, white cards on a warm off-white canvas lifted by a whisper of shadow, and one lime signal accent used with intent. Light is the default; dark is a tuned counterpart. This is the design contract for `apps/admin`. Token values live in `packages/ui/src/tokens.css`; this file holds direction and rules. If values and prose disagree, the CSS wins.

## Principles
1. **Density without noise** — many records per screen, calm chrome, content first.
2. **Soft depth over flat** — opaque white cards lift on a small shadow and a hairline. No glass, no glow, no gradient mesh.
3. **One accent, used with intent** — a single lime signal for actions, selection, focus, and active nav only. Solid lime fill takes ink text; lime never carries small text on a light surface (see below).
4. **Quiet motion** — 150ms ease-out transitions for color, border, shadow, and opacity, plus a single cross-fade when the theme flips. Honor reduced motion.

## Color (from shared tokens — do not hardcode hex in components)
| Token | Value (light) | Value (dark) | Use |
| --- | --- | --- | --- |
| `--background` | `#f5f5f5` | `#0d0d0d` | page canvas |
| `--page` | `#ebebeb` | `#0a0a0a` | outer shell tone behind the frame |
| `--content1` / `--surface` | `#ffffff` | `#161616` | panels, cards, popovers |
| `--content2` | `#fafafa` | `#1a1a1a` | row / surface hover |
| `--foreground` | `#111111` | `#fafafa` | headings, body |
| `--muted` | `#5f5f5f` | `#a3a3a3` | secondary text |
| `--muted-light` | `#6f6f6f` | `#8f8f8f` | subtitles, meta |
| `--divider` | `rgba(0,0,0,0.06)` | `rgba(250,250,250,0.08)` | hairlines, dividers |
| `--accent` | `#8dc63f` | `#a2d145` | lime fills, focus, selection |
| `--accent-ink` | `#3f6417` | `#c9e88a` | **accent as text** on light surfaces |
| `--accent-foreground` | `#111111` | `#111111` | ink on a solid lime fill |
| `--secondary` | `#111111` | `#fafafa` | black CTA (white label) |
| `--sidebar` | `#f5f5f5` | `#111111` | rail, same tone as the canvas |
| `--sidebar-active-bg` / `--fg` | `#f0f0f0` / `#111111` | `#24281a` / `#c9e88a` | active nav item |
| `--radius-sm` / `--md` / `--lg` | `10px` / `12px` / `16px` | same | controls / fields / cards |

Light is the default theme; the canvas is a warm off-white and every surface is a white sheet that lifts on a small shadow and a 6% hairline. Dark moves to canvas `#0d0d0d`, surface `#161616`, rail `#111111`, and lifts the accent to `#a2d145`. Always use semantic classes or `var()` references: `bg-background`, `text-foreground`, `text-muted`, `border-border`, `bg-content1`.

**Two lime roles.** `--accent` is a *fill*: solid lime buttons/badges take `--accent-foreground` ink, and the `--accent-soft` chip is the light tint. Lime as *text* on a white/off-white surface fails AA, so anything painting the accent as a foreground — links, icons, active labels, the `text-accent` / `bg-accent/10` utilities — resolves to `--accent-ink` (a deep olive-green). The Tailwind map does this for you: `--color-accent` in `app/globals.css` is `var(--accent-ink)`, while `bg-primary` stays lime. HeroUI components read `--accent` directly and are unaffected.

`--surface-shadow` and `--overlay-shadow` carry the soft depth (`0 1px 2px` / `0 12px 40px` at low alpha); `--field-shadow` stays inert so HeroUI fields sit flat.


### Status colors (shared config is the source)
`@repo/ui/status-config.ts` maps each shipment status to a semantic color and a token pair. Never invent a status color in a page. The badge always shows label text plus color — color alone is not enough.

- `pending` and `info_received` are `warning`; `exception` and `failed_attempt` are `danger`; `in_transit` and `out_for_delivery` are `transit`. Statuses share colors on purpose: it is what makes them read as groups.
- **`transit` is its own blue pair**, so an in transit badge can never be mistaken for the lime accent: light `#2f66da` strong / `#e7eefc` soft / `#294f9e` soft foreground; dark `#60a5fa` strong / `rgba(96,165,250,0.14)` soft / `#93c5fd` soft foreground.
- No shipment status resolves to `primary` or `accent`: a status that borrows the action color stops meaning anything.
- `--info` is a distinct blue (quotation `sent`): light `#3a6bd6`, dark `#60a5fa`. `--secondary` is the black CTA tone: light `#111111`, dark `#fafafa`.
- **Status colors are fills; status text is the soft foreground.** The strong value (`--success #7cb342`, `--warning #f59e42`, `--danger #d63b40`) backs bars, dots, and solid chips (with `--*-foreground` text). Anywhere a status color is painted as *text* — `Badge` label, an inline `Paid` / error line, an icon on a `bg-<x>/10` panel — use the `--<x>-soft-foreground` token (`text-success-soft-foreground`, …). The light fills do not meet AA as small text on white.


## Chart palette
Every dashboard, reports, and KPI series color comes from this one seven step lime-and-warm ramp. Write ramp colors as literal hex (`bg-[#7CB342]`), never as a Tailwind color class: this app runs Tailwind 4, where `lime-500`, `orange-400` and the rest may resolve to different hexes than the ramp.

| Step | Name | Hex | Meaning |
| --- | --- | --- | --- |
| 1 | lime | `#8DC63F` | the accent: totals and headline series |
| 2 | olive | `#A2D145` | in transit |
| 3 | green | `#7CB342` | success outcomes: delivered, paid |
| 4 | yellow | `#F6F23F` | brand support, chart accents |
| 5 | orange | `#FBA95B` | out for delivery, brand support |
| 6 | amber | `#F59E42` | waiting and warnings: pending, overdue |
| 7 | red | `#E5484D` | problems: exceptions, failed attempt |

Inactive progress tracks are `#F0F0F0`; progress fills use `.stripe-lime`. The trend chart's bars are solid lime (`--accent` → `--accent-hover`) with a value printed above each, so a bar never waits for a hover to show either its colour or its number. Gridlines are light, axis labels are `#B0B0B0`.

Ramp values are declared once in `components/dashboard/kpi-colors.ts` (`KPI_COLORS`) and string-referenced elsewhere; `app/(dashboard)/reports/page.tsx` carries a matching literal map because it writes Tailwind arbitrary-value classes. Keep the two in step.

`available_for_pickup` is the one step outside the ramp, on the `--secondary` tone. The audit timeline's entity colors are exempt from the ramp: they name entities rather than values. So is the rate-cards workspace, which keeps its own orange accent across its stepper and mode toggles.

## Typography
- Font: `Plus Jakarta Sans` via the Next font loader, variable `--font-jakarta`, applied globally through `--font-sans`.
- Mono: `IBM Plex Mono`, variable `--font-plex-mono`, for tracking numbers, label codes, invoice numbers, quote numbers, and ids. Never fall back to `ui-monospace`, which renders differently on every machine.
- Scale: page title `text-lg font-bold tracking-tight`, section `text-base font-semibold`, body `text-sm`, meta `text-xs text-muted`.
- KPI numbers: 32–36px, weight 500, `tracking-tight`; card titles 16–18px weight 500; subtitles 11–12px muted.
- Uppercase micro labels (`text-[0.625rem] font-semibold tracking-wider`) for ops section headers only.
- **Tabular figures on data.** `app/globals.css` applies `font-variant-numeric: tabular-nums` to `.tabular-nums`, `.table__cell`, and `.ops-mono`, so numbers in tables, KPIs, and codes never jitter as they update.
- **Heading tracking:** every `h1`, `h2`, and `h3` carries `tracking-tight`. Excluded: headings that already carry a tracking class, uppercase micro labels (`tracking-wider` / `tracking-widest`), monospaced `ops-mono` headings, and the print label document. Body copy, paragraphs, and spans keep default tracking.

## Spacing & shape
- 8px baseline grid; Tailwind steps in multiples of 2.
- Radius: `16px` (`rounded-lg`) cards and panels (`.content-panel`), `12px` (`rounded-md`) inputs, fields, and menu items (`.input-surface`), `10px` (`rounded-sm`) small controls, `28px` the shell frame (`.shell-frame`), full pills and badges.
- Borders: 1px hairlines via tokens, never raw gray. The neutral hairline is ink at 6% alpha (`--border`, `--divider`, `--sidebar-border`), soft enough to divide without drawing the eye; `--border-hover` at 12% is the only step up. `--field-border` stays opaque (`#eeeeee`) on purpose, because an input edge is an affordance rather than a divider.
- Depth: cards carry `--surface-shadow` (`0 1px 2px rgba(0,0,0,0.04)`) and no border; overlays carry `--overlay-shadow`. Depth is a whisper, not a look.
- Page padding: `p-5 sm:p-7 lg:p-10`; tables scroll horizontally on small screens, never clip.
- Page rhythm: stacked page panels sit on `space-y-8`; the dashboard, which carries its own internal grouping, sits on `space-y-7`.
- Table density via `.table-density-compact` / `.table-density-comfortable` (`comfortable`, the default, is `0.875rem` cell padding).

## Shell
- The page sits on `bg-page`; one large `rounded-[28px]` `bg-background` frame carries the whole app on `--shadow-page`, with comfortable desktop margin and full-bleed on mobile.
- Fixed rail, sticky topbar, scrollable content column capped at `max-w-7xl`.
- Rail `w-[190px]` expanded / `w-16` collapsed, `bg-sidebar` (same tone as the canvas), hairline right border, brand row `h-16` to align with the topbar. Nav items are `h-10` on a `p-3` rail gutter; the active item is a `bg-default-100` pill with a 2px `bg-foreground` bar.
- Topbar `h-16`, opaque canvas tone. The search affordance is a borderless white `rounded-xl` field; the icon controls are square white bordered `rounded-xl` buttons; the account is a white user chip with the email beneath the name.
- `--app-header-height` (`4rem`) is the single source for the topbar height; `.sticky-below-header` offsets stickies from it.

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

### ShipmentTicket
- The shipment as a waybill: identity and journey on the body, the identifiers on a tear-off stub, cut along the right edge — a vertical dashed rule with a notch at each end. **No frame**: a waybill is paper, so the sheet, the cut, and the notches carry the shape, and a border would only box it in. Below `sm` the halves stack and the cut turns horizontal to match. The journey is centred in the body rather than pinned under the tracking number: the stub is the taller half on a wide screen, and centring spends that height instead of leaving a hole under the number. The barcode is a deterministic decorative mark derived from the tracking number (`aria-hidden`, prints no information of its own) with the value as text beneath it.

### KPI card

- `apps/admin/components/kpi-card.tsx` is the one KPI tile grammar for the whole admin surface: the dashboards, the shipments list (`components/shipments/shipments-kpi-row.tsx`), the invoices list, and the reports page all render through it. There is no second card component.
- One tile owns label, number, trend, chart, spacing, hover, focus, and active state, so the rows cannot drift apart again. The tile is `content-panel` with a `p-5` body; it is not a bordered box and does not add glass or blur.
- **Bento board** (quick 261017-e9u). Every KPI row is a `BentoBoard` (`components/bento.tsx`): two columns below `lg`, four at `lg`, with `minmax(156px, auto)` rows that grow to fit. Pass `columns={3}` for a single three-up strip (one column below `md`, three at `md`); the media-qualified span classes only apply at `lg`, so a three-column board is given `base` tiles. Tiles carry a `size` — `base` (1×1), `wide` (2×1), `tall` (1×2), `feature` (2×2) — so the board is a mosaic, not a uniform grid. Tile order packs the mosaic, so callers list children in the order they should fill.
- The two dashboards use the "Column" board: the headline metric takes the 2×2 `feature` square, the middle column carries the flow metrics, and the status rail runs `tall` on the right. `components/dashboard/status-donut.tsx` renders the segmented ring plus legend (it replaced the earlier stacked bar panel); `BreakdownList` keeps its own card but takes a `limit` and span classes, so By Carrier / By Branch sit as tiles.
- List rows use `bentoRowSpans(count)` so a uniform row always fills its grid. The shipments filter strip is the exception: a fixed `columns={3}` board of Total / In Transit / Delivered, three equal tiles, where the active filter is marked by tone and `aria-pressed` rather than by growing a tile.
- **Signal band + wash.** A 5px band pins the metric's ramp colour to the tile's top edge, and the body carries a soft `color-mix` wash of the same colour; both are decorative (`aria-hidden`). This is the one place the KPI section bends the app's no-gradient rule — deliberately, and only here.
- Anatomy, top to bottom: a semibold near-foreground label with the parcel `image` or a tinted lucide `icon` badge leading it and the trend pill trailing; the value (`text-[38px]`, `text-[54px]` on `feature`); an optional muted sublabel; and, when a series carries signal, a chart block opened by a `border-divider` hairline. The pill is the trend signal's home — a glyph plus a percentage on `bg-success/10` / `bg-danger/10`, or a neutral `bg-default-100` for an unknown or flat change.
- A `feature` tile always draws the large gridlined `AreaChart` with its range/peak caption, regardless of `chart`; every other size draws its `line` / `bars` / `donut` `MiniChart`.
- The variant is data, not a fork: a parcel `image` under `public/images/kpi/` (dashboard tiles) or a tinted lucide `icon` badge (list pages), and a `line` / `bars` / `donut` chart. The shipments and invoices rows draw their `line` series, since those sparklines are already computed from real trend data.
- Interaction is a real element, never an `onClick` on the panel: `href` renders `next/link` (with `aria-current="page"` when `isActive`), `onPress` renders a `<button type="button">` carrying `aria-pressed`, and neither renders a plain `div`.
- The trend signal is never colour alone: a trend glyph plus a percentage (`trendValue`), `—` when the change is unknown, and `invertTrend` for counts where a rise is bad (exceptions, overdue) so the tone flips without flipping the arrow.
- A count of zero or an all-zero series drops the chart and tones the delta neutral (`hasSeriesSignal` in `components/dashboard/utils.ts`); no flat or padding-derived placeholder sparkline is drawn. Every drawn line or bar chart prints its window length and `min–max` range beside the chart as text (e.g. `14d · 3–12`).
- The mini charts are `apps/admin/components/dashboard/mini-chart.tsx`, still dependency-free SVG: the `line` marks its latest point with a filled dot, `bars` sits on a hairline baseline and reads its peak at full strength, `donut` uses a thicker ring, and the `AreaChart` adds gridlines to its gradient fill. All take their colour from the caller's ramp hex.
- Currency always resolves through `getCurrencySymbol(currencyCode)`; never hardcode a sign.

### Attention panel

- `apps/admin/components/dashboard/attention-panel.tsx` leads both dashboards, above the KPI bento board. It takes over the three problem metrics (exceptions, overdue, not tracked) and the former separate Needs Attention group no longer renders.
- It is a `<section aria-labelledby>` whose `h2` sits below the page `h1` (the CommandHeader owns the `h1`). The summary line reads `<n> shipments need attention` (singular-aware) and links to `/shipments`.
- The exceptions metric carries its sparkline delta through `trendDir` and `pctStr`; a rise in a problem count is bad, so its tone flips against the arrow. Overdue and not tracked carry no delta.
- Filters are real: exceptions links to `/shipments?status=Exception` (a real `STATUS_GROUPS` key); overdue and not tracked open the plain list because no filter exists yet. Every dashboard KPI link filters as its label promises.
- When every count the payload provides is zero the panel shows the all clear state — a `CheckCircle2` positive signal plus words — never an empty panel and never a hidden one.
- The panel and its metrics enter with the `.reveal` stagger and collapse under reduce motion, like every other block.

## Accessibility

Feature 9 set the bar for everything built after it. The spec is `docs/specs/admin/0002-accessibility-pass.md`; this section is the durable version of the rules plus the checklist the verify walkthrough runs.

### Rules

**Colour is never the only signal.** `@repo/ui/status-badge` prints its label next to the dot, `kpi-card` shows a trend glyph and a percentage, `dashboard/status-donut` prints each status name and value as text in its legend, every dashboard sparkline shows a text range beside the chart (closes WR-19), and the notifications trigger's accessible name carries the unread count (`Notifications, N unread`). The attention panel's all-clear state pairs its `CheckCircle2` with the words `All clear`, never a bare colour. A new indicator that only changes colour is not done.

**One `h1` per route.** `packages/ui/src/page-header.tsx` owns it. `apps/admin/components/page-header.tsx` only maps the admin props (`subtitle`, `icon`, `action`) onto it and emits no heading of its own. Pages without a PageHeader (detail pages, login, unauthorized, error and not-found) declare their own single `h1`. Nothing may be the first heading on a page while sitting below `h1`; a heading that is only supporting copy (the auth panel tagline) is a `p`, not an `h2`.

**Landmarks are named.** `main#main-content` is `Main content`, the sidebar is `Main navigation`, the profile rail is `Profile sections`, breadcrumbs are `Breadcrumb`. Add a label to any new `nav`.

**Dialogs name themselves and hold focus.** Prefer a `Modal.Heading` inside `Modal.Header`; where the header is built by hand, put `aria-label` on `Modal.Dialog`. HeroUI's Modal already traps focus, closes on Escape, and returns focus to the trigger, so do not add those by hand. Every confirmation goes through `packages/ui/src/confirm-dialog.tsx` (cancel first for initial focus, `isPending` blocks dismissal). `window.confirm` and hand drawn overlay dialogs are gone; do not reintroduce them.

**Toasts announce once.** Each toast item carries `role="alert"`, the container stays `aria-live="polite"`, the dismiss control is a real button with `type="button"` and `aria-label="Dismiss"`. Never put `role="alert"` on the container: it would ask for attention and patience on the same node.

**Keyboard.** Every control is a button, link, or field, and a button that does not submit says `type="button"`. Hand written disclosures carry `aria-expanded`: the audit timeline group headers and the sidebar collapse and menu buttons. HeroUI and react-aria emit `aria-expanded` themselves on dropdowns, selects, and menus: never hand add it there, and confirm on the rendered DOM. The header's icon-only controls (sidebar toggle, menu, theme, notifications) and the search affordance each carry an `aria-label`.

**Typeaheads** (`assigned-to.tsx`, `customer-assigner.tsx`) use `role="combobox"` on the input with `aria-expanded` and `aria-controls`, and `role="listbox"` with `role="option"` rows. They do not implement `aria-activedescendant` arrow navigation: options are real buttons, so Tab walks them.

**Tables.** Accessible name follows `<Page name> table` (`Branches table`, `Customers table`, `Shipments table`). react-aria renders the `<th>` itself and filters `scope` out of props, so list pages call `useTableHeaderScope()` from `components/use-table-header-scope.ts`, which stamps `scope="col"` after every render. Call it on any new HeroUI table page. The shared `DataTable` emits `scope`, `aria-sort`, and its selection labels in its own markup and needs no call. Pagination shows `Prev`/`Next` text and the page size select says `aria-label="Rows per page"`.

**Decorative graphics.** Any svg that only sits beside text gets `aria-hidden="true" focusable="false"`. A meaningful svg gets a `<title>`.

**Motion.** Two mechanisms. Every theme change, hover, and focus goes through a short ease-out transition. Page and block entrances use five self-defined utilities at the bottom of `app/globals.css` rather than HeroUI's animation plugin: `.reveal` and `.reveal-pop` (rise, and scale in), `.draw-x` and `.draw-y` (a hairline growing along its own axis), and `.scan-sweep` (the ticket barcode's one pass, decorative and ending invisible). Stagger by setting the `--reveal-delay` custom property on the animated element: a static class (`reveal [--reveal-delay:60ms]`) where the offset is fixed, an inline `style` where it is computed (the timeline rows, the journey stepper). Do not use `animate-in`/`fade-in` for entrance work. The `prefers-reduced-motion: reduce` block collapses animation and transition durations for the whole admin app, sets `animation-delay: 0s` so no stagger survives, and covers HeroUI's animations, the dashboard skeleton, the `@repo/ui` `loading-state` shimmer, `animate-spin` loaders, and the theme-switch cross-fade (its `::view-transition-*` pseudo-elements need their own rule, because the universal selector does not match them). Every entrance utility fills forward to the element's own style, so reduce motion lands on the settled state at once — verified in a real browser: all five settle to opacity 1 and an identity matrix with zero wait. It is admin only; the portals keep their own behaviour.

**Theme switch.** Toggling light/dark goes through `lib/use-theme.ts`, which wraps the `data-theme` swap in the View Transitions API when the browser has it, so the whole surface cross-fades once instead of repainting element by element. `app/globals.css` sets the `::view-transition-old(root)` / `::view-transition-new(root)` duration and easing. Browsers without the API — and anyone with reduce motion set — get the plain swap, which the global colour transition already animates.

**Focus on navigation.** `app/(dashboard)/layout.tsx` focuses `main#main-content` (`tabIndex={-1}`) on every pathname change except the first render, so the new page is announced. The skip link lands on the same element and becomes visible through the shared `:focus-visible` ring in `@repo/ui/tokens.css`.

**Search palette.** `components/search-dialog.tsx` is built on HeroUI ComboBox: the input gets `role="combobox"`, `aria-expanded`, and `aria-activedescendant` from react-aria, rows are `listbox`/`option`, and a `role="status"` region announces the result count. Feature 15 (global search) must keep these semantics.

### The gate

- `pnpm lint` runs `biome lint apps/api/src packages` and then `pnpm --filter admin lint`. The a11y group is at `error` everywhere, and both runs must report zero errors.
- The root script is not `turbo run lint` even though AC-10 asked for it: the portals' `next lint` scripts are broken on Next 16, so a turbo-wide lint run fails on work this feature does not own. The admin app is covered explicitly instead. If the portals are fixed, move the root script to `turbo run lint`.
- Baseline, `apps/admin/**` only, all at `warn`: `useHookAtTopLevel`, `noUnusedVariables`, `noArrayIndexKey`, `useIterableCallbackReturn`, `useTemplate`. These are ~119 pre-existing warnings that this feature did not create. The a11y group is not downgraded anywhere, and warnings in other groups are still debt to burn down.
- `biome.json` is strict JSON. **Never add a comment to it.** A single `// probe` line makes Biome silently ignore the entire config: the run then reports 158 files and 22 errors as if they were new, or worse, reports nothing and exits 0. Rationale belongs here, not in the config.
- `css.parser.tailwindDirectives` is on so Biome can parse `app/globals.css`.
- Contrast is gated by `.planning/quick/261005-q2r-fix-admin-ui-foundation-ac-6-datatable-d/contrast-verify.cjs`, which reads `packages/ui/src/tokens.css` and fails on any pair under 4.5:1 text / 3:1 graphic in either theme. Run it from the repo root after touching tokens; it must report zero failures in both sections.

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
| AC-9 | Enable reduce motion in the OS, reload: no shimmer, no spinner rotation, no modal or dropdown animation, no skeleton sweep, no theme cross-fade when the toggle is used. |
| AC-10 | `pnpm lint` exits 0 with zero a11y errors in `apps/admin` and `packages/ui`; `pnpm --filter admin check-types` and `pnpm --filter @repo/ui check-types` pass; this section and its checklist exist. |

## Do / Don't
- DO read every color from a token; DON'T paste hex in a component (the chart ramp above is the one exception, written as literals).
- DO pick chart colors from the ramp; DON'T introduce a new hue for a series.
- DO let cards lift on the soft shadow with no border; DON'T add glass, glow, blur, or a gradient mesh.
- DO use `--accent-ink` / `text-*-soft-foreground` for accent and status text; DON'T paint raw lime or a light status fill as small text.
- DO keep dark and light equal; DON'T ship a dark-only component.
- DO give every status a label or icon; DON'T rely on color alone.
- DO put a new status in the shared config plus `@repo/types/status`; DON'T add a local status map.
- DO render every KPI card through `components/kpi-card.tsx`; DON'T add a second card grammar or wrap a card in an `onClick` `div`.
- DO repair a filter link to a real `STATUS_GROUPS` key; DON'T point a KPI at a status value the list ignores.
- DO use the shared table for lists; DON'T copy table markup page to page.
- DO keep `@repo/ui` free of API calls; DON'T import app queries there.
- DO give headings `tracking-tight`; DON'T tighten body copy.
- DO keep interactive elements keyboard reachable with a visible focus ring; DON'T leave focus to browser default.

## Intentional visual changes (recorded per spec 0001)
- **Lime & Paper retheme (current).** Accent violet `#4f46e5` / `#a5b4fc` → lime `#8dc63f` / `#a2d145`; canvas and neutrals moved to a warm off-white with an `#ebebeb` page tone behind a `rounded-[28px]` shell frame; cards became borderless white sheets on a soft shadow; the black CTA replaced the teal secondary.
- Font moved IBM Plex Sans → Plus Jakarta Sans (`--font-jakarta`); IBM Plex Mono kept for codes.
- Default theme flipped dark-first → light-first (`data-theme="light"`, `use-theme.ts` default `light`).
- Accent split into a fill role (`--accent`, `bg-primary`, HeroUI) and a text role (`--accent-ink`, mapped over Tailwind `--color-accent`), because lime fails AA as small text on light surfaces. Solid `bg-accent` app usages moved to `bg-primary`.
- Every status color is now a light fill (`success #7cb342`, `warning #f59e42`, `danger #d63b40`); status *text* renders through the `--*-soft-foreground` tokens. This retokened ~83 inline `text-success` / `text-warning` / `text-danger` usages.
- Six tokens nudged off the brief to hold AA (documented deviation): `--muted-light` `#9a9a9a` → `#6f6f6f`, `--muted` → `#5f5f5f`, `--field-placeholder` → `#6f6f6f`, `--sidebar-muted` → `#6f6f6f`, `--danger` `#e5484d` → `#d63b40`, `--info` `#5b8def` → `#3a6bd6`, `--transit` `#3b74e8` → `#2f66da`. The contrast gate is clean in both themes.
- Deliberately not built (present in the reference, no feature behind them): an "Upgrade to Pro" sidebar card, sidebar count badges, an accordion category tree, "Collapse sidebar" / "Add widget" affordances, a payment card, a gauge, a segmented cost bar, and a promo card.
- Accent moved cyan `#0d6e88` / `#22d3ee` → emerald `#065f46` / `#34d399` → signal violet `#4f46e5` / `#a5b4fc` → lime `#8dc63f` / `#a2d145` (current).
- Both neutrals moved zinc → slate blue gray (`#f1f5f9` light, `#0c0f14` dark) → true neutral graphite (`#f5f5f5` light, `#0d0d0d` dark), where every neutral has R = G = B.
- `in_transit` and `out_for_delivery` moved from `primary` to the new `transit` pair.
- Charts collapsed onto one six step ramp; the reports shipment rows now render the shared `StatusBadge` instead of a local map.
- Inter replaced by Geist with Geist Mono, then both replaced by IBM Plex Sans with IBM Plex Mono.
- Glass removed end to end: `.glass-topbar`, `.app-mesh-bg`, the `.shadow-glow-accent*` utilities, the dashboard panel shadows, and the auth/onboard background glows are gone. Surfaces are opaque with hairline borders.
- `--info` moved off violet to cyan (`#0e7490` / `#22d3ee`) once the accent claimed violet.
- Corner radius tightened: panels and cards `0.75rem` → `0.375rem`, modals `1rem` → `0.5rem`, `--radius` and `--field-radius` `0.5rem` → `0.25rem`.
- Shell evolved: the rail matches the surface tone instead of sitting as a dark slab and narrowed to `w-56` / `w-12`, the topbar became an opaque hairline instrument bar with a `h-14` brand row and cluster dividers, and the content column keeps `max-w-7xl`.
- Theme switching gained a View Transitions cross-fade; a `prefers-reduced-motion` collapse covers it.
- The shipment detail page was restructured (spec 0001): the sticky header and the collapsible details block are gone, the route reads as a two-up sender→recipient row, and the timeline is the main column beside a single hairline-divided rail.
- The shipment ticket became a borderless waybill cut along its right edge, replacing a framed card. The tracking number is the page's loudest element at `text-2xl`, the stub carries the identifiers and a barcode, and the tear is a vertical dashed rule with a notch at each end.
- Detail page blocks now enter with a short stagger (`.reveal` + `--reveal-delay`), the journey and timeline connectors draw themselves, and the current step and latest event pop. All five utilities collapse under reduce motion.
- Deliberately kept: the rate-cards workspace orange `#E8621A`, and the audit timeline's non-accent entity colors.
- Airiness pass: the shell opened up (topbar `h-14` → `h-16`, rail `w-56`/`w-12` → `w-60`/`w-14`, content padding `p-4 sm:p-6 lg:p-8` → `p-5 sm:p-7 lg:p-10`), the rail gutter and nav rows grew, KPI cards moved to `p-5` with `text-xs` labels and `text-[11px]` meta, dashboard panels to `p-5`, `comfortable` table rows to `0.875rem`, and stacked pages to a `space-y-8` rhythm. Density principle unchanged: more whitespace, no fewer records per screen than the viewport already allowed.
- KPI bento board (quick 261017-e9u): the equal KPI row became a `BentoBoard` mosaic — `feature` (2×2), `wide` (2×1), `tall` (1×2), and `base` (1×1) tiles on a four-column `lg` grid with `minmax(156px, auto)` rows. Both dashboards run the "Column" board (2×2 headline square, tall status rail, small-tile row) that absorbs the status breakdown and the carrier/branch lists as tiles; the status panel became a segmented donut ring (`status-donut.tsx`). List rows use `bentoRowSpans`, and the shipments filter strip is a fixed three-up board (`columns={3}`) carrying Total / In Transit / Delivered, with the active filter marked by tone and `aria-pressed` instead of by growing a tile. Every tile keeps the 5px signal band and the soft per-metric wash — the sanctioned break from the app-wide no-gradient rule. `KpiHero`, `KpiGroup`, and `StatusBreakdown` were removed in favour of one tile grammar plus the board.
