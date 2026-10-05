'use client';

import { useMemo, useRef } from 'react';
import { Eye, MoreVertical, Pencil, Trash2, Clock, ChevronDown, FileDown, Printer, Tags } from 'lucide-react';
import {
  Button,
  Dropdown,
  Input,
  ListBox,
  Pagination,
  Select,
  Tabs,
  type Key,
  type SortDescriptor,
} from '@heroui/react';
import {
  DataTable,
  type ColumnDef as DataTableColumn,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@repo/ui/data-table';
import { EmptyState } from '@repo/ui/empty-state';
import { ErrorState } from '@repo/ui/error-state';
import { FilterBar } from '@repo/ui/filter-bar';
import { StatusBadge } from '@repo/ui/status-badge';
import { CopyButton } from '@/components/copy-button';
import { TablePreferences, type ColumnDef, type TablePrefs } from '@/components/table-preferences';
import { formatCurrency } from '@/lib/currency';
import { STATUS_GROUPS, STATUS_META } from '@/lib/status-config';

export interface ShipmentTableRow {
  id: string;
  trackingNumber: string;
  labelCode: string | null;
  carrier: string;
  status: string;
  customerName: string;
  billAmount: string | undefined;
  createdAt: string;
  lastTrackedAt: string | null;
  stale: boolean;
}

interface ShipmentsTableProps {
  search: string;
  onSearch: (value: string) => void;
  statusFilter: string;
  onStatusFilter: (status: string) => void;
  columns: ColumnDef[];
  prefs: TablePrefs;
  rows: ShipmentTableRow[];
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
  sortDescriptor: SortDescriptor;
  onSortChange: (descriptor: SortDescriptor) => void;
  previewTrackingId?: string | null;
  onRowPreview: (trackingNumber: string) => void;
  onRowOpen: (trackingNumber: string) => void;
  onContextAction: (key: Key, shipment: ShipmentTableRow) => void;
  userRole?: string;
  tenantCurrency?: string;
  bulkDeleting: boolean;
  onBulkDelete: () => void;
  onBulkStatus: (status: string) => void;
  onCsvExport: () => void;
  onPrintLabels: () => void;
  page: number;
  onPageChange: (page: number | ((p: number) => number)) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (n: number) => void;
  totalCount: number;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function ShipmentsTable({
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  columns,
  prefs,
  rows,
  selected,
  onSelectedChange,
  sortDescriptor,
  onSortChange,
  previewTrackingId,
  onRowPreview,
  onRowOpen,
  onContextAction,
  userRole,
  tenantCurrency,
  bulkDeleting,
  onBulkDelete,
  onBulkStatus,
  onCsvExport,
  onPrintLabels,
  page,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  totalCount,
  isLoading = false,
  isFetching = false,
  error = null,
  onRetry,
}: ShipmentsTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, totalCount);

  // Always-on columns stay visible even when an old stored preference hides them.
  const alwaysVisible = useMemo(
    () => new Set(columns.filter((c) => c.always).map((c) => c.id)),
    [columns],
  );

  const columnVisibility: VisibilityState = useMemo(() => {
    const visibility: VisibilityState = {};
    for (const id of prefs.hidden) {
      if (!alwaysVisible.has(id)) visibility[id] = false;
    }
    return visibility;
  }, [prefs.hidden, alwaysVisible]);

  const handleVisibilityChange: OnChangeFn<VisibilityState> = (updater) => {
    const next = typeof updater === 'function' ? updater(columnVisibility) : updater;
    const hidden = new Set<string>();
    for (const [id, visible] of Object.entries(next)) {
      if (!visible && !alwaysVisible.has(id)) hidden.add(id);
    }
    prefs.setHidden(hidden);
  };

  const sorting: SortingState = useMemo(
    () => [{ id: String(sortDescriptor.column), desc: sortDescriptor.direction === 'descending' }],
    [sortDescriptor],
  );

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    const first = next[0];
    if (!first) return;
    onSortChange({ column: first.id, direction: first.desc ? 'descending' : 'ascending' });
    onPageChange(1);
  };

  const rowSelection: RowSelectionState = useMemo(() => {
    const selection: RowSelectionState = {};
    for (const id of selected) selection[id] = true;
    return selection;
  }, [selected]);

  const handleSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    const next = typeof updater === 'function' ? updater(rowSelection) : updater;
    onSelectedChange(new Set(Object.keys(next).filter((id) => next[id])));
  };

  // Callbacks change every render; route them through a ref so the column
  // definitions below stay stable and the table keeps its state.
  const live = useRef({ onRowPreview, onRowOpen, onContextAction, userRole, tenantCurrency });
  live.current = { onRowPreview, onRowOpen, onContextAction, userRole, tenantCurrency };

  const tableColumns: DataTableColumn<ShipmentTableRow, unknown>[] = useMemo(
    () => [
      {
        id: '#',
        header: '#',
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 48,
        cell: ({ row, table }) =>
          table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1,
      },
      {
        id: 'trackingNumber',
        accessorKey: 'trackingNumber',
        header: 'Tracking #',
        enableHiding: false,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 font-mono text-xs font-medium">
            {row.original.trackingNumber}
            <CopyButton text={row.original.trackingNumber} label="tracking number" />
          </span>
        ),
      },
      {
        id: 'labelCode',
        accessorKey: 'labelCode',
        header: 'Label Code',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.labelCode || '—'}</span>,
      },
      {
        id: 'customerName',
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ row }) => row.original.customerName || '—',
      },
      {
        id: 'carrier',
        accessorKey: 'carrier',
        header: 'Carrier',
        cell: ({ row }) => row.original.carrier,
      },
      {
        id: 'billAmount',
        accessorKey: 'billAmount',
        header: 'Bill',
        size: 100,
        cell: ({ row }) =>
          row.original.billAmount ? formatCurrency(row.original.billAmount, live.current.tenantCurrency) : '—',
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        enableHiding: false,
        cell: ({ row }) => (
          <span className="inline-flex items-center">
            <StatusBadge status={row.original.status} />
            {row.original.stale && (
              <span
                className="ml-1.5 inline-flex items-center gap-1 text-xs text-danger"
                title={`Last tracked ${row.original.lastTrackedAt ? new Date(row.original.lastTrackedAt).toLocaleDateString() : 'unknown'}`}
              >
                <Clock size={10} /> stale
              </span>
            )}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 48,
        cell: ({ row }) => (
          <Dropdown.Root>
            <Dropdown.Trigger
              className="inline-flex h-7 min-w-0 items-center justify-center rounded-sm px-1 text-sm text-muted outline-none transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Actions for ${row.original.trackingNumber}`}
            >
              <MoreVertical size={16} />
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu onAction={(key) => live.current.onContextAction(key, row.original)}>
                <Dropdown.Item id="view" textValue="View">
                  <span className="flex items-center gap-2">
                    <Eye size={16} /> View
                  </span>
                </Dropdown.Item>
                <Dropdown.Item id="edit" textValue="Edit">
                  <span className="flex items-center gap-2">
                    <Pencil size={16} /> Edit
                  </span>
                </Dropdown.Item>
                {live.current.userRole !== 'staff' && (
                  <Dropdown.Item id="delete" textValue="Delete">
                    <span className="flex items-center gap-2">
                      <Trash2 size={16} /> Delete
                    </span>
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        ),
      },
    ],
    [],
  );

  return (
    <div className="ops-panel overflow-hidden">
      <div className="border-b border-border p-4">
        <FilterBar>
          <div className="min-w-52 flex-1">
            <Input
              id="shipment-search"
              variant="secondary"
              placeholder="Search shipments..."
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              fullWidth
            />
          </div>
          <TablePreferences
            storageKey="shipments-table"
            columns={columns}
            hidden={prefs.hidden}
            onHiddenChange={prefs.setHidden}
            density={prefs.density}
            onDensityChange={prefs.setDensity}
          />
          <Tabs
            selectedKey={statusFilter}
            onSelectionChange={(key) => {
              onStatusFilter(key as string);
              onPageChange(1);
            }}
            className="overflow-x-auto sm:flex-[2]"
          >
            <Tabs.List>
              <Tabs.Tab id="all">All</Tabs.Tab>
              {Object.keys(STATUS_GROUPS).map((group) => (
                <Tabs.Tab key={group} id={group}>
                  {group}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </FilterBar>
      </div>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-accent/[0.04] px-4 py-2">
          <span className="text-xs font-medium">{selected.size} selected</span>
          {userRole !== 'staff' && (
            <Dropdown.Root>
              <Dropdown.Trigger className="content-panel inline-flex h-8 items-center gap-1.5 px-3 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted data-[pressed]:bg-muted/60">
                <Tags size={14} /> Set Status <ChevronDown size={12} />
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom start">
                <Dropdown.Menu onAction={(key) => onBulkStatus(String(key))}>
                  {Object.entries(STATUS_META).map(([value, meta]) => (
                    <Dropdown.Item key={value} id={value} textValue={meta.label}>
                      {meta.label}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.Root>
          )}
          <Button size="sm" variant="secondary" onPress={onCsvExport}>
            <FileDown size={14} /> Export CSV
          </Button>
          <Button size="sm" variant="secondary" onPress={onPrintLabels}>
            <Printer size={14} /> Print Labels
          </Button>
          <Button size="sm" variant="danger" isPending={bulkDeleting} isDisabled={bulkDeleting} onPress={onBulkDelete}>
            <Trash2 size={14} /> Delete
          </Button>
          <Button size="sm" variant="ghost" onPress={() => onSelectedChange(new Set())}>
            Clear
          </Button>
        </div>
      )}
      <DataTable
        data={rows}
        columns={tableColumns}
        total={totalCount}
        getRowId={(row) => row.id}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        pagination={{ pageIndex: page - 1, pageSize: rowsPerPage }}
        onPaginationChange={(updater) => {
          const current = { pageIndex: page - 1, pageSize: rowsPerPage };
          const next = typeof updater === 'function' ? updater(current) : updater;
          onPageChange(next.pageIndex + 1);
          onRowsPerPageChange(next.pageSize);
        }}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleVisibilityChange}
        rowSelection={rowSelection}
        onRowSelectionChange={handleSelectionChange}
        enableRowSelection
        density={prefs.density === 'compact' ? 'compact' : 'comfortable'}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        emptyState={<EmptyState title="No shipments found" description="Try a different search or filter." />}
        errorState={
          onRetry ? (
            <ErrorState message="Failed to load shipments" onRetry={onRetry} />
          ) : undefined
        }
        onRowClick={(row) => live.current.onRowPreview(row.trackingNumber)}
        onRowDoubleClick={(row) => live.current.onRowOpen(row.trackingNumber)}
        getRowClassName={(row) =>
          row.trackingNumber === previewTrackingId
            ? 'bg-[var(--ops-accent-dim)] shadow-[inset_3px_0_0_0_var(--ops-accent)]'
            : undefined
        }
        ariaLabel="Shipments"
      />
      <div className="flex w-full items-center justify-between gap-4 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>Rows</span>
          <Select
            selectedKey={String(rowsPerPage)}
            onSelectionChange={(k) => onRowsPerPageChange(Number(k))}
            variant="secondary"
            className="w-20"
            aria-label="Rows per page"
          >
            <Select.Trigger className="h-7 text-xs">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {[25, 50, 100, 250].map((n) => (
                  <ListBox.Item key={n} id={String(n)} textValue={String(n)}>
                    {n}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
        <Pagination size="sm">
          <Pagination.Summary>
            {start} to {end} of {totalCount} results
          </Pagination.Summary>
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous isDisabled={page === 1} onPress={() => onPageChange((p) => Math.max(1, p - 1))}>
                <Pagination.PreviousIcon /> Prev
              </Pagination.Previous>
            </Pagination.Item>
            {pages.map((p) => (
              <Pagination.Item key={p}>
                <Pagination.Link isActive={p === page} onPress={() => onPageChange(p)}>
                  {p}
                </Pagination.Link>
              </Pagination.Item>
            ))}
            <Pagination.Item>
              <Pagination.Next
                isDisabled={page === totalPages}
                onPress={() => onPageChange((p) => Math.min(totalPages, p + 1))}
              >
                Next <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      </div>
    </div>
  );
}
