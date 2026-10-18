# 0004. Add a business overview board to the admin dashboard

**Date**: 2026-10-18
**Status**: In Progress

## Summary

The admin dashboard gains a second group of tiles that show business totals instead of shipment flow: customers, invoices with this month's revenue, rate cards, and branches. The numbers come from the dashboard endpoint the page already calls, with new counts for rate cards, branches, and the invoice book. A staff user sees only the customers tile, while invoices, revenue, rate cards, and branches stay with tenant admins and superadmins. Nothing about shipment tracking changes, and the dashboard file that never renders is removed.

A later amendment adds a small chart to two of those tiles, Customers and Invoices, showing six monthly points of how many new rows arrived each month, because a standing total on its own hides recent activity. The same amendment closes a mismatch the first build left open: the Invoices tile and the `/invoices` page now read the same rows, both ignoring archived invoices. The charts use a fixed six month window of their own and are not driven by the shipment range control.

## Context

> ⚠️ Premise note: `apps/admin/components/dashboard/operational-dashboard.tsx` never renders. `apps/admin/app/(dashboard)/page.tsx` sends every payload that carries a `total` block to `SuperadminDashboard`, and all three server builders return that block, so `OperationalDashboard` is dead code (spec 0003 recorded the same finding). Adding the new tiles to both files, as the first draft of this spec proposed, buys a second copy that no user ever sees. This spec builds the board once, wires it into the live dashboard, and deletes the dead file.

The dashboard answers one question today: where are my shipments. Every dashboard opens with shipment flow tiles (total, in transit, out for delivery, delivered today, exceptions) and then charts and breakdowns. The business side, meaning how many customers, invoices, rate cards, and branches exist, is invisible even though the stats endpoint already computes customer and revenue numbers for the per tenant table.

An operator who wants those totals has to open four separate list pages. Adding them to the dashboard is the natural fix, but the work is not presentation only. The rendered dashboard reads the `total` block of the stats payload, and that block has no rate card count and no branch count. It does carry an `invoices` object, but that object is misnamed: its count and its revenue are both read from the shipment table where a bill amount is set, not from the invoice table. A tile labelled Invoices and linked to `/invoices` would therefore disagree with the page it opens.

Three forces shape the choice. The dashboard must keep reading one cached endpoint, because a second read path means a second cache key, a second place to enforce the tenant boundary, and a second thing that can go stale. The two surfaces must keep one visual grammar, so the new tiles reuse the existing `KpiCard` rather than a new component. And role visibility already has a precedent, because revenue is hidden from staff in the current design, so hiding invoices and rate cards from staff follows the pattern instead of inventing one.

### Amendment, 2026-10-18: a chart on the business tiles

> ⚠️ Premise note: "add a chart" has two possible readings here and they are not equally useful. Chart the tile's own value over the shared 7, 14, or 30 day range control, the way the shipment tiles do, and every business chart on live data is empty, because nothing in these tables has been created since September 2026. The existing no signal rule would then drop every chart, so the feature would ship invisible. Chart the flow that builds the value over a longer and coarser window and the chart carries a real story. This amendment takes the second reading, so the business charts answer "how fast is the book growing", not "how has the total moved", and they deliberately ignore the page's range control.

The board shipped on 2026-10-18 with deliberately flat tiles. The reasoning was that a business total is a standing count rather than a flow, and that a trend would need its own series and a second round of time series queries. Both parts still hold. The gap the request fills is that a standing total with no chart cannot show momentum, so a tenant that added several customers last month reads exactly the same as a tenant that added none for a year.

One measured fact shaped the amendment. Every row in all four business tables was created in July, August, or September 2026: customers between 2026-07-08 and 2026-07-23, invoices on 2026-08-13 and 2026-09-10, the single rate card on 2026-09-05, and all six branches on 2026-07-24. The dashboard's shared range control offers 7, 14, and 30 days, so a per day series over any of those windows is all zeros. Reaching the real activity needs a monthly bucket and a window of several months.

A second, smaller problem sits next to the charts. The Invoices tile excludes archived invoices while the `/invoices` list does not, so for one seeded tenant the tile reads 1 and the page it links to reads 2. Drawing a trend beside that number would make the disagreement louder, so the page and the tile are brought onto the same rows in the same change.

