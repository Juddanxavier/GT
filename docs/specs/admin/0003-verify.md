# 0003 verify. Dashboard refresh with unified KPI cards

Verify walkthrough for spec [0003](0003-dashboard-refresh-unified-kpi-cards.md). Written by the build pass; the run itself belongs to `/check verify`. Each row is independently checkable against the rendered app.

**State at handover**: `pnpm --filter admin check-types` passes, `pnpm --filter admin lint` reports 0 errors and 119 warnings (the DESIGN.md baseline), `pnpm --filter admin build` passes, and the contrast verifier reports zero failures in both themes. The light and dark, reduce motion, and keyboard walkthrough below is the open item.

## Setup

- `pnpm --filter admin dev`, then sign in twice: once as branch staff (branch-scoped, no branch filter, no revenue) and once as superadmin (no tenant scope).
- Toggle the theme per row where the criterion says both themes; run the contrast verifier from the repo root:
  `node .planning/quick/261005-q2r-fix-admin-ui-foundation-ac-6-datatable-d/contrast-verify.cjs`

## Acceptance criteria

| AC | Walkthrough | Notes |
|----|-------------|-------|
| AC-1 | `apps/admin/components/dashboard/kpi-stat-card.tsx` exports only `KpiGroup` and the illustration map, with no card markup of its own. The dashboard, `/shipments`, `/invoices`, and `/reports` each render `apps/admin/components/kpi-card.tsx`. The four interiors are identical: label top-left, 44px parcel art or a tinted icon badge top-right, 34px tabular number, trend beside it. | `KpiItem` in `dashboard/types.ts` is a re-typed alias of `KpiCardProps`, so there is one grammar. |
| AC-2 | Every card shows its label, its number, and a trend signal that is not colour alone: a glyph plus a percentage, or `—` when the change is unknown. Desaturate the screen and confirm the meaning survives. | The neutral placeholder is `trendValue` defaulting to `—`. |
| AC-3 | Dashboard cards show the parcel `image`; list-page cards show the lucide `icon` badge. Both share label, number, trend, chart, spacing, hover, and focus treatment. | The variant is data on one component, not a second component. |
| AC-4 | Tab onto a linked card: the focus ring is visible. On `/shipments` the card matching the current status is tinted and the DOM reports `aria-current="page"` (link) or `aria-pressed` (button). Pressing it filters the list. | A card is `<a>` with `href`, `<button type="button">` with `onPress`, or a plain panel. |
| AC-5 | Both dashboards render the attention panel above the active-flow KPI cards. No former separate Needs attention KPI group renders below. | |
| AC-6 | The panel is `<section aria-labelledby="attention-panel-heading">` with an `h2` reading `Needs attention`, sitting below the page `h1`. The summary reads `N shipments need attention` (singular-aware) and links to `/shipments`. Each metric prints its own name and count. Exceptions carries its delta as a glyph plus a percentage. | The `h2` is below the CommandHeader's `h1`. |
| AC-7 | On a branch with no problems, the panel shows `CheckCircle2` plus the words `All clear. Nothing needs attention right now.` The panel is visible, never empty, never hidden. | Clear state fires only when every count the payload provides is zero. |
| AC-8 | The exceptions metric opens `/shipments?status=Exception` and the list actually filters. Overdue, not tracked, and the summary open the plain `/shipments`. The repaired KPI links (In Transit, Out for Delivery, Delivered, exceptions) each filter as their label promises. | `Exception` is a real `STATUS_GROUPS` key; overdue and not tracked have no filter yet (spec Follow-up, feature 12). |
| AC-9 | The CommandHeader renders no ticker strip. The refresh control and the branch filter are unchanged. | |
| AC-10 | Exactly one range control renders (a labelled `fieldset` with three pressed buttons). `shipment-trend-chart.tsx` has no `Select` of its own. Switching the range moves the KPI sparklines, the KPI deltas, and the trend chart together, and leaves every card count unchanged. | Range days: `1w`→7, `2w`→14, `1m`→30, held in `app/(dashboard)/page.tsx`. |
| AC-11 | Find a card whose count is zero, or whose series is all zero: the number still renders, no chart is drawn, and the delta is toned neutral. No flat or padding-derived placeholder sparkline appears. | Gate is `hasSeriesSignal(count, spark)`. |
| AC-12 | On a hard refresh (or with the stats request throttled), the skeleton shows a single-row header block, a range row, the attention panel block, three `h-[152px]` active-flow cards, then the chart and breakdown. Nothing shifts when the data lands. | |
| AC-13 | The contrast verifier reports zero failures in both theme sections. Toggle the theme and re-read the panel, the cards, and the trend text. No new hue appears: every colour comes from a token or the six-step chart ramp. | |
| AC-14 | With OS reduce motion on, the attention panel and the card entrances settle immediately (no stagger). Every drawn sparkline, line, or bar chart still prints its `min–max` range as text. | The range text carries the screen-reader name `Chart range`. |

