'use client';

import { useMemo, type KeyboardEvent, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';

export type {
  ColumnDef,
  OnChangeFn,
  PaginationState,
  RowSelectionState,
  SortingState,
  VisibilityState,
};

export interface DataTablePagination {
  pageIndex: number;
  pageSize: number;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  total: number;
  getRowId: (row: T) => string;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  pagination: DataTablePagination;
  onPaginationChange: OnChangeFn<DataTablePagination>;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: OnChangeFn<VisibilityState>;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: Error | null;
  emptyState?: ReactNode;
  errorState?: ReactNode;
  loadingState?: ReactNode;
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  getRowClassName?: (row: T) => string | undefined;
  enableRowSelection?: boolean | ((row: T) => boolean);
  density?: 'comfortable' | 'compact';
  ariaLabel: string;
  className?: string;
}

/** Shared server-driven data table. Fully controlled: sort, page, visibility,
 * and selection arrive as props and leave through callbacks. The caller fetches
 * and renders its own pager; the table renders the grid plus state slots. */
export function DataTable<T>({
  data,
  columns,
  total,
  getRowId,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  columnVisibility,
  onColumnVisibilityChange,
  rowSelection,
  onRowSelectionChange,
  isLoading = false,
  isFetching = false,
  error = null,
  emptyState,
  errorState,
  loadingState,
  onRowClick,
  onRowDoubleClick,
  getRowClassName,
  enableRowSelection = false,
  density = 'comfortable',
  ariaLabel,
  className,
}: DataTableProps<T>) {
  const cellPadding = density === 'compact' ? 'px-4 py-1' : 'px-4 py-2';
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / Math.max(1, pagination.pageSize))),
    [total, pagination.pageSize],
  );

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount,
    rowCount: total,
    autoResetAll: false,
    enableMultiSort: false,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    enableRowSelection:
      typeof enableRowSelection === 'function'
        ? (row: Row<T>) => enableRowSelection(row.original)
        : enableRowSelection,
    state: {
      sorting,
      pagination: { pageIndex: pagination.pageIndex, pageSize: pagination.pageSize },
      columnVisibility,
      rowSelection,
    },
    onSortingChange,
    onPaginationChange: onPaginationChange as OnChangeFn<PaginationState>,
    onColumnVisibilityChange,
    onRowSelectionChange,
    defaultColumn: { minSize: 80, maxSize: 600, size: 150 },
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;
  const leafColumns = table.getAllLeafColumns();

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );
  const visibleIds = useMemo(() => new Set(data.map((row) => getRowId(row))), [data, getRowId]);
  const hiddenSelectedCount = selectedIds.filter((id) => !visibleIds.has(id)).length;

  /* A row carries its own click and keyboard activation. Activations that
   * originate inside a real control (copy button, actions menu, checkbox)
   * belong to that control, not the row, so the row handler stands down. */
  const isInsideControl = (target: EventTarget | null): boolean =>
    target instanceof Element &&
    target.closest(
      'button, a, input, select, textarea, summary, [role="button"], [role="link"], ' +
        '[role="checkbox"], [role="switch"], [role="option"], [role="tab"], ' +
        '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], ' +
        '[contenteditable="true"]',
    ) !== null;

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick) return;
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(row);
    }
  };

  if (isLoading) {
    return (
      <div className={className}>
        {loadingState ?? <LoadingState columns={Math.max(1, leafColumns.length)} />}
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        {errorState ?? <ErrorState message={error.message || 'Failed to load data'} />}
      </div>
    );
  }

  return (
    <div className={className}>
      {hiddenSelectedCount > 0 ? (
        <p className="px-4 py-2 text-xs text-muted" role="status">
          {hiddenSelectedCount} selected {hiddenSelectedCount === 1 ? 'row is' : 'rows are'} not on
          this page
        </p>
      ) : null}
      <div className="relative overflow-x-auto">
        {isFetching && data.length > 0 ? (
          <div
            className="absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse"
            style={{ backgroundColor: 'var(--accent)' }}
            aria-hidden="true"
          />
        ) : null}
        <table aria-label={ariaLabel} aria-busy={isFetching} className="w-full text-sm">
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b text-left"
                style={{ borderColor: 'var(--border)' }}
              >
                {enableRowSelection !== false && headerGroup.headers.length > 0 ? (
                  <th scope="col" className={`w-10 ${cellPadding}`}>
                    <input
                      type="checkbox"
                      aria-label="Select all rows on this page"
                      checked={table.getIsAllPageRowsSelected()}
                      ref={(el) => {
                        if (el)
                          el.indeterminate =
                            table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected();
                      }}
                      onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
                      className="cursor-pointer"
                      style={{ accentColor: 'var(--accent)' }}
                    />
                  </th>
                ) : null}
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        canSort
                          ? sorted === 'asc'
                            ? 'ascending'
                            : sorted === 'desc'
                              ? 'descending'
                              : 'none'
                          : undefined
                      }
                      className={`relative ${cellPadding} text-xs font-medium text-muted`}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="inline-flex cursor-pointer select-none items-center gap-1"
                          onClick={header.column.getToggleSortingHandler()}
                          aria-label={`Sort by ${String(header.column.columnDef.header ?? header.id)}`}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? ' ▲' : sorted === 'desc' ? ' ▼' : null}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                      )}
                      {header.column.getCanResize() ? (
                        <hr
                          aria-orientation="vertical"
                          aria-label={`Resize ${String(header.column.columnDef.header ?? header.id)} column`}
                          aria-valuenow={Math.round(header.getSize())}
                          aria-valuemin={header.column.columnDef.minSize ?? 80}
                          aria-valuemax={header.column.columnDef.maxSize ?? 600}
                          tabIndex={0}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onDoubleClick={() => header.column.resetSize()}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                              e.preventDefault();
                              const delta = e.key === 'ArrowLeft' ? -20 : 20;
                              const id = header.column.id;
                              table.setColumnSizing((old) => ({
                                ...old,
                                [id]: Math.max(80, (old[id] ?? header.getSize()) + delta),
                              }));
                            } else if (e.key === 'Enter') {
                              header.column.resetSize();
                            }
                          }}
                          className="absolute top-0 right-0 m-0 h-full w-2 cursor-col-resize touch-none select-none border-0"
                          title="Drag to resize, double-click or Enter to reset, arrow keys to resize"
                        />
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={leafColumns.length + 1}>
                  {emptyState ?? (
                    <EmptyState
                      title="No results"
                      description="Nothing matches the current filters."
                    />
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const selected = row.getIsSelected();
                const extra = getRowClassName?.(row.original);
                return (
                  <tr
                    key={row.id}
                    onClick={
                      onRowClick
                        ? (e) => {
                            if (!isInsideControl(e.target)) onRowClick(row.original);
                          }
                        : undefined
                    }
                    onDoubleClick={
                      onRowDoubleClick
                        ? (e) => {
                            if (!isInsideControl(e.target)) onRowDoubleClick(row.original);
                          }
                        : undefined
                    }
                    onKeyDown={onRowClick ? (e) => handleRowKeyDown(e, row.original) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    className={[
                      'border-b transition-colors',
                      onRowClick ? 'cursor-pointer' : '',
                      selected ? 'bg-accent/[0.06]' : '',
                      extra ?? '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ borderColor: 'var(--border)' }}
                    aria-selected={enableRowSelection ? selected : undefined}
                  >
                    {enableRowSelection !== false ? (
                      <td
                        className={cellPadding}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select row ${row.id}`}
                          checked={selected}
                          disabled={!row.getCanSelect()}
                          onChange={(e) => row.toggleSelected(e.target.checked)}
                          className="cursor-pointer"
                          style={{ accentColor: 'var(--accent)' }}
                        />
                      </td>
                    ) : null}
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cellPadding}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
