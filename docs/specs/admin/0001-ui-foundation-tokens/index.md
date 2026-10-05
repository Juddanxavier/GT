# 0001. Reusable admin UI foundation (Status: Proposed)

**Date**: 2026-10-05
**Status**: In Progress

## Summary

Right now each admin page builds its lists, filters, and states by hand, and the shared `@repo/ui` package holds almost nothing. This decision stands up one shared design system for the admin tool: the color and spacing tokens in one place, and a small set of reusable pieces (a data table, a filter bar, empty, error, and loading states, a page header, a status badge). It means every later redesign builds from the same parts instead of repeating markup, and the look stays consistent in both light and dark mode.

## Structure

This umbrella groups three related build specs. Each is self sufficient and links the decision it supports. The umbrella owns the shared contract that all three obey.

- [0001-a-shared-tokens-and-designmd](0001-a-shared-tokens-and-designmd.md): where the tokens live and the admin design contract, supports the token authority and design doc decisions.
- [0001-b-shared-datatable](0001-b-shared-datatable.md): the shared table built on TanStack Table, supports the table approach decision.
- [0001-c-shared-state-and-display-components](0001-c-shared-state-and-display-components.md): empty, error, loading, page header, filter bar, and status badge, supports the component set and status source decisions.

## Cross child contract

These rules bind all three children. A build that breaks one breaks the umbrella.

- **Tokens are the single source of truth.** No component in `@repo/ui` hardcodes a hex value or a raw Tailwind color. Every color comes from a semantic token (`--background`, `--surface`, `--foreground`, `--border`, `--accent`, and the status soft or strong pairs). This mirrors the rule already written in the customer app design doc.
- **Components are headless of data.** Nothing in `@repo/ui` imports `apps/admin`, calls the API, or reads a query hook. Data, fetch state, and callbacks arrive as props. The one shared data file is the status config, which is pure data derived from `@repo/types`.
- **Light and dark are equal citizens.** Every component is verified in both themes before it counts as done. The admin is dark first, so a dark only pass is not acceptable.
- **Accessibility is part of done, not a later sweep.** WCAG AA: keyboard operable, a visible focus ring, a non color signal for every status, and correct roles and live regions. A component that only signals by color is not done.
- **One status vocabulary for admin and `@repo/ui`.** The status badge, the shipment table, and the filter groups read the same shared status config from `@repo/ui` (`status-config.ts`), which is derived from `@repo/types/status`. Adding a status is a change to the shared config plus the type file, not a per app copy. The customer and Lanka Mahal apps are out of scope and keep their own local status files in this feature.
- **Only the movable CSS moves.** Tailwind v4 requires `@theme`, `@theme inline`, and `@custom-variant` to live in the consuming app's entry stylesheet, so they stay in `apps/admin/app/globals.css`. Only the token variable blocks (light and dark) and framework neutral utility classes move to the shared sheet. The shared sheet also carries the focus ring rule, so components keep a visible focus ring outside admin.
- **Build with the project approach.** The project default is Tracer Bullet: stand up a thin end to end path (tokens imported, one real table rendering real shipment data) before widening. Order every child's build plan that way.

## Requirements

**User stories**:
- As an admin developer, I want one shared set of tokens and components so that a new page looks consistent without copying styles from another page.
- As an admin, I want status, empty, and error states to look and behave the same everywhere so that the tool feels like one product.
- As a keyboard or screen reader user, I want the shared components to be operable and announced correctly so that I can use the admin without a mouse.
- As a maintainer, I want the status labels and colors defined once so that adding a status does not require three edits.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: The admin app imports its tokens from a single shared CSS file in `@repo/ui`; the admin `globals.css` no longer defines the moved token set itself, and the app renders identically in light and dark mode apart from the intentional status badge change (AC-6).
- **AC-2**: An admin `DESIGN.md` exists and documents typography, color tokens, spacing, and component rules, matching the pattern used by `apps/customer` and `apps/lanka-mahal`.
- **AC-3**: A shared `DataTable` renders server paginated data with column sort, pagination, column visibility, row selection, and column resize, and is consumed by the shipments list as the proof page.
- **AC-4**: `EmptyState`, `ErrorState`, and `LoadingState` render through `DataTable` slots, so a list shows the right state with no per page wiring.
- **AC-5**: `PageHeader`, `FilterBar`, and `StatusBadge` exist in `@repo/ui` with documented props and are used by the shipments page.
- **AC-6**: All shared components pass the WCAG AA checks named in the cross child contract and render correctly in both themes. The status badge is exempt from the "renders identically to today" check, because its swatches intentionally change from the current hardcoded colors to the shared semantic tokens (see `0001-c`).
- **AC-7**: The shared status config in `@repo/ui` is the single source of status labels, colors, and filter groups for the admin and `@repo/ui`, and the admin badge and `apps/admin/lib/status-config.ts` consumers read from it rather than a local copy. The customer and Lanka Mahal apps are unchanged. There is no `cancelled` internal status: the admin badge's current `cancelled` group maps no status and is removed, not promoted.

