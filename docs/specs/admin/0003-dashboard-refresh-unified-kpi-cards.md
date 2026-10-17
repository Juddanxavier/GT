# 0003. Dashboard refresh with unified KPI cards

**Date**: 2026-10-17
**Status**: Built
**Verify**: [0003-verify.md](0003-verify.md)

## Summary

The admin dashboard and its KPI cards get a focused refresh. The dashboard now leads with what needs attention (exceptions, overdue, not tracked) in one panel, above the active flow numbers. The two separate KPI card components become one shared card, so the dashboard, shipments, invoices, and reports read as one system. Nothing about the data changes: this is presentation only.

## Context

The operational and superadmin dashboards both open with a header strip, then a group of active flow KPI cards, then a group of problem KPI cards, then charts and breakdowns. Three problems have accumulated as the app grew.

First, the problem numbers sit below the active flow numbers, so the thing an operator must act on is the second thing they read.

Second, the header ticker repeats in transit, delivered today, and exceptions, all of which the KPI cards already show, so the top of the page says the same three numbers twice.

Third, two card components exist in parallel (`apps/admin/components/kpi-card.tsx` and `apps/admin/components/dashboard/kpi-stat-card.tsx`). One renders the dashboard cards with parcel illustrations and mini charts, the other renders the shipments, invoices, and reports cards with icons and an inline sparkline. The two have already drifted in type scale, spacing, and trend treatment.

The forces at play. The app's design contract is `apps/admin/DESIGN.md` (Lime & Paper, light first), the design tokens are stabilised, and a recent airiness pass set the current spacing. The dashboard is the first screen every staff user sees, so its reading order matters. No backend change is available or wanted: the dashboard reads one existing stats endpoint. The next slice of scope work already queues the dashboard, the shipments list, the customer work, and reports, so a card the whole app shares pays off across all of them.

The consequence of not deciding: the same numbers keep competing for the top of the page, and the card drift spreads as more pages add KPI rows.

## Requirements

**User stories**:
- As an operator, I want the dashboard to show me what needs attention first, so that I act on problems before browsing healthy numbers.
- As an operator, I want one consistent card style across the dashboard, shipments, invoices, and reports, so that reading a KPI feels the same everywhere.
- As an operator, I want to change the time window in one place, so the sparklines and the trend chart agree.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: The dashboard, shipments, invoices, and reports render their KPI cards from one shared card component. No second copy of the card grammar remains in the tree.
- **AC-2**: Every KPI card shows its label and its number, plus a trend signal that is not color alone (a glyph and a percentage, or a neutral placeholder when the change is unknown).
- **AC-3**: The dashboard KPI cards keep their parcel illustration. The list page cards (shipments, invoices, reports) keep their icon treatment. Both use the same label, number, trend, chart, spacing, hover, and focus treatment.
- **AC-4**: A linked or pressable card is a real anchor or button, carries a visible focus ring, and shows a clear active state when it is the current filter.
- **AC-5**: Both dashboards lead with an attention panel above the active flow KPI cards. The former separate Needs Attention group no longer renders.
- **AC-6**: The attention panel shows a plain language summary line and the three problem metrics (exceptions, overdue, not tracked). The summary names the total count that needs attention, each metric states its own name and count, the exceptions metric carries its delta (glyph plus percentage), and the panel is a named section with a heading below the page's `h1`.
- **AC-7**: When every attention count the caller's payload provides is zero, the panel shows an explicit all clear state (a positive signal plus words), never an empty panel and never a hidden one.
- **AC-8**: The attention panel's summary and each metric link to the shipments list: exceptions uses the real status filter (`/shipments?status=Exception`), and overdue and not tracked open the plain list because no filter exists yet. The existing dashboard KPI links are repaired in the same pass so every link filters as its label promises.
- **AC-9**: The CommandHeader no longer renders the ticker strip. The refresh control and the branch filter are unchanged.
- **AC-10**: One shared range control (last 7, 14, or 30 days) drives the KPI sparklines, the KPI deltas, and the shipment trend chart. There is one control, not two. The range scopes the time series only, never the card counts.
- **AC-11**: A card whose count is zero, or whose series carries no signal, shows the number, drops the chart, and tones the delta neutral. No flat or padding derived placeholder sparkline renders.
- **AC-12**: The dashboard skeleton mirrors the new layout (a header block sized to the single row header, an attention panel block, then the active flow card blocks), so the first paint matches the loaded page and does not shift.
- **AC-13**: Both themes hold contrast (the admin contrast verifier reports zero failures), color is never the only signal, and no new hue is introduced.
- **AC-14**: Reduce motion collapses the attention panel and card entrances, and each dashboard sparkline keeps a text range beside the chart.

## Options considered

### Option 1: Fix in place

Keep both card components and both KPI groups. Align the two cards to one shared class contract and document the rules in `DESIGN.md`, keeping the problem group below the active flow group.

**Pros**:
- Smallest diff and lowest risk, nothing new to learn.

**Cons**:
- Two components stay in the tree, so the drift can return.
- The problem numbers stay below the fold.
- The duplicated ticker stays.

### Option 2: One shared card plus an attention first dashboard

One shared card component owns the grammar, with the parcel illustration as an optional variant. Both dashboards lead with an attention panel that takes over the problem metrics, and the ticker is removed.

**Pros**:
- One card to change, so KPI rows stop drifting.
- Problems read first, which matches an operations console.
- The list pages inherit the improved card.

**Cons**:
- A real refactor of five call sites.
- The attention panel is a new component with its own empty state.
- More surface to verify in two themes.

### Option 3: Aggressive consolidation

One flat row of six KPI cards on a single card style, illustrations dropped, group headings removed, and the attention numbers emphasized in place.

**Pros**:
- Least vertical space and fewest components.

**Cons**:
- Loses the parcel illustrations the product uses as identity.
- Loses the grouping that separates flow from problems.
- The flat row reads as a wall of numbers.

## Decision

**Chosen option**: Option 2: One shared card plus an attention first dashboard.

The admin dashboard and its KPI cards are refreshed in place: one shared card component with an optional illustration variant, an attention panel that leads both dashboards and takes over the problem metrics, the header ticker removed, one shared range control, and a skeleton that mirrors the new layout.

## Rationale

The dashboard is the first screen on every session, and the current order makes an operator read healthy numbers before problem numbers, which is backwards for an operations console. Leading with problems matches the app's own groupings and needs no new data. The ticker repeats numbers the cards already carry, so removing it shortens the header without losing information. The two card components have already drifted in type scale, spacing, and trend treatment, and every new KPI row adds more drift, so one primitive with an optional illustration variant fixes the cause rather than the symptom. Option 1 leaves the drift mechanism in place, and Option 3 trades away the illustrations and the flow and problem grouping the product uses to read at a glance.

The engineer chose to keep the current spacing rather than tighten it. The recent airiness pass is young, and this change is about hierarchy and the card interior, not about fitting more on screen, so the diff stays on structure and the card, not on the page rhythm.

## Feature design

**Data model sketch**: No persistence. The dashboard reads the existing `/api/dashboard/stats` response (`Stats` in `apps/admin/components/dashboard/types.ts`). No table, column, or migration change.

**State transitions**: None. The only new client state is the selected range (last 7, 14, or 30 days), held in the dashboard and passed down.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/dashboard/stats | GET | branchId (optional) | existing `Stats` payload | session | existing |

No endpoint change. This feature only consumes the existing surface.

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action | Value produced / displayed | Source |
|---|---|---|
| Attention panel summary | count that needs attention | sum of exceptions, overdue, notTracked from `resolveShipments(stats)` |
| Attention panel metric | each problem count | `shipments.exceptions`, `.overdue`, `.notTracked`. Real values for the superadmin too, since `buildSuperadminStats` returns a top level `shipments`; the fallback must not zero them. |
| Attention panel clear state | all clear | every attention count present in the payload is zero |
| Attention panel exceptions delta | percent change | `seriesTrend` over the exceptions sparkline, rendered through `trendDir` and `pctStr` |
| Metric link target | shipments URL | exceptions: `/shipments?status=Exception` (a real `STATUS_GROUPS` key); overdue and not tracked: `/shipments`; summary: `/shipments` |
| KPI sparkline | series for the selected window | `resolveSparklines(stats.shipmentTrend, perDay, days)` and `deliverySeries(stats.deliveryFlow, days)` |
| KPI card delta | percent change | `seriesTrend(series)`, rendered through `trendDir` and `pctStr` |
| Series has signal | whether to draw a chart | one exported helper; `count === 0` or every point zero means no signal |
| Shared range control | window in days | selected key mapped 1w to 7, 2w to 14, 1m to 30, held in `app/(dashboard)/page.tsx` |
| Trend chart | windowed volume series | `chartVolumeData(stats.shipments.perDay, days)` |
| Window date key | which day a point belongs to | one shared window helper, so the sparklines and the trend chart agree (no split between UTC and local keys) |
| List page card currency | currency text | a `currencyCode` prop resolved through the existing `getCurrencySymbol` (preserves LKR; no hardcoded sign) |
| List page card count | count | existing call sites (`components/shipments/shipments-kpi-row.tsx`, the invoices page, the reports page) |