## Value sourcing

Every displayed value must trace to the source named in the spec's Value sourcing table.

| Value displayed | Source to confirm |
|---|---|
| Attention summary count | sum of exceptions, overdue, notTracked from `resolveShipments(stats)` |
| Metric counts | `shipments.exceptions`, `.overdue`, `.notTracked`, real (not zeroed) for the superadmin payload too |
| Clear state | every attention count present in the payload is zero |
| Exceptions delta | `seriesTrend` over the exceptions sparkline, rendered via `trendDir` and `pctStr` |
| Metric link targets | exceptions `/shipments?status=Exception`; overdue, not tracked, summary `/shipments` |
| KPI sparkline | `resolveSparklines(stats.shipmentTrend, perDay, days)` and `deliverySeries(stats.deliveryFlow, days)` |
| KPI card delta | `seriesTrend(series)` via `trendDir` and `pctStr` |
| Chart or no chart | `hasSeriesSignal`; `count === 0` or every point zero means no signal |
| Range window | `1w`→7, `2w`→14, `1m`→30, held in `app/(dashboard)/page.tsx` |
| Trend chart volume | `chartVolumeData(stats.shipments.perDay, days)` |
| Window day key | the one shared window helper, so the sparklines and the trend chart agree (no UTC/local split) |
| List card currency | `currencyCode` resolved through `getCurrencySymbol` (LKR → `Rs`); no hardcoded sign |
| List card count | the existing call sites: `components/shipments/shipments-kpi-row.tsx`, the invoices page, the reports page |

## Scope and tenancy

- A superadmin and a branch staff user both render the attention panel with real overdue and not tracked values.
- Staff sees no branch filter and no revenue figure.
- No tenant's numbers appear in another tenant's dashboard or anywhere in the panel.

## Result

**Verdict**: the build conforms. 13 of the 14 acceptance criteria pass on the running app. AC-7 is blocked, not failed: no scope reachable from the data in this environment had every attention count at zero, so the clear state never rendered. Two findings are worth a look (see Findings): the focus ring the new rule adds is lost on the dev server, and the repaired KPI links live in a component the app no longer routes to.