## Decision

**Chosen option**: Option 1: Promote and standardize, then migrate one page (strangler, thin thread first).

Build the shared foundation in `@repo/ui` (tokens, table, states, header, filter bar, badge), then adopt it on the shipments list only. Every other admin page keeps working and migrates in its own slice.

**Implementation skills**: none. The relevant conventions live in the repo's own docs (`apps/customer/DESIGN.md` is the pattern to mirror, `packages/ui/src/status-config.ts` and `@repo/types/status` define the status vocabulary). No installed community skill materially shapes this design.

## Rationale

Reasoning, options, and the current state inventory: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**: no persistence. The shared data is the status vocabulary. `@repo/types/status` names the nine internal statuses and their labels. `@repo/ui/status-config.ts` maps each to a semantic color and a filter group, and defines `FILTER_GROUPS`. Reconciliation decisions:

- `@repo/ui/status-config.ts` becomes the single source aligned to `@repo/types/status`, with five filter groups: Pending, In Transit, Delivered, Exception, Available for Pickup.
- `apps/admin/lib/status-config.ts` is replaced by re-exporting from `@repo/ui`; its four group KPI set (Pending, In Transit, Delivered, Exception) becomes a filtered subset of the shared groups, so the dashboard and its test keep working with no behavior change.
- The admin badge's `cancelled` group is dead (no status maps to it) and is removed. No `cancelled` internal status is added, because that would touch the API event map, shipment providers, and the database.
- `INVOICE_STATUS_COLORS` stays in the admin app (invoice states are not shipment statuses).
- The customer and Lanka Mahal apps keep their own `lib/status.ts` and are out of scope.

**State transitions**: none.

**API surface**: none. This is a front end foundation; it consumes the existing list endpoints.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Table renders a row | cell values | props from the page (page's query hook) |
| Table sorts a column | sort key + direction | controlled props, emitted via callback |
| Table paginates | page index + page size | controlled props, emitted via callback |
| Table shows row count | total records | the page's paginated API response |
| StatusBadge shows a label and color | label, color | `@repo/ui/status-config.ts` derived from `@repo/types/status` |
| FilterBar shows filter groups | group names | `FILTER_GROUPS` from the shared status config |
| ErrorState shows a message | message | the page passes the error it received |

**Key invariants**:
- No hex value or raw Tailwind color inside any `@repo/ui` component.
- No `@repo/ui` component imports from `apps/admin` or calls the API.
- Every shared component renders correctly under both `[data-theme="dark"]` and the light default.
- Adding a new shipment status requires editing only the shared config and `@repo/types/status`.

**Security model**: unchanged. All components are presentation only; the admin's existing role gates, tenant header, and session handling are untouched.

**Configuration required**: none.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: the shipments page renders the shared table with real data, sorts, changes page, hides a column, selects a row, and resizes a column, verifies **AC-3**, **AC-5**.
- State path: an empty result and a failed fetch each render the shared empty and error states through the table slots, verifies **AC-4**.
- Theme path: every shared component renders in dark and light with no hardcoded color leaking through, verifies **AC-1**, **AC-6**.
- Status path: a shipment with a newly added status renders its label and color from the shared config alone, verifies **AC-7**.
- Accessibility path: the table is fully keyboard operable and every status carries a non color signal, verifies **AC-6**.

## Build plan

Ordered as a Tracer Bullet thin thread first, then widening. Each task names the criteria it satisfies.

1. Promote the admin token set into a shared CSS file in `@repo/ui` and import it from the admin app; confirm both themes render identically, satisfies **AC-1**.
2. Write the admin `DESIGN.md` as the design contract, satisfies **AC-2**.
3. Reconcile the status vocabulary: `@repo/ui/status-config.ts` becomes the single source aligned to `@repo/types/status`; replace `apps/admin/lib/status-config.ts` with re-exports; keep the admin four group KPI set as a filtered subset; remove the dead `cancelled` group; define every status to token mapping (see `0001-c`); update `status-groups.test.ts` if the re-export changes its import shape, satisfies **AC-7**.
4. Build the shared `DataTable` on TanStack Table with the required features, satisfies **AC-3**.
5. Build `EmptyState`, `ErrorState`, `LoadingState` and wire them as table slots, satisfies **AC-4**.
6. Build `PageHeader`, `FilterBar`, `StatusBadge`, satisfies **AC-5**.
7. Migrate the shipments list page to the shared table, header, filter bar, and badge as the end to end proof, satisfies **AC-3**, **AC-5**, **AC-6**.
8. Accessibility and theme pass across all shared components, satisfies **AC-6**.

## Consequences

**Positive**:
- Every later admin slice starts from shared parts, so the redesign does not repeat markup.
- One status definition removes a class of drift bugs (the badge and the shared config disagreeing).
- WCAG AA is designed in once rather than retrofitted per page.

**Negative / tradeoffs**:
- `@repo/ui` gains real weight and must now be maintained as a library, with its own build and type checks passing.
- TanStack Table plus the `@tanstack/react-table` and column resize helpers is a new dependency surface, and every list page migrates eventually.
- Moving tokens out of the admin app touches the whole app's styling at once, so a token mistake is visible everywhere.

**Neutral**:
- Only one page migrates in this feature; the rest keep their current inline styling until their own slice.
- Virtualization is deferred; the table is built so it can be added later without a rewrite.

## Follow-up

- [ ] Confirm whether `apps/customer` or `apps/lanka-mahal` should adopt the shared tokens in a later pass, or keep their own Stripe inspired docs. This spec keeps them untouched.
- [ ] Add a lint or convention guard against hardcoded colors in `@repo/ui` (a review rule at minimum) so the invariant does not erode.
- [ ] Verify the critical scenarios by hand on the real app (the project workflow is Alpha, so `/check verify` is the gate) and add vitest cases for the status reconciliation, extending the existing `apps/admin/__tests__/status-groups.test.ts`. Note: the stack doc in `AGENTS.md` says "no test runner", which is stale; `apps/admin` has vitest configured. Update that line in a later `/sync`.

## Migration plan

**Strategy**: strangler. The shared foundation is built alongside the current inline styles; pages migrate one at a time.

**Phases**:
1. Add tokens and components to `@repo/ui`; nothing consumes them yet, so no page changes.
2. Adopt on the shipments list only; the other pages are untouched and keep working.
3. Later slices migrate each remaining page and retire its inline styles.

**Rollback**: revert the shipments page migration commit; the shared package can stay in place unused without affecting other pages.

**Risks**:
- A token move that changes a value subtly shifts the whole app's appearance. Mitigate by making the move additive in two commits (define the shared variables and import them while the admin definitions remain, diff rendered pages in both themes, then delete the admin copies). The status badge is an expected, intended change and is excluded from the identical-render check.
- Workspace CSS resolution is unverified under Next 16 with Tailwind v4. The shared sheet needs an explicit `./tokens.css` export in `@repo/ui/package.json` and a confirmed import specifier in the admin entry; if the workspace path does not resolve, the fallback is a copy step. This is the first build task, so it fails fast.
- The status reconciliation could subtly change the dashboard KPI grouping. Mitigate by keeping the admin four group set as a filtered subset and by the existing `status-groups.test.ts` staying green.
- A shared table built too rigidly forces later slices to fork it. Mitigate by keeping it headless of data and controlled, per the cross child contract.