**Key invariants**:
- One card component owns label, number, trend, chart slot, hover, focus, and active state. It accepts `image` (illustration) or `icon`, `href` (renders `next/link`) or `onPress` (renders a button with `aria-pressed` when active), and a `value` with an optional `format` and `currencyCode`.
- The attention panel renders whenever the dashboard renders, in the clear state when nothing needs attention. It is a `<section>` named by its heading, and its heading is an `h2` (the CommandHeader owns the page `h1`).
- The range control, the KPI sparklines, and the trend chart read the same window value through one window helper and never disagree.
- List page cards keep their own row height; the dashboard card's larger size does not leak onto the shipments, invoices, or reports rows.
- Every color comes from an existing token or the chart ramp; no new hue.

**Security model**: Unchanged. `/api/dashboard/stats` is already scoped by session role and tenant, and the branch filter is already applied server side. This feature adds no data and no new read path, so tenant isolation is untouched. The attention panel and the cards show only what the existing payload already returns for the caller's role.

**Configuration required**: None.

**Critical test scenarios** (each maps to an acceptance criterion):
- Happy path: the operational dashboard loads, shows the attention panel with its summary, three metrics, and the exceptions delta, then the active flow cards and the charts; the shared range control changes the sparklines, the deltas, and the trend chart together, and never changes the card counts. Verifies **AC-5**, **AC-6**, **AC-10**.
- Filter links: the exceptions metric opens `/shipments?status=Exception` and the list actually filters, and the repaired KPI links filter too. Verifies **AC-8**, **AC-4**.
- Clear state: with every available attention count zero, the panel shows the all clear state. Verifies **AC-7**.
- No signal series: a card with a zero count or an all zero series shows the number, no chart, and a neutral delta. Verifies **AC-11**.
- Permission and scope: a superadmin (no tenant scope) and a staff user both render the attention panel with real overdue and not tracked values; staff sees no branch filter and no revenue, and no tenant leaks into any figure. Verifies **AC-5**, **AC-6**.
- Theme and motion: both themes hold contrast, and with reduce motion the entrances collapse and each sparkline keeps its text range. Verifies **AC-13**, **AC-14**.

## Build plan

Ordered as a thin end to end thread first (Tracer Bullet, the project default): stand up the shared card and render every call site through it, then the attention panel, then the smaller pieces. Each task names the acceptance criteria it satisfies.