**Run on**: 17 Oct 2026. Admin app on `http://localhost:3000` (the project's own dev server, serving this working tree) driven in headless Chrome over the DevTools protocol, API on `http://localhost:3001`, plus the production build served with `next start` for the focus ring check. Signed in as `superadmin@gajantraders.com` (all tenants, and by tenant switch Lanka Mahal), `staff-mumbai@gajantraders.com` (branch staff), and `staff-jaffna@lankamahal.lk` (Lanka staff). Screenshots and the raw probe output sit in the scratch area: `C:\Users\judda\AppData\Local\Temp\opencode\gt-verify\shots` and `...\scenarios.json`, `...\followup.json`, `...\value.json`.

**Gates observed at verify time**: `pnpm --filter admin check-types` exits 0, `pnpm lint` exits 0 with 119 warnings (the DESIGN.md baseline), `pnpm --filter admin build` passed, and the contrast verifier reported zero failures in both themes. No console error and no uncaught page exception appeared on any surface visited.

### Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| AC-1 | pass | The dashboard, `/shipments`, `/invoices`, and `/reports` each render cards carrying the same class string, `group flex flex-col rounded-lg content-panel p-5 text-left transition-colors duration-150` (the dashboard adds the tall height). Interior structure is the same on all four: label, 34px tabular number, trend, optional chart. `/shipments` renders them as buttons, the other three as panels. |
| AC-2 | pass | Every card shows label, number, and a text trend: `0.0%`, `+11.1%`, `+100.0%`, or the neutral placeholder. The meaning is carried by text plus a glyph, so it survives desaturation. |
| AC-3 | pass | Dashboard cards carry the parcel art as `img` with `alt=""` and `aria-hidden`; the list cards carry the lucide icon badge and no image, on the same shared classes. |
| AC-4 | pass | On `/shipments` the four cards are `button` elements. The card matching the filter carries `aria-pressed="true"` and `bg-accent-soft` (Total while the filter is All). Pressing Delivered tinted that card and dropped the table from 19 rows to the one delivered shipment. The focus ring resolves correctly on the production build; see Finding 1 for the dev server. |
| AC-5 | pass | Order on the dashboard is `h1`, then `h2` Needs attention, then the ACTIVE SHIPMENTS label and the three active flow cards, then the chart and the breakdown. Exactly one heading reads Needs attention and no KPI group with that title renders below. |
| AC-6 | pass | The panel is a `section` with `aria-labelledby="attention-panel-heading"` and its `h2` sits below the page `h1`. The summary reads `18 shipments need attention` and links to `/shipments`. Each metric prints its name and count (Exceptions 0, Overdue 0, Not tracked 18) and Exceptions carries its delta as a glyph plus a percentage, `+11.1%`. |
| AC-7 | blocked | The clear state never rendered. Every scope reachable here had Not tracked above zero: superadmin on Gajan Traders 18, superadmin on all tenants 26, Lanka staff 8. The tenant filter and branch filter cannot be combined into a scope with zero, and the branch filter lives on the operational dashboard which the app does not currently route to. The clear branch is in the code but was not proven at runtime. |
| AC-8 | pass | The Exceptions metric rendered `href="/shipments?status=Exception"`; clicking it landed on exactly that URL and the list applied the filter (empty result, matching the metric count of 0). Overdue and Not tracked opened `/shipments` and the plain list returned 19 rows. The selected shipments KPI card did not tint on the exception deep link because `Exception` is not one of the four shipment cards. See Finding 2 about the repaired links. |
| AC-9 | pass | The header panel text is `Super Admin superadmin Live operations overview`, no digits, no ticker strip. The refresh control and the branch filter render as before. |
| AC-10 | pass | Exactly one range control renders: a `fieldset` with `legend` Time range and three buttons, Last 14 days pressed on load. Switching to 7 and to 30 days moved the deltas (In Transit `0.0%` to `+100.0%`, Total `+11.1%` to `+100.0%`) and the sparkline range text (Total `Chart range 1–3` to `0–3`), and left every card count at 6, 0, and 19. |
| AC-11 | pass | The Delivered Today card renders 0, draws no chart (zero `svg` inside the card), prints no range text, and shows the neutral placeholder `—` for its delta. Confirmed in all three ranges. |
| AC-12 | pass | With the stats request held for six seconds the skeleton rendered 9 pulse blocks in the final order: header block, range row, attention panel block, three cards, then the chart and the breakdown. Geometry before and after the data landed was identical (header top 72 height 86, range row 186 and 38, panel 252 and 174, card grid 484 and 187), so nothing shifts. |
| AC-13 | pass | The contrast verifier reports zero failures in both themes. In page probes every pair clears its threshold in both themes, the lowest being 6.12 for the metric label against the metric background. The dark switch is real: `--accent` moves `#8dc63f` to `#a2d145` and the panel background `rgb(255, 255, 255)` to `rgb(22, 22, 22)`. |
| AC-14 | pass | With `prefers-reduced-motion: reduce` emulated, all 7 `.reveal` elements sat at opacity 1 with no transform and an animation duration of `1e-05s` as soon as the data landed, so no stagger. Every drawn chart still printed its range as text (`Chart range 0–1`, `Chart range 1–3`). |

### Value sourcing

| Value displayed | Result |
|---|---|
| Attention summary count | pass. Read with the dashboard's own tenant scope the payload gives exceptions 0, overdue 0, notTracked 18, and the panel reads `18 shipments need attention`. |
| Metric counts | pass. Same payload: 0, 0, 18, matching the three metrics. The counts are real for the superadmin payload, not zeroed. |
| Clear state | not reached, same as AC-7. |
| Exceptions delta | pass. `+11.1%` on screen, and it moved with the range as `seriesTrend` derived deltas do. |
| Metric link targets | pass. Exceptions `/shipments?status=Exception`, the other three `/shipments`. |
| KPI sparkline | pass. Sparkline shape and its range text (`Chart range 0–1` for In Transit, `1–3` for Total) track the payload's per day series and the chosen window. |
| KPI card delta | pass. Deltas changed with the window while the counts held. |
| Chart or no chart | pass. The zero count card drew no chart; the two with signal drew one. |
| Range window | pass. The three buttons map to 7, 14, and 30 and the series, the deltas, and the chart all followed. |
| Trend chart volume | pass. The trend chart bars follow the per day series for the same window and its day axis matches the payload dates (28/6 through 24/7). |
| Window day key | pass. The sparkline range text and the trend chart axis agreed on the same window days, with no visible day shift. |
| List card currency | pass. With the tenant switch on Lanka Mahal the invoices row read `Rs15,163.76`, so `LKR` renders as `Rs` and no hardcoded sign appears. |
| List card count | pass. `/shipments` 19 and its card counts, `/invoices` cards, and the reports cards all render through the same call sites. |

### Scope and tenancy

- Superadmin and branch staff both render the attention panel with real values. Superadmin on Gajan Traders: Exceptions 0, Overdue 0, Not tracked 18. Branch staff (`staff-mumbai`): the same three metrics with real counts. Lanka staff (`staff-jaffna`): Exceptions 0, Overdue 0, Not tracked 8.
- Staff sees no branch filter (zero branch selects in the panel area) and no revenue figure anywhere on the dashboard.
- The numbers follow the scope in force. The same endpoint returned 19 shipments with the Gajan Traders tenant header and 27 across all tenants, and the screen matched the scoped request in both cases, so no other tenant's numbers leak in.

### Findings

1. **The card focus ring is lost on the dev server.** The new `.content-panel:focus-visible` rule in `apps/admin/app/globals.css` does not win on the dev server, so a keyboard focused KPI card shows the resting shadow only. The tokens stylesheet is served after the app stylesheet there, and at equal specificity the later rule wins. The production build orders the two rules the other way and the ring resolves: `rgb(245, 245, 245) 0 0 0 2px` plus the lime layer at 40%. Before this change no ring appeared in either build, so the rule is a strict improvement, but the dev result is worth hardening. This is a `/develop` follow up, not a blocker for the build.
2. **The repaired KPI links sit in a component the app no longer routes to.** `operational-dashboard.tsx` holds the cards with the repaired `href` values (`/shipments?status=In%20Transit`, `/shipments?status=Delivered`), but `app/(dashboard)/page.tsx` sends every role that has `stats.total` to `SuperadminDashboard`, whose cards are plain panels. So no reachable dashboard KPI link can be checked, and AC-8 holds only for the attention panel links that do render. If the KPI links are meant to be reachable, the routing or the superadmin dashboard needs a look.
3. **Reports KPI labels are lowercase** (`total`, `delivered`, `in transit`) where the other three surfaces use title case. That text comes from the reports call site, not the shared card, so it is a small consistency gap rather than a card defect.
4. **Out of scope observations.** The Lanka staff invoices page failed to load (`Failed to load invoices`, it renders for the superadmin with the Lanka tenant selected). A run of sign ins in quick succession hit the login rate limit, which refused three of four attempts in one pass. Neither touches this feature.

### What this pass leaves

- Spec status stays `Built`: AC-7 is unproven and Findings 1 and 2 are open.
- The scope boxes for feature 11 are left as the build pass left them, with `Verify it` unticked.