## Requirements

**User stories**:
- As a tenant admin, I want the business totals on the dashboard so that I can see the size of the book without opening four list pages.
- As a superadmin, I want the same totals across every tenant so that I can see the whole platform at a glance.
- As a staff user, I want only the non financial total so that business financial data stays with tenant admins.
- As a tenant admin, I want to see how fast the book is growing so that a flat total does not hide a quiet month.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: The dashboard renders a section headed `Business Overview` directly under the `Shipment Overview` board and above the shipment trend chart, for every role that can load the dashboard.
- **AC-2**: For a tenant admin and a superadmin the section renders four `KpiCard` tiles in this order: Customers, Invoices, Rate cards, Branches, sized from `bentoRowSpans` for the tile count.
- **AC-3**: The Customers tile shows the customer total as its value and the active customer count as its sublabel.
- **AC-4**: The Invoices tile shows this month's invoice revenue as its value, formatted with the tenant currency, and the invoice count as its sublabel. Its numbers come from the `invoice` table and exclude archived invoices, and the `/invoices` list, its count, and its trend read the same rows, so the tile and the unfiltered page agree within the shared 120 second cache lifetime. A branch filtered page legitimately shows fewer rows, because the tile counts the whole tenant, matching sub decision 5.
- **AC-5**: The Rate cards tile shows the rate card total as its value and the active rate card count as its sublabel.
- **AC-6**: The Branches tile shows the branch total as its value and no sublabel.
- **AC-7**: When the session role is `staff`, only the Customers tile renders. The other three are absent from the DOM, not merely hidden.
- **AC-8**: A tile renders as a link to its list page (`/customers`, `/invoices`, `/rate-cards`, `/branches`) only when a single tenant is resolved. With no tenant resolved, a tile renders as a plain panel with no link, because every list endpoint returns 400 without a tenant.
- **AC-9**: Counts are tenant scoped: every tenant for an unfiltered superadmin, the caller's own tenant otherwise. Branch refinement inside a tenant is unchanged by this work.
- **AC-10**: A zero value renders as `0`, or the currency symbol followed by `0` for revenue. A tile with no chart shows the neutral placeholder pill that `KpiCard` already renders for a card with no signal, which covers a zero value, a value with an all zero series, and the Rate cards and Branches tiles, which carry no chart by decision.
- **AC-11**: `GET /api/dashboard/stats` returns the existing `total.rateCards { total, active }` and `total.branches { total }`, the corrected `total.invoices { total, revenueThisMonth, revenueTotal }` (where `total` counts `invoice` rows and the two revenue figures sum `invoice.amount`), and one new key, a six element `perMonth: number[]` on `total.customers` and on `total.invoices`, oldest month first. All three builders populate `perMonth`, and `dashboardStatsSchema` requires it so the key is not stripped.
- **AC-12**: `DashboardSkeleton` includes a placeholder for the Business Overview section so the page does not shift when data arrives.
- **AC-13**: The section heading sits at the same level as the existing Shipment Overview heading, and the tiles are keyboard reachable with a visible focus state.
- **AC-14**: A superadmin with no tenant filter sees no currency figure on the Invoices tile. Its value is the invoice count and its sublabel names how many tenants are included, because INR and LKR cannot be summed into one number.
- **AC-15**: `apps/admin/components/dashboard/operational-dashboard.tsx` is deleted and no import of it remains.
- **AC-16**: The Customers tile carries the six monthly points of customers created per month, oldest first, from `total.customers.perMonth`, scoped by the same filter its value uses (`queryCustomerCount`, meaning the caller's tenant and the branch wherever the payload is branch scoped). Because the Customers tile is the `feature` tile, its chart is the large `AreaChart`.
- **AC-17**: The Invoices tile carries the six monthly points of invoices created per month, oldest first, from `total.invoices.perMonth`, tenant scoped, counting only rows where `archived_at IS NULL`, drawn as bars.
- **AC-18**: Both business charts use a fixed six month window: months M-5 through M, where M is `date_trunc('month', CURRENT_DATE)` in the database timezone, empty months zero filled and the current month counted so far. The client renders exactly the six received points and never slices them, so changing the shipment `RangeControl` does not change them. `KpiCard` labels a monthly chart window `mo`, not `d`.
- **AC-19**: `GET /api/invoices` (its rows, its `total`, and its status `counts`) and `GET /api/invoices/trend` exclude rows where `invoice.archived_at IS NOT NULL`, so an invoice that belongs to an archived shipment is absent from the live book. `POST /api/shipments/:id/restore` also clears `invoice.archived_at` for that shipment's invoices and invalidates `invoices:list:*`, so a restored shipment's invoice returns.
- **AC-20**: Creating, editing, deleting, or sending an invoice invalidates the dashboard stats cache (`dashboard:*` for the tenant), so the Invoices tile and its series do not trail an invoice write for up to 120 seconds.

## Options considered

### Option 1: Extend the existing stats payload and add a second board

Add the missing counts to the dashboard stats query and render a second board on the page.

**Pros**:
- One read path, one cache key, one place that enforces the tenant boundary.
- Reuses `KpiCard`, `BentoBoard`, and `bentoRowSpans`, so the tiles match the shipment tiles with no new grammar.
- No schema change and no new endpoint to secure.

**Cons**:
- The `total` block grows, and every role builder must be kept in step, which is easy to forget.
- The new counts ride the existing 120 second stats cache, so they can lag a new rate card by up to two minutes.

### Option 2: A separate counts endpoint

Add `GET /api/dashboard/counts` that returns the four numbers.

**Pros**:
- The stats payload stays untouched, and the counts can take their own cache lifetime.

**Cons**:
- A second request on page load, a second cache key, and a second place that must scope by tenant, which is exactly the surface that multi tenant isolation cannot afford to duplicate.
- Two payloads to keep in step with the same role rules.

### Option 3: Count on the client from the list endpoints

Fetch the four list endpoints and read their totals.

**Pros**:
- No API change at all.

**Cons**:
- Four extra requests per dashboard load, each returning rows the page then throws away.
- The counts would disagree with the server numbers whenever a list is filtered or paginated, and the four list endpoints return 400 for an unfiltered superadmin.

### Amendment options, 2026-10-18: the business chart series

The board already ships without charts, so the amendment chose the series, the window, and which tiles, not whether to build the board.

#### Option A: Per day over the shared range control

Reuse the shipment tile pattern: a per day series in the payload, sliced by the page's 7, 14, or 30 day range control.

**Pros**:
- One window control on the page, one mental model, and the client helpers already exist (`volumeSeries`, `chartRangeDays`).

**Cons**:
- Every business table's last row is from September 2026 or earlier, so all four series are zeros in the current window and the no signal rule drops every chart. On today's data the feature ships invisible.
- A business count changes on the scale of months, so even with fresh data a 7 day window would usually read flat.

#### Option B: Six monthly buckets on a fixed window

Return the last six calendar months of new rows per month for the two charted tiles, zero filled, and label the window in months.

**Pros**:
- Reaches back far enough to show the seed data's real shape (customers in July, invoices in August and September) instead of waiting for new activity.
- One grammar: both charted tiles show the flow that builds the value, which is what the shipment tiles already do for their totals.
- No new dependency. `KpiCard`'s existing chart variants cover it once the footer can say months.

**Cons**:
- Puts a second time window on a page that already has the range control, so the two must read as distinct or they will be confused.
- `KpiCard`'s chart footer prints the point count as days, so it needs a month unit to stay honest.
- Rate cards and Branches stay flat, so the board is deliberately uneven.

#### Option C: Keep the tiles static

**Pros**:
- No new queries, no payload growth, and the tiles stay the single source of truth with nothing that can disagree with them.
- Nothing on the board can drift from the pages it links to.

**Cons**:
- The board cannot show momentum at all, which is exactly the gap the request is about.

### Amendment options, 2026-10-18: the Invoices tile and page mismatch

#### Option D: Count archived invoices in the tile too

Drop the `archived_at IS NULL` filter from the tile so it matches the page with a one line change.

**Pros**:
- Smallest possible change. No read path on the invoices page moves.

**Cons**:
- The tile's revenue would include money from soft deleted shipments, so the dashboard would report revenue for work the product has removed.
- The archive lifecycle (archive at 90 days, skeletonize, purge at 1095 days) treats an archived invoice as gone, so counting it is the wrong direction.

#### Option E: Exclude archived invoices from the invoices read path

Add `archived_at IS NULL` to the list rows, the count, the status counts, and the trend, so the page and the tile read the same rows.

**Pros**:
- Archive keeps one meaning. An archived shipment already disappears from the shipments list, so its invoice disappearing from the invoices list is the consistent behaviour.
- The tile's revenue stops counting soft deleted shipments, so no money figure starts including deleted work.

**Cons**:
- The invoices page loses rows it shows today, so its Total KPI, its status tabs, and its sparkline all move at once.
- The invoice detail, PDF, and send endpoints still serve an archived invoice by direct link, so the exclusion is list only. Recorded in Follow-up.

## Decision

**Chosen option**: Option 1: Extend the existing stats payload and add a second board.

Extend the dashboard stats read path with a rate card count, a branch count, and an invoice book count, correct the misnamed `total.invoices` block, render the tiles as a second board on the live dashboard, and delete the dashboard component that never renders. The 2026-10-18 amendment adds a six month growth chart to the Customers and Invoices tiles and brings the invoices read path onto the same rows as the tile.

Sub decisions, settled here:
1. **The extra counts go into the `total` block.** The live dashboard reads `stats.total`, and the three builders already disagree on their top level keys (`buildTenantStats` has top level `customers` and `branches`, the other two do not). Wiring the new counts into the one block every builder returns avoids widening that inconsistency.
2. **`total.invoices` is redefined to mean the invoice book.** Today it is a count and sum of shipped bill amounts. Nothing in the admin UI reads the key, which the build must confirm before changing it, so the correction is invisible to current screens and the key finally means what its name says.
3. **One `BusinessOverview` component** in `apps/admin/components/dashboard/`, given the stats, the role, and the tenant currency, wired into `SuperadminDashboard` only, because that is the component every role actually renders.
4. **The role gate keys off one value**, `stats.role`, so the section depends only on its payload.
5. **Branch refinement is out of scope.** Rate cards and branches are tenant level by schema, and customer counts already follow the branch filter wherever the payload does. This work does not change that behaviour.
6. **The new queries live in `apps/api/src/services/dashboard-stats.ts`**, next to the existing count queries, and run inside the same `Promise.all`, so the endpoint adds one round of parallel queries and no sequential wait.
7. **Revenue is formatted through `formatCurrency` from `@/lib/currency`** (the full precision one, not the abbreviated one in `dashboard/utils`) and passed as a finished string. `KpiCard`'s own currency path uses Indian digit grouping and no decimals, which is wrong for LKR, so the tile formats the value itself and the card renders it as plain text.
8. **The two charted tiles show the flow, not the total.** Customers charts customers created per month and Invoices charts invoices created per month, because a standing total has no shape of its own and the shipment tiles already chart their totals this way. The series is a six element `number[]` of monthly counts, which maps straight onto `KpiCard.spark`; the Customers tile keeps the board's `feature` span and so draws the large area chart, while the Invoices tile draws bars.
9. **The chart window is six calendar months, fixed, and does not follow the range control.** The range control belongs to the shipment board. Six months is the shortest window that reaches the real activity. The window is anchored on `date_trunc('month', CURRENT_DATE)` in the database timezone, includes the current partial month, and zero fills empty months, so the client just renders the six points. `KpiCard` gains a month unit so its chart footer does not call six months six days.
10. **Rate cards and Branches carry no chart.** Their data barely moves (one rate card, six branches created on one day), so a chart there would be a single step and would look broken. This is the tile choice the engineer confirmed.
11. **The invoice mismatch is fixed on the invoices read path, not on the tile.** The list, its count, the `counts` conditions, and the trend exclude archived invoices, matching the lifecycle the shipments list already honours. Because the list now hides those rows, the shipment restore handler also clears `invoice.archived_at` so a restored shipment's invoice comes back, and the invoice write handlers invalidate `dashboard:*` so the tile tracks a write. This is a second, adjacent decision folded into this spec at the engineer's request, and it is what makes **AC-4** hold.

## Rationale

The overriding force is tenant isolation. Option 2 looks harmless and even tidy, until you count the places that must decide what a tenant may see. Today that decision lives in exactly one path with one cache key per role and tenant. A second endpoint doubles it, and duplicated isolation logic is where cross tenant leaks are born. Option 3 fails differently and just as badly: client side counting reimplements the server's filters, so the tile and the page it links to would disagree the first time a list gains a filter.

Option 1 accepts a real cost, that the `total` block becomes the contract for more numbers and every builder must stay in step. That cost is bounded and testable, because the response schema fails on a missing key, which the build tightens. Against a doubled isolation surface and a slow second round trip, it is the cheaper risk.

The cross check changed two parts of the design. First, the invoice tile now reads the invoice book rather than shipped bill amounts, because the misnamed block would have produced a tile that contradicted its own destination page. Second, the board is built once, since the component every role renders is `SuperadminDashboard`, and doubling it into the dead file would have grown maintenance without a user. The visual grammar force still rules out a one off tile component, and the existing role precedent still rules out a new permission rule, since revenue is already hidden from staff in the UI.

The amendment reverses one sentence of the original decision, that the tiles are static, while keeping its core: one read path, one payload, one tenant boundary. The reversal is bounded by the data. A per day series would have been the cheapest code and the emptiest screen, because nothing has been created in the current window for months, so six monthly buckets are the smallest change that shows the real shape. Charting the flow rather than the total keeps each tile honest: the number is the standing size and the bars are what added to it. The invoice fix goes on the read path rather than the tile for the same reason the original spec sourced the tile from the `invoice` table: an archived invoice belongs to a soft deleted shipment, so a revenue figure that counts deleted work is the number that should be wrong, not the page.

## Feature design

**Data model sketch**:

No schema change, in the first build or the amendment. The feature reads four existing tables.

| Table | Columns read | Purpose |
|---|---|---|
| `"user"` | `id`, `tenant_id`, `branch_id`, `role`, `is_active`, `created_at` | customer total, active count, and the monthly customers series |
| `rate_card` | `id`, `tenant_id`, `is_active` | rate card total and active count |
| `branch` | `id`, `tenant_id` | branch total |
| `invoice` | `id`, `tenant_id`, `amount`, `archived_at`, `created_at` | invoice count, revenue, and the monthly invoices series |

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/dashboard/stats` | GET | optional `branchId` query param | `total.rateCards { total, active }`, `total.branches { total }`, a corrected `total.invoices { total, revenueThisMonth, revenueTotal }`, and a six element `perMonth: number[]` on `total.customers` and `total.invoices` | session with role `superadmin`, `tenant-admin`, or `staff` | 401 unauthenticated |
| `/api/invoices` | GET | existing `search`, `page`, `limit`, `status`, `userId` | rows, `total`, and `counts` now exclude `archived_at IS NOT NULL` | session with role `superadmin`, `tenant-admin`, or `staff` | unchanged |
| `/api/invoices/trend` | GET | none | per day `total`, `paid`, `unpaid` now exclude `archived_at IS NOT NULL` | session with role `superadmin`, `tenant-admin`, or `staff` | unchanged |

**Value sourcing**:

| Value displayed | Source |
|---|---|
| Customer total and active count | existing `total.customers`, from `queryCustomerCount` or `queryCustomerCountRaw` over `"user"` where role is `customer` |
| Invoice count | new `total.invoices.total`, counting `invoice` rows where `archived_at IS NULL`, tenant scoped |
| Revenue this month | new `total.invoices.revenueThisMonth`, `SUM(invoice.amount)` over the same rows where `created_at` is in the current month |
| Rate card total and active count | new `queryRateCardCount` over `rate_card`, counting all rows and rows where `is_active` is true, tenant scoped |
| Branch total | new `queryBranchCount`, or `bRow.length` where `buildTenantStats` already loads the branches |
| Currency symbol for the revenue tile | `tenantCurrency` from `useDashboardData`, looked up from `useTenants()` by the tenant filter or the session tenant |
| Whether a single tenant is resolved | the same lookup: a tenant filter for a superadmin, or the session tenant otherwise |
| Role that gates the tiles | `stats.role` |
| Tile destinations | the static admin routes `/customers`, `/invoices`, `/rate-cards`, `/branches` |
| Tile sizes | `bentoRowSpans(tileCount)` from `components/bento.tsx` |
| Customers chart series | new `queryCustomerPerMonth`, a six integer `number[]` oldest month first: `"user"` where `role='customer'`, bucketed by `date_trunc('month', created_at)` over months M-5 through M (M = `date_trunc('month', CURRENT_DATE)` in the database timezone), scoped by the same filter as `queryCustomerCount` (tenant, plus branch where the payload is branch scoped), zero filled for empty months |
| Invoices chart series | new `queryInvoicePerMonth`, a six integer `number[]` oldest month first: `invoice` where `archived_at IS NULL`, over the same M-5 through M window, tenant scoped, zero filled for empty months |
| Whether the Customers chart is the large area chart | the tile's span, `bentoRowSpans(4)[0]`, which is `feature`, so `KpiCard` draws `AreaChart` |
| Chart window label | new `sparkUnit` prop on `KpiCard`, set to `month` for the business tiles (renders `6mo` in both the feature footer and the mini footer), default `day` |
| Whether the Invoices tile draws its chart | new `signalCount` prop on `KpiCard`, passed `total.invoices.total`, because the tile's `value` is a formatted currency string that parses to `NaN`; it overrides the signal and placeholder test only, never the displayed value |
| Revenue string on the Invoices tile | `formatCurrency` from `@/lib/currency` (full precision), not the abbreviated `formatCurrency` in `dashboard/utils` |
| Whether the invoices page shows a row | `invoice.archived_at IS NULL`, added to the list rows, the count, the `counts` conditions, and the trend |
| Whether a restored shipment's invoice returns | `POST /api/shipments/:id/restore` clears `invoice.archived_at` for that shipment's invoices and invalidates `invoices:list:*` |
| How soon the tile reflects an invoice write | `dashboard:*` cache invalidation added to the invoice create, patch, delete, and send handlers, matching the shipment handlers |

**Key invariants**:
- Every count is scoped by the caller's tenant, or across all tenants for an unfiltered superadmin. No count crosses a tenant boundary.
- A tenant admin's counts match the numbers their own list pages show for the same tenant.
- No tile links to a page when no tenant is resolved, since those pages return 400.
- A currency figure is only shown when one currency applies. Two currencies are never summed.
- The section is omitted entirely if a role can see no tile.
- A chart series and the tile value above it read the same rows with the same scope, so a chart can never disagree with its own tile.
- The business charts use a fixed six month window. The shipment range control never changes them.
- An archived invoice is absent from the live book, meaning both the dashboard tile and the `/invoices` list.
- A branch filtered `/invoices` page legitimately shows fewer rows than the tenant level Invoices tile. The comparison AC-4 makes is between the tile and the unfiltered page.

**Security model**:

Read only. Only an authenticated session with role `superadmin`, `tenant-admin`, or `staff` may call the endpoint, which the existing `requireRole` already enforces. Visibility of the tiles is decided in the admin UI by role, following the existing rule that revenue is hidden from staff. The API keeps carrying the counts for every role, exactly as it already carries revenue for staff today, so the UI is the gate and the payload is not treated as a secret store. That keeps the change consistent with the existing design instead of introducing a second, stricter policy at the API.

**Configuration required**: none.

**Critical test scenarios** (each maps to an acceptance criterion):
- Happy path: a tenant admin loads the dashboard and sees four tiles carrying the tenant's own customer, invoice, rate card, and branch numbers, verifies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**.
- Role restriction: a staff user loads the dashboard, and the DOM contains the Customers tile and none of the other three, verifies **AC-7**.
- Cross currency: a superadmin with no tenant filter sees the invoice count with a tenant count sublabel and no currency figure, verifies **AC-14**.
- No tenant links: the same unfiltered superadmin gets tiles with no link target, verifies **AC-8**.
- Tenant isolation: the two seeded tenants return different rate card, branch, and invoice totals, and neither equals the sum across both, verifies **AC-9**, **AC-11**.
- Source correctness: the Invoices tile count and revenue equal the `/invoices` page totals for the same tenant, verifies **AC-4**.
- Edge case: a tenant with no rate cards renders `0` on the Rate cards tile with no chart, verifies **AC-10**.
- Dead code: the build and type check pass with `operational-dashboard.tsx` gone, verifies **AC-15**.
- Growth chart: a tenant admin loads the dashboard, the Customers tile (the feature tile) shows a six point area chart that includes July's customers, and the Invoices tile shows six monthly bars that include August and September, verifies **AC-16**, **AC-17**.
- Window independence: changing the `RangeControl` from 1w to 1m leaves both business charts unchanged, and a monthly chart footer reads in months, verifies **AC-18**.
- Archived invoice: the Gajan tenant, which holds one archived invoice, shows the same invoice count on the tile and on the `/invoices` list, verifies **AC-4**, **AC-19**.
- Restore: restoring an archived shipment returns its invoice to the `/invoices` list and to the tile, verifies **AC-19**.
- Cache: creating an invoice moves the tile and its series without waiting out the 120 second cache, verifies **AC-20**.

## Build plan

Tracer Bullet, so the first slice runs end to end, from the query through to a visible tile, before the remaining tiles are added.

1. Confirm nothing consumes `total.invoices`, then correct it in the three builders to count and sum `invoice` rows, adding `queryInvoiceStats`, `queryRateCardCount`, and `queryBranchCount` to `apps/api/src/services/dashboard-stats.ts` and running them in the existing `Promise.all`, satisfies **AC-11**.
2. Extend `SuperTotal` in `apps/admin/components/dashboard/types.ts` and the `total` object in `dashboardStatsSchema` (`apps/admin/lib/validation.ts`) with the new keys, so a builder that forgets one fails the response check, satisfies **AC-11**.
3. Build the `BusinessOverview` component in `apps/admin/components/dashboard/`, with the Customers tile first as the end to end proof, then Invoices, Rate cards, and Branches, including the role gate, the link gate, and the revenue formatting, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-8**, **AC-10**, **AC-14**.
4. Wire the component into `SuperadminDashboard` under the `Business Overview` heading, passing the role and `tenantCurrency` through from `app/(dashboard)/page.tsx`, and delete `operational-dashboard.tsx` with its import, satisfies **AC-1**, **AC-7**, **AC-9**, **AC-15**.
5. Add the Business Overview placeholder to `DashboardSkeleton`, satisfies **AC-12**.
6. Write the component tests for the role gate, the link gate, and the zero case, then run lint, `check-types`, and the admin build, satisfies **AC-7**, **AC-8**, **AC-10**, **AC-13**.
7. Add `queryCustomerPerMonth` and `queryInvoicePerMonth` to `apps/api/src/services/dashboard-stats.ts`, each returning a six integer `number[]` oldest month first over months M-5 through M (zero filled), scoped to match their tile counts, run inside the existing `Promise.all` of all three builders, satisfies **AC-11**, **AC-16**, **AC-17**.
8. Extend `SuperTotal` and `Stats.total` in `apps/admin/components/dashboard/types.ts` with a required `perMonth: number[]` on `total.customers` and `total.invoices` (the only new members; `rateCards` and `branches` already exist), add it to `dashboardStatsSchema` in `apps/admin/lib/validation.ts`, and update the `smoke.test.ts` and `business-overview.test.tsx` fixtures, satisfies **AC-11**.
9. Add the `sparkUnit` and `signalCount` props to `KpiCard` (`apps/admin/components/kpi-card.tsx`), making `sparkUnit` replace the `d` suffix in both the feature footer and the mini footer, then give the two tiles their series in `business-overview.tsx`: the Customers tile keeps its `feature` span and draws the `AreaChart`, the Invoices tile draws `bars` and passes `signalCount`, and Rate cards and Branches stay chartless, satisfies **AC-10**, **AC-16**, **AC-17**, **AC-18**.
10. Exclude archived invoices from the list rows, the count, the `counts` conditions, and the trend in `apps/api/src/routes/invoices.ts`; clear `invoice.archived_at` for a shipment's invoices in the `/:id/restore` handler in `apps/api/src/routes/shipments.ts`, and invalidate `dashboard:*` in the invoice create, patch, delete, and send handlers, satisfies **AC-4**, **AC-19**, **AC-20**.
11. Extend the component tests for the charted tiles, the chartless tiles, the month label, and the `perMonth` fixtures, then re-run lint, `check-types`, the admin tests, and the build, satisfies **AC-10**, **AC-16**, **AC-17**, **AC-18**, **AC-20**.

## Consequences

**Positive**:
- The dashboard answers both the flow question and the size question without leaving the page.
- One read path stays one read path, so tenant isolation keeps a single enforcement point.
- `total.invoices` finally matches its name, and it is validated by a test rather than left to drift.
- The dead dashboard component is gone, so there is one dashboard implementation to maintain.
- The board shows momentum, so a flat total no longer reads as no activity.
- The Invoices tile and the page it links to finally agree, and archived data stays out of both.
- Invoice writes now move the tile immediately, because the write handlers invalidate the dashboard cache.

**Negative / tradeoffs**:
- The `total` block is now the contract for more numbers, and a builder that forgets one fails the response validation rather than passing quietly.
- The counts lag reality by up to 120 seconds behind the shared stats cache. Invoice writes now invalidate that cache, but rate card and branch writes still do not, so those tiles can lag a write.
- Staff accounts still receive the hidden numbers in the payload, because the restriction is presentational, matching the existing revenue rule. Tightening that policy later needs a server change.
- An unfiltered superadmin gets a quieter Invoices tile, with a count and no revenue figure, which is less information than the platform owner might expect.
- The dashboard now carries two time windows: a 7, 14, or 30 day range control and a fixed six month business window. Each is labelled, but the page level control sits above the business board and may read as if it governs it.
- The stats payload grows by two six point arrays and the endpoint runs two more queries in its parallel round, so the cached payload is larger. The 120 second cache lifetime is unchanged.
- Rate cards and Branches stay flat, so the board is deliberately uneven.
- The invoices page now hides auto archived invoices, so rows that showed yesterday are gone, and the detail, PDF, and send endpoints still serve them by direct link.
- The fixed window self expires. If a tenant adds no rows for six months the series is all zeros and the no signal rule drops both charts again. That is honest, since no growth means nothing to plot, but the charts are not permanent fixtures for a quiet tenant.

**Neutral**:
- No database migration.
- Correcting `total.invoices` changes the meaning of a shipped response key. It is safe only because no screen reads it today, which the build must confirm first.
- `KpiCard` gains two optional props, so every other call site is unchanged unless it opts in.
- The two charted tiles use different chart forms, a feature area chart and a mini bar row, because the Customers tile leads the mosaic. The tile grammar is shared; the chart form follows the tile size.

## Follow-up

- [ ] The staff stats cache key (`dashboard:stats:staff`) does not include the branch, so two staff users in different branches of one tenant can share a cached payload for up to 120 seconds. Pre-existing, and this spec does not change it, but it makes any branch scoped promise on the dashboard unreliable.
- [ ] The invoice detail, PDF, and send endpoints still serve an invoice whose `archived_at` is set, by direct link. The list now hides it, so this is a smaller inconsistency than before. Decide whether the detail should return 404 for an archived invoice.
- [ ] The Invoices tile is tenant level while the `/invoices` page is branch filtered, so a branch filtered page shows fewer rows than the tile. Narrowing the tile to one branch would need a join to `shipment` and would change what the invoice book means.
- [ ] `validateResponse` warns and returns unvalidated data outside production, so a builder that omits a required `perMonth` fails the dashboard only in production. A cheap server side test that each builder returns six points would catch it earlier.
- [ ] `RangeControl` sits above the whole dashboard but drives only the shipment board, while the business charts use a fixed six month window. If the two windows read as one control in use, move the range control inside the `Shipment Overview` section.
- [ ] The business tiles carry no delta pill, by decision; the chart shows direction. If a percentage is wanted later, compute it from the same six point series with `seriesTrend`, which needs at least four points.
- [ ] The per tenant and per branch tables format revenue with no currency code, so they always print the rupee symbol. Lanka Mahal revenue is shown with the wrong symbol there today.
