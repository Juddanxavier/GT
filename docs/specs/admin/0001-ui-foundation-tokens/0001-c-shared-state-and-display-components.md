# 0001-c. Shared state and display components

Part of umbrella [0001](index.md). Supports the component set and status source decisions.

## Summary

A small set of shared pieces rounds out every list page: `EmptyState`, `ErrorState`, and `LoadingState` for the three situations a fetch can be in; `PageHeader` for the title and actions row; `FilterBar` for the filter controls; and `StatusBadge` for a shipment's status. The status badge reads one shared status config, so the admin's labels and colors stop drifting from the rest of the system.

## Requirements

**User stories**:
- As an admin, I want the empty, error, and loading states to look the same everywhere so that the tool feels consistent.
- As an admin developer, I want a page header and a filter bar so that list pages line up without custom layout each time.
- As a maintainer, I want the status badge to read one shared config so that adding a status is a one file change.

**Acceptance criteria**:
- **AC-C1**: `EmptyState`, `ErrorState`, and `LoadingState` exist in `@repo/ui`, render in both themes, and are wired as `DataTable` slots.
- **AC-C2**: `EmptyState` accepts an optional action, so a list can offer a call to action rather than a blank panel.
- **AC-C3**: `ErrorState` accepts a message and an optional retry callback.
- **AC-C4**: `LoadingState` provides a skeleton that matches the table's shape.
- **AC-C5**: `PageHeader` renders a title, an optional description, an optional breadcrumb slot, and an actions slot.
- **AC-C6**: `FilterBar` is a generic layout shell: it renders a row of filter controls passed as children, plus an optional `onClear` action, and stays usable on small viewports. It is not tied to shipment statuses.
- **AC-C7**: `StatusBadge` renders every shipment status from the shared status config, shows a non color signal (an icon or a text label) alongside its color, and is used on the shipments list. Its swatches intentionally change to the shared semantic tokens, so it does not need to match the current hardcoded colors.
- **AC-C8**: The shared status config in `@repo/ui` is the single source of status labels, colors, and filter groups for admin and `@repo/ui`. `apps/admin/lib/status-config.ts` is replaced by re-exports. The admin's four group KPI set (Pending, In Transit, Delivered, Exception) is kept as a filtered subset of the shared five groups, so the dashboard is unchanged. The dead `cancelled` group is removed from the badge. No `cancelled` internal status is added. Every status maps to a token pair that exists in the shared sheet.

## Decision

**Chosen option**: One shared status config plus the six display components.

Extend `@repo/ui/status-config.ts` and `@repo/types/status` into the single status vocabulary, and build `EmptyState`, `ErrorState`, `LoadingState`, `PageHeader`, `FilterBar`, and `StatusBadge` in `@repo/ui`.

**Implementation skills**: none.

## Inline rationale

These six are the pieces a list page needs beyond the table itself, and each is currently duplicated per page. The status badge must read the shared config, not a local copy, because the two have already forked: the shared config lacks the admin's `cancelled` group and uses semantic names while the badge hardcodes Tailwind classes. Settling on the shared config as the source removes that class of bug. Wiring the three states as table slots means every list gets correct behavior with no per page branching.

## Status config contract

- `@repo/types/status` owns the status names and their human labels (nine statuses, unchanged).
- `@repo/ui/status-config.ts` owns the semantic color per status, the group mapping, and `FILTER_GROUPS` (five groups: Pending, In Transit, Delivered, Exception, Available for Pickup).
- A status's color resolves to a semantic token pair (a strong color plus a soft background and its foreground), never a raw Tailwind color class.
- `StatusBadge` always renders label text or an icon with the color, so color is not the only signal.
- Adding a status is a change to the shared config and `@repo/types/status` only.

**Status to token mapping** (each row is the pair the badge renders; the shared sheet must define every token named here):

| Status | Semantic color | Strong token | Soft background | Soft foreground |
|---|---|---|---|---|
| pending | warning | `--warning` | `--warning-soft` | `--warning-soft-foreground` |
| info_received | warning | `--warning` | `--warning-soft` | `--warning-soft-foreground` |
| in_transit | primary | `--primary` | `--primary-soft` (new) | `--primary-soft-foreground` (new) |
| out_for_delivery | primary | `--primary` | `--primary-soft` (new) | `--primary-soft-foreground` (new) |
| failed_attempt | danger | `--danger` | `--danger-soft` | `--danger-soft-foreground` |
| delivered | success | `--success` | `--success-soft` | `--success-soft-foreground` |
| exception | danger | `--danger` | `--danger-soft` | `--danger-soft-foreground` |
| expired | default | `--default` | `--default-soft` (new) | `--default-soft-foreground` (new) |
| available_for_pickup | secondary | `--secondary` (new) | `--secondary-soft` (new) | `--secondary-soft-foreground` (new) |

`--primary` already exists (it maps to `--accent`). The new tokens (`--primary-soft`, `--default-soft`, `--secondary`, `--secondary-soft`, and their foregrounds) are added to the shared sheet in `0001-a`, in both themes. This is the intentional visible change: `in_transit` and `out_for_delivery` move from the current blue and violet to the accent driven primary, and `available_for_pickup` gains a real secondary color.

## Value sourcing

| Action | Value displayed | Source |
|---|---|---|
| StatusBadge label | human label | `@repo/types/status` |
| StatusBadge color | token pair | `@repo/ui/status-config.ts` (mapping table above) |
| FilterBar controls | filter nodes | passed by the page as children |
| ErrorState message | message | passed by the page |
| EmptyState action | label and handler | passed by the page |
| LoadingState shape | row and column count | table props (column count) and the table's default row count (8) |

## Build plan

1. Reconcile the status vocabulary: make `@repo/ui/status-config.ts` the single source with five groups, replace `apps/admin/lib/status-config.ts` with re-exports keeping the four group KPI subset, remove the dead `cancelled` group, and apply the mapping table, satisfies **AC-C8**.
2. Confirm the added tokens exist in the shared sheet (from `0001-a`), then build `StatusBadge` on the shared config with a non color signal, satisfies **AC-C7**.
3. Build `EmptyState` (optional action), `ErrorState` (message plus optional retry), `LoadingState` (skeleton matching the table shape), satisfies **AC-C1**, **AC-C2**, **AC-C3**, **AC-C4**.
4. Wire the three states as `DataTable` slots, satisfies **AC-C1**.
5. Build `PageHeader` (title, description, breadcrumb slot, actions slot) and `FilterBar` (children plus clear), satisfies **AC-C5**, **AC-C6**.
6. Use the components on the shipments list and update `status-groups.test.ts` to the re-exported imports, satisfies **AC-C7**.

## Consequences

**Positive**: consistent states across lists; a single status source; the empty state can guide the user instead of showing nothing.

**Negative**: the components must stay generic enough not to need a fork per page; the status reconciliation touches several admin files (`lib/status-config.ts`, the badge, the KPI consumers, and the test).

**Neutral**: `StatusBadge` currently lives in the admin app; the shared version replaces it and the local copy is removed. The customer and Lanka Mahal apps have their own `lib/status.ts` and are read only, so the `@repo/types/status` change (none, since the type file is not edited) does not reach them.

## Follow-up

- [ ] Decide in a later pass whether the customer and Lanka Mahal apps adopt the shared status config or keep their local extras (`cancelled`, `delivery_failure`). This feature leaves them as they are.