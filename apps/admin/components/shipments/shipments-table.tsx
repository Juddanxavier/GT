'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Eye, MoreVertical, Pencil, Trash2, Clock, ChevronDown, FileDown, Printer, Tags } from 'lucide-react';
import {
  Button,
  Dropdown,
  Input,
  ListBox,
  Pagination,
  Select,
  Table,
  Tabs,
  type Key,
  type SortDescriptor,
} from '@heroui/react';
import { ShipmentStatusBadge } from '@/components/shipment-status-badge';
import { CopyButton } from '@/components/copy-button';
import { TablePreferences, densityClassName, type ColumnDef, type Density } from '@/components/table-preferences';
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

interface TablePrefs {
  hidden: Set<string>;
  setHidden: (next: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  density: Density;
  setDensity: (d: Density) => void;
  isVisible: (id: string) => boolean;
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
  onSelectedChange: Dispatch<SetStateAction<Set<string>>>;
  onToggleAll: (rows: ShipmentTableRow[]) => void;
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
  onToggleAll,
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
}: ShipmentsTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, totalCount);

  return (
    <div className="ops-panel overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="sm:flex-1">
            <Input
              id="shipment-search"
              variant="secondary"
              placeholder="Search shipments..."
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              fullWidth
            />
          </div>
          <div className="flex items-center gap-2">
            <TablePreferences
              storageKey="shipments-table"
              columns={columns}
              hidden={prefs.hidden}
              onHiddenChange={prefs.setHidden}
              density={prefs.density}
              onDensityChange={prefs.setDensity}
            />
          </div>
          <Tabs
            selectedKey={statusFilter}
            onSelectionChange={(key) => {
              onStatusFilter(key as string);
              onPageChange(1);
            }}
            className="sm:flex-[2] overflow-x-auto"
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
        </div>
      </div>
      {selected.size > 0 && (
        <div className="px-4 py-2 border-b border-border bg-accent/[0.04] flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium">{selected.size} selected</span>
          {userRole !== 'staff' && (
            <Dropdown.Root>
              <Dropdown.Trigger className="inline-flex items-center gap-1.5 content-panel px-3 h-8 text-xs font-medium text-foreground hover:bg-muted transition-colors outline-none data-[pressed]:bg-muted/60">
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
          <Button size="sm" variant="ghost" onPress={() => onSelectedChange(new Set())}>Clear</Button>
        </div>
      )}
      <Table className={`table-clickable ${densityClassName(prefs.density)}`}>
        <Table.ScrollContainer>
          <Table.Content
            aria-label="Shipments"
            className="min-w-[1050px]"
            sortDescriptor={sortDescriptor}
            onSortChange={(d) => {
              onSortChange(d);
              onPageChange(1);
            }}
            onRowAction={(key) => onRowPreview(String(key))}
          >
            <Table.Header>
              <Table.Column id="select" width={40}>
                {() => (
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    className="accent-[var(--accent)] cursor-pointer"
                    checked={rows.length > 0 && rows.every((s) => selected.has(s.id))}
                    onChange={() => onToggleAll(rows)}
                  />
                )}
              </Table.Column>
              <Table.Column id="#" width={48}>
                {() => <span className="text-muted text-xs">#</span>}
              </Table.Column>
              <Table.Column allowsSorting id="trackingNumber" isRowHeader>
                <span className="text-muted text-xs">Tracking #</span>
              </Table.Column>
              {prefs.isVisible('labelCode') && <Table.Column allowsSorting id="labelCode">Label Code</Table.Column>}
              {prefs.isVisible('customerName') && <Table.Column allowsSorting id="customerName">Customer</Table.Column>}
              {prefs.isVisible('carrier') && <Table.Column allowsSorting id="carrier">Carrier</Table.Column>}
              {prefs.isVisible('billAmount') && (
                <Table.Column allowsSorting id="billAmount" width={100}>Bill</Table.Column>
              )}
              {prefs.isVisible('status') && <Table.Column allowsSorting id="status">Status</Table.Column>}
              <Table.Column id="actions" width={48}>
                {() => null}
              </Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <div className="flex items-center justify-center py-24 text-muted text-sm">No shipments found</div>
              )}
            >
              {rows.map((shipment, i) => (
                <Table.Row
                  key={shipment.id}
                  id={shipment.trackingNumber}
                  className={[
                    selected.has(shipment.id) ? 'bg-accent/[0.06]' : '',
                    previewTrackingId === shipment.trackingNumber ? 'ops-row-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onRowOpen(shipment.trackingNumber);
                  }}
                >
                  <Table.Cell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${shipment.trackingNumber}`}
                      className="accent-[var(--accent)] cursor-pointer"
                      checked={selected.has(shipment.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() =>
                        onSelectedChange((prev) => {
                          const next = new Set(prev);
                          if (next.has(shipment.id)) next.delete(shipment.id);
                          else next.add(shipment.id);
                          return next;
                        })
                      }
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-xs text-muted">{start + i}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="font-mono text-xs font-medium inline-flex items-center gap-1">
                      {shipment.trackingNumber}
                      <span onClick={(e) => e.stopPropagation()}>
                        <CopyButton text={shipment.trackingNumber} label="tracking number" />
                      </span>
                    </span>
                  </Table.Cell>
                  {prefs.isVisible('labelCode') && (
                    <Table.Cell className="font-mono text-xs">{shipment.labelCode || '—'}</Table.Cell>
                  )}
                  {prefs.isVisible('customerName') && <Table.Cell>{shipment.customerName || '—'}</Table.Cell>}
                  {prefs.isVisible('carrier') && <Table.Cell>{shipment.carrier}</Table.Cell>}
                  {prefs.isVisible('billAmount') && (
                    <Table.Cell>
                      {shipment.billAmount ? formatCurrency(shipment.billAmount, tenantCurrency) : '—'}
                    </Table.Cell>
                  )}
                  {prefs.isVisible('status') && (
                    <Table.Cell>
                      <ShipmentStatusBadge status={shipment.status} />
                      {shipment.stale && (
                        <span
                          className="ml-1.5 text-xs text-danger inline-flex items-center gap-1"
                          title={`Last tracked ${shipment.lastTrackedAt ? new Date(shipment.lastTrackedAt).toLocaleDateString() : 'unknown'}`}
                        >
                          <Clock size={10} /> stale
                        </span>
                      )}
                    </Table.Cell>
                  )}
                  <Table.Cell>
                    <span onClick={(e) => e.stopPropagation()}>
                      <Dropdown.Root>
                        <Dropdown.Trigger className="inline-flex items-center justify-center rounded-sm min-w-0 px-1 h-7 text-muted hover:text-foreground hover:bg-muted transition-colors outline-none text-sm">
                          <MoreVertical size={16} />
                        </Dropdown.Trigger>
                        <Dropdown.Popover placement="bottom end">
                          <Dropdown.Menu onAction={(key) => onContextAction(key, shipment)}>
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
                            {userRole !== 'staff' && (
                              <Dropdown.Item id="delete" textValue="Delete">
                                <span className="flex items-center gap-2">
                                  <Trash2 size={16} /> Delete
                                </span>
                              </Dropdown.Item>
                            )}
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown.Root>
                    </span>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
        <Table.Footer>
          <div className="flex items-center justify-between w-full px-4 py-2 gap-4">
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
        </Table.Footer>
      </Table>
    </div>
  );
}
