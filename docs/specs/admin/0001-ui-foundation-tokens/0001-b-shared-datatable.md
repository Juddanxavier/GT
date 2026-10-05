# 0001-b. Shared DataTable

Part of umbrella [0001](index.md). Supports the table approach decision.

## Summary

One shared data table replaces the hand built tables on the admin lists. It is built on TanStack Table (a headless table library: it provides the sorting and selection logic, we render it with the existing HeroUI look) and ships with sorting, pagination, column visibility, row selection, and column resize. The shipments list is the first page to use it.

## Requirements

**User stories**:
- As an admin, I want to sort, page, hide columns, select rows, and resize columns on any list so that I can work the same way everywhere.
- As an admin developer, I want one table component so that a new list is a column definition, not a copied page.

**Acceptance criteria**:
- **AC-B1**: The shared `DataTable` is server driven and generic over a row type: it takes column definitions, the current page data, the total count, and controlled state (sort, page, page size, visibility, selection), and emits changes through callbacks. Its exact signature is fixed in the table contract below.
- **AC-B2**: Column sorting is controlled and reflected to the caller, which may write it to the URL. Single column sort only, toggling ascending, descending, then off.
- **AC-B3**: Pagination is controlled, with the total count supplied by the caller. The table renders a soft loading overlay when the caller passes `isFetching` (the smooth page change behavior lives in the page's query via `placeholderData: keepPreviousData`, not in the table).
- **AC-B4**: Column visibility can be toggled, replacing the current per page preferences visibility UI. Density is out of scope for this feature; `table-preferences.tsx` keeps owning density until a later slice.
- **AC-B5**: Row selection is controlled, emitting the selected row ids via a required `getRowId`, and is ready for the bulk actions feature. Selection is scoped to the current page, and the table shows a note when selected rows are not all visible, so a page change does not silently drop a selection. Selected ids are held by the page, not the table, so they survive pagination.
- **AC-B6**: Columns can be resized by dragging, with widths held in the table's state. This means widths reset on remount and route change; persistence is deferred. The table sets a default minimum width (80px) and default max (600px), overridable per column.
- **AC-B7**: The table is WCAG AA: keyboard operable, sortable headers announced with `aria-sort`, selection announced, and a visible focus ring from the shared focus rule.
- **AC-B8**: The shipments list uses the shared table and behaves at least as well as the page it replaces.

## Decision

**Chosen option**: A controlled, server driven table on TanStack Table with column resize now and virtualization deferred.

**Implementation skills**: none.

## Inline rationale

TanStack Table is headless, so the admin keeps its existing HeroUI visual language while gaining the table logic for free and avoiding hand rolled sort and selection. Making the table fully controlled (props in, callbacks out) keeps it free of Next.js routing, so a page decides whether it deep links its filters. Server driven mode matches the API's pagination and keeps large lists fast. Column resize is cheap in TanStack; virtualization is deferred because the lists are paginated and it would add complexity with no current payoff.

## Table contract

- The table owns no data fetching and imports no query hook. It receives data and state as props.
- Props (fixed for this feature):
  - `data: T[]` (the current page), `columns: ColumnDef<T>[]`, `total: number`, `getRowId: (row: T) => string` (required).
  - Controlled state: `sorting`, `pagination: { pageIndex, pageSize }`, `columnVisibility`, `rowSelection`.
  - Status flags: `isLoading` (first load), `isFetching` (background refetch).
  - Callbacks: `onSortingChange`, `onPaginationChange`, `onColumnVisibilityChange`, `onRowSelectionChange`.
  - Slots: `emptyState`, `errorState`, `loadingState` (each an optional node; sensible defaults when omitted), plus `error?: Error | null`.
  - `total` is what drives the page count; `pageSize` default 10, options `[10, 25, 50]`.
- Column definitions may declare a cell renderer, a header, an enable flag (sortable, resizable, hideable), a fixed `size`, and a `minSize`.
- The table renders the shared empty, error, and loading states through slots rather than requiring the page to branch.
- Row selection uses `getRowId` so ids are stable and collision free; the page holds the selected id set, so it survives pagination.
- The only new dependency is `@tanstack/react-table` (v8), which includes column resizing; no separate resize helper package is added.

## Value sourcing

| Action | Value produced | Source |
|---|---|---|
| Render rows | row data | props from the page |
| Sort | sort key, direction | controlled prop, emitted via callback |
| Paginate | page index, page size | controlled prop, emitted via callback |
| Show total | total records | the page's paginated API response |
| Select | selected row ids | controlled prop emitted via callback, `getRowId` from the page |
| Show busy | loading and fetching flags | `isLoading` / `isFetching` from the page's query |
| Resize | column widths | table internal state (resets on remount; persistence deferred) |

## Build plan

1. Add `@tanstack/react-table` (v8) and fix the generic signature and slot keys above, satisfies **AC-B1**.
2. Build the table shell: column definitions, controlled sorting, controlled pagination with the loading overlay, satisfies **AC-B1**, **AC-B2**, **AC-B3**.
3. Add column visibility and controlled row selection with `getRowId` and the cross page selection note, satisfies **AC-B4**, **AC-B5**.
4. Add column resize with default min and max widths, satisfies **AC-B6**.
5. Accessibility and keyboard pass on the table, satisfies **AC-B7**.
6. Migrate the shipments list to the shared table, satisfies **AC-B8**.

## Consequences

**Positive**: one table for all lists; selection unlocks bulk actions; sorting and resize come without hand rolling them.

**Negative**: a new dependency surface; every list page must eventually migrate; the table's API must stay stable or the migrations churn; resize widths do not persist across remounts (a regression from the current stored preferences).

**Neutral**: virtualization is deliberately out; density stays with `table-preferences.tsx` for now; the table is shaped so both can be added later.

## Follow-up

- [ ] Revisit virtualization when a list is shown unpaginated or grows large enough to need it.
- [ ] Move density into the shared table when a later slice touches `table-preferences.tsx`.