1. Promote the dashboard card in `apps/admin/components/dashboard/kpi-stat-card.tsx` into the shared primitive: keep its image, icon, chart, sublabel, href, text range, and reveal support, and add `onPress` (a button with `aria-pressed` when active), `format`, and `currencyCode`. Leave one card grammar in one home and delete the other. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**. **(built: the primitive is `apps/admin/components/kpi-card.tsx`, `KpiCardProps`; `dashboard/kpi-stat-card.tsx` keeps only `KpiGroup` and the illustration mapping, and its local `KpiItem` is now a re-typed alias of `KpiCardProps` so there is one grammar. The dashboard height is a `tall` flag rather than a size prop.)**
2. Point every call site at the primitive: the dashboard KPI group (the card inside changes, `KpiGroup` stays), `apps/admin/components/shipments/shipments-kpi-row.tsx`, the invoices page, and the reports page. Keep the list pages' icon treatment and their row height. Satisfies **AC-1**, **AC-3**. **(built: all four call sites render `KpiCard`; the removed `currencyCode` prop stopped being threaded through `operational-dashboard.tsx` and `app/(dashboard)/page.tsx`.)**
3. Repair the shipment filter links: replace the lowercase status values with the real `STATUS_GROUPS` keys so the existing dashboard cards filter as labelled. Satisfies **AC-8**. **(built: In Transit and Out for Delivery to `/shipments?status=In%20Transit`, Delivered to `/shipments?status=Delivered`, exceptions to `/shipments?status=Exception`, and overdue / not tracked / the summary to the plain list.)**
4. Build the attention panel: a named `<section>` with an `h2` heading, a plain language summary line, the three problem metrics as linked figures that announce their name and count, the exceptions delta, and an all clear state that fires only when every available count is zero. Satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**. **(built: `apps/admin/components/dashboard/attention-panel.tsx`.)**
5. Replace the Needs Attention group with the attention panel in `operational-dashboard.tsx` and `superadmin-dashboard.tsx`, and flip the order so the panel leads. Tighten the `resolveShipments` fallback so a missing `shipments` object cannot zero the attention counts. Satisfies **AC-5**, **AC-6**. **(built: `resolveShipments` reads the top level `shipments` for the superadmin payload too, so overdue and not tracked are real there. Note: `app/(dashboard)/page.tsx` routes every role that has `total` to `SuperadminDashboard`, so `OperationalDashboard` is currently unreachable; it was updated anyway to keep the two dashboards in step.)**
6. Remove the ticker from `apps/admin/components/dashboard/command-header.tsx` and drop the `ticker` prop from its callers. Satisfies **AC-9**. **(built.)**
7. Add one window helper (a single day key rule) and a shared signal helper, then thread the selected days through `resolveSparklines`, `deliverySeries`, and `chartVolumeData`. Satisfies **AC-10**, **AC-11**. **(built: `chartRangeDays` and `hasSeriesSignal` in `components/dashboard/utils.ts`; `deliveryFlow` had to be added to `dashboardStatsSchema` in `lib/validation.ts`, because zod strips unknown keys and was dropping the spec's named series source.)**
8. Hold the range in `app/(dashboard)/page.tsx` as `ChartRange` state, render one labelled range control above the KPI cards, wire it to the sparklines, the deltas, and `shipment-trend-chart.tsx`, and remove that chart's own `Select`. Satisfies **AC-10**. **(built: `components/dashboard/range-control.tsx` is the single control; the trend chart's `Select` is gone.)**
9. Handle the empty and no signal series in the card and the panel. Satisfies **AC-11**. **(built: `KpiCard` drops the chart and tones the delta neutral through `hasSeriesSignal`.)**
10. Rebuild `apps/admin/components/dashboard/dashboard-skeleton.tsx` to mirror the single row header, the attention panel, and the active flow cards. Satisfies **AC-12**. **(built.)**
11. Run the light and dark, contrast, reduce motion, and keyboard pass, and update `apps/admin/DESIGN.md` where the card grammar or the attention panel becomes a durable rule. Satisfies **AC-13**, **AC-14**. **(partly built: `apps/admin/DESIGN.md` gained the `KPI card` and `Attention panel` component rules plus the colour-signal and Do/Don't lines; `pnpm --filter admin check-types`, `pnpm --filter admin lint` (0 errors, 119 pre-existing warnings), `pnpm --filter admin build`, and the contrast verifier (zero failures in both themes) are green; the by-eye light and dark, reduce motion, and keyboard walkthrough is still owed and belongs to `/check verify`.)**

## Consequences

**Positive**:
- Problems read first on both dashboards.
- One card to change, so KPI rows stop drifting.
- The list pages inherit the improved card.
- The header carries less duplicated information.

**Negative / tradeoffs**:
- A real refactor of five call sites, with a short window where the dashboard and the list pages must both be re-verified.
- The shared card now carries more options (illustration or icon, three chart types, press, link) and two sizes, so it needs a clear prop contract and a short doc comment to stay simple.
- Holding the range in the dashboard page means the trend chart no longer owns its own control, so the page holds more state.
- Repairing the existing links changes behaviour: controls that used to show everything now filter, which some users may have read as normal.
- The attention panel adds a new empty state to design and verify in both themes.

**Neutral**:
- The dashboard page gains a small amount of state (the selected range).
- A shared window helper and a shared signal helper are added to `apps/admin/components/dashboard/utils.ts`.
- `apps/admin/components/dashboard/kpi-stat-card.tsx` keeps `KpiGroup` and the illustration mapping; only the duplicate card grammar goes.
- No change to the data, the endpoint, or the tenancy model.

## Follow-up

- [ ] Overdue and not tracked have no list filter, so their attention metrics open the plain shipments list. A real filter needs a read path change (the API derives both from the estimated delivery date and the tracking registration) and belongs to scope feature 12 (shipments & detail redesign).
- [ ] The design community skills (`redesign-existing-projects`, `design-system`, `high-end-visual-design`, `design-taste-frontend`) are installed under `.agents/skills/` but not referenced in `AGENTS.md`. The admin design contract lives in `apps/admin/DESIGN.md`; decide whether to reference these skills there or in a nested `apps/admin/AGENTS.md`.
- [ ] The shipments, invoices, and reports KPI rows are owned by scope features 12 and 14. This spec changes only their shared card; their own redesigns stay with those features.
