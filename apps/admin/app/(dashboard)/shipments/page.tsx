'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FILTER_GROUPS, STATUS_GROUPS, STATUS_META, statusGroupCounts } from '@/lib/status-config';
import { ShipmentStatusBadge } from '@/components/shipment-status-badge';
import { Eye, MoreVertical, Pencil, Trash2, Package, Truck, CheckCircle, Clock, ChevronDown, FileDown, Printer, Tags } from 'lucide-react';
import { Button, Description, Dropdown, Input, Label, ListBox, Modal, NumberField, Pagination, ProgressBar, Select, Spinner, Table, Tabs, type Key, type SortDescriptor } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { CustomerAssigner } from '@/components/customer-assigner';
import { CopyButton, Flag } from '@/components/copy-button';
import { TablePreferences, useTablePreferences, densityClassName, type ColumnDef } from '@/components/table-preferences';
import { PageHeader } from '@/components/page-header';
import { AddressForm, type AddressData, addressDisplay } from '@/components/address-form';
import { formatCurrency } from '@/lib/currency';
import { authClient } from '@/lib/auth-client';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';
import { useShipments, useCustomers, useBranches, useTenants, useCreateShipment, useDeleteShipment, useShipmentTrend, type PaginatedResult, type Shipment } from '@/lib/queries';
import { KpiCard } from '@/components/kpi-card';
import { usePageTitle } from '@/lib/use-page-title';
import { getUser } from '@/types/auth';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import { getCountryCode } from '@/lib/country-codes';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}


export default function ShipmentsPage() {
  usePageTitle('Shipments');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') ?? '');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'trackingNumber', direction: 'ascending' });
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; trackingNumber: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') ?? 'all');
const [rowsPerPage, setRowsPerPage] = useState(50);
const [selected, setSelected] = useState<Set<string>>(new Set());
const [bulkDeleting, setBulkDeleting] = useState(false);

const SHIPMENT_COLUMNS: ColumnDef[] = [
  { id: 'trackingNumber', label: 'Tracking #', always: true },
  { id: 'labelCode', label: 'Label Code' },
  { id: 'customerName', label: 'Customer' },
  { id: 'carrier', label: 'Carrier' },
  { id: 'billAmount', label: 'Bill' },
  { id: 'status', label: 'Status', always: true },
];
const prefs = useTablePreferences('shipments-table', SHIPMENT_COLUMNS);

const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);

  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [assignerData, setAssignerData] = useState<{ customerId: string | null; contactEmail: string; contactPhone: string }>({
    customerId: null,
    contactEmail: '',
    contactPhone: '',
  });
  const [newTrackingNumber, setNewTrackingNumber] = useState('');
  const [billAmount, setBillAmount] = useState(0);
  const [senderAddress, setSenderAddress] = useState<AddressData>({});
  const [recipientAddress, setRecipientAddress] = useState<AddressData>({});


  const { data: session } = authClient.useSession();
  const userData = getUser(session);
  const userRole = userData?.role;
  const isSuperAdmin = userRole === 'superadmin';
  const isTenantAdmin = userRole === 'tenant-admin';
  const userTenantId = userData?.tenantId;
  const userBranchId = userData?.branchId as string | undefined;
  const isStaff = !isSuperAdmin && !isTenantAdmin;
  const { tenantFilter, branchFilter } = useTenantFilter();
  const effectiveTenantId = isSuperAdmin ? tenantFilter : (userTenantId ?? '');
  const { data: tenants = [] } = useTenants();
  const tenantCountry = useMemo(() => {
    const t = tenants.find((t) => t.id === effectiveTenantId);
    return t?.country ?? undefined;
  }, [effectiveTenantId, tenants]);
  const tenantCurrency = useMemo(() => {
    const t = tenants.find((t) => t.id === effectiveTenantId);
    return t?.currency ?? undefined;
  }, [effectiveTenantId, tenants]);
  const phoneDialCode = getCountryCode(tenantCountry).dialCode;
  const phoneFlag = getCountryCode(tenantCountry).flag;

  // Compute comma-separated statuses from selected group filter
  const computedStatus = useMemo(() => {
    if (statusFilter === 'all') return 'all';
    return STATUS_GROUPS[statusFilter]?.join(',') ?? 'all';
  }, [statusFilter]);

  const shipmentsQuery = useShipments(page, rowsPerPage, computedStatus, debouncedSearch);
  const shipmentsResp = shipmentsQuery.data as PaginatedResult<Shipment> | undefined;
  const shipmentRows = Array.isArray(shipmentsResp) ? shipmentsResp : (shipmentsResp?.data ?? []);
  const totalCount = Array.isArray(shipmentsResp) ? shipmentRows.length : (shipmentsResp?.total ?? 0);
  const counts = !Array.isArray(shipmentsResp) ? shipmentsResp?.counts : undefined;

  const { data: trendData = [] } = useShipmentTrend();

  const sparklines = useMemo(() => {
    const map = new Map(trendData.map((r) => [r.date, r]));
    const days = 14;
    const now = new Date();
    const total: number[] = [];
    const inTransit: number[] = [];
    const delivered: number[] = [];
    const pending: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = map.get(key);
      total.push(row?.total ?? 0);
      inTransit.push(row?.intransit ?? 0);
      delivered.push(row?.delivered ?? 0);
      pending.push(row?.pending ?? 0);
    }
    return { total, inTransit, delivered, pending };
  }, [trendData]);

  const trend = useMemo(() => {
    const calc = (data: number[]) => {
      if (data.length < 14) return 0;
      const prev = data.slice(0, 7).reduce((a, b) => a + b, 0);
      const curr = data.slice(7).reduce((a, b) => a + b, 0);
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };
    return { total: calc(sparklines.total), inTransit: calc(sparklines.inTransit), delivered: calc(sparklines.delivered), pending: calc(sparklines.pending) };
  }, [sparklines]);

  const sparklineKeys = ['total', 'inTransit', 'delivered', 'pending'] as const;
  const { toast } = useToast();
  const { data: allCustomers = [] } = useCustomers();
  const { data: newBranches = [] } = useBranches();
  const queryClient = useQueryClient();

  const toggleAll = useCallback((rows: typeof paginated[number][]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (rows.every((r) => next.has(r.id))) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected shipment(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selected).map((id) => api.delete(`/api/shipments/${id}`)));
      toast('success', 'Shipments deleted', `${selected.size} shipment(s) removed`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    } catch (e) {
      toast('error', 'Failed to delete shipments', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBulkDeleting(false);
    }
  }, [selected, toast, queryClient]);

  const [bulkStatusUpdating, setBulkStatusUpdating] = useState(false);
  const statusLabel = (s: string) => STATUS_META[s as keyof typeof STATUS_META]?.label ?? s;

  const handleBulkStatus = useCallback(async (status: string) => {
    if (selected.size === 0 || bulkStatusUpdating) return;
    setBulkStatusUpdating(true);
    try {
      const results = await Promise.allSettled(Array.from(selected).map((id) => api.patch(`/api/shipments/${id}`, { status })));
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const fail = results.length - ok;
      if (ok > 0) {
        toast('success', 'Status updated', `${ok} shipment(s) set to ${statusLabel(status)}${fail ? `, ${fail} failed` : ''}`);
        setSelected(new Set());
        queryClient.invalidateQueries({ queryKey: ['shipments'] });
      } else {
        toast('error', 'Update failed', 'None of the shipments could be updated');
      }
    } catch (e) {
      toast('error', 'Bulk status update failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBulkStatusUpdating(false);
    }
  }, [selected, bulkStatusUpdating, toast, queryClient]);

  const [selectedBranchId, setSelectedBranchId] = useState(isStaff ? (userBranchId ?? '') : branchFilter);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = (field: string) => setErrors((prev) => { const { [field]: _, ...rest } = prev; return rest; });
  const createShipment = useCreateShipment();
  const deleteShipment = useDeleteShipment();

  function handleAssignerChange(data: { customerId: string | null; contactEmail: string; contactPhone: string }) {
    setAssignerData(data);
  }

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of allCustomers) map.set(c.id, c.name);
    return map;
  }, [allCustomers]);

  // Client-side: resolve customer names and apply column sorting on current page
  const paginated = useMemo(() => {
    const items = shipmentRows.map((s) => ({
      id: s.id,
      trackingNumber: s.trackingNo,
      labelCode: s.labelCode,
      carrier: s.carrier ?? '',
      status: s.status,
      customerName: s.customerId ? (customerMap.get(s.customerId) ?? '—') : s.contactEmail || s.contactPhone || 'Self',
      billAmount: s.billAmount as string | undefined,
      createdAt: s.createdAt,
      lastTrackedAt: s.lastTrackedAt,
      stale: s.trackingRegistered
        && s.status !== 'delivered'
        && s.lastTrackedAt
        ? (Date.now() - new Date(s.lastTrackedAt).getTime()) / 86400000 > 3
        : false,
    }));
    const col = sortDescriptor.column as keyof typeof items[number];
    const dir = sortDescriptor.direction;
    items.sort((a, b) => {
      const valA = String(a[col] ?? '');
      const valB = String(b[col] ?? '');
      const cmp = valA.localeCompare(valB);
      return dir === 'descending' ? -cmp : cmp;
    });
    return items;
  }, [shipmentRows, sortDescriptor, customerMap]);

  const handleCsvExport = useCallback(() => {
    const rows = selected.size > 0 ? paginated.filter((r) => selected.has(r.id)) : paginated;
    if (rows.length === 0) return;
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      ['Tracking #', 'Label Code', 'Customer', 'Carrier', 'Status', 'Bill Amount', 'Created'].join(','),
      ...rows.map((r) => [r.trackingNumber, r.labelCode ?? '', r.customerName ?? '', r.carrier ?? '', statusLabel(r.status), r.billAmount ?? '', r.createdAt].map(esc).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selected, paginated]);

  const escHtml = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

  const handlePrintLabels = useCallback(() => {
    const rows = selected.size > 0 ? paginated.filter((r) => selected.has(r.id)) : paginated;
    if (rows.length === 0) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Shipment Labels</title><style>
      body{font-family:system-ui,sans-serif;margin:24px;}
      h1{font-size:18px;margin-bottom:16px;}
      table{width:100%;border-collapse:collapse;font-size:13px;}
      th{text-align:left;border-bottom:2px solid #333;padding:6px 8px;}
      td{border-bottom:1px solid #ccc;padding:8px;font-family:monospace;}
      @media print{ h1{display:none;} }
    </style></head><body>
    <h1>Shipment Labels (${rows.length})</h1>
    <table><thead><tr><th>Tracking #</th><th>Label Code</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${escHtml(r.trackingNumber)}</td><td>${escHtml(r.labelCode || '—')}</td></tr>`).join('')}
    </tbody></table>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`);
    w.document.close();
  }, [selected, paginated]);

  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, totalCount);
  const isPending = shipmentsQuery.isPending;
  const isError = shipmentsQuery.isError;
  const refetch = shipmentsQuery.refetch;

  function handleContextAction(key: Key, shipment: typeof paginated[number]) {
    if (key === 'view' || key === 'edit') router.push(`/shipments/${shipment.trackingNumber}`);
    else if (key === 'delete') setDeleteTarget(shipment);
  }

  const kpiCounts = useMemo(() => statusGroupCounts(counts), [counts]);
  const applyStatus = (group: string) => { setStatusFilter(group); setPage(1); };

  return (
    <div className="space-y-6">
      {isPending ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <p className="text-danger text-sm">Failed to load shipments</p>
          <Button variant="secondary" size="sm" onPress={() => refetch()}>Retry</Button>
        </div>
      ) : (
      <>
      <PageHeader
        title="Shipments"
        subtitle="Track and manage shipments"
        icon={<Package size={18} />}
        action={<Button onPress={() => {
          setErrors({}); setNewTrackingNumber(''); setBillAmount(0); setCreateOpen(true); setCreateStep(1);
          setAssignerData({ customerId: null, contactEmail: '', contactPhone: '' });
          setSenderAddress({}); setRecipientAddress({});
        }}>New Shipment</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total" count={kpiCounts.total ?? 0} color="#3b82f6" icon={Package} data={sparklines.total} trend={trend.total} onPress={() => applyStatus('all')} isActive={statusFilter === 'all'} />
        <KpiCard label="In Transit" count={kpiCounts['In Transit'] ?? 0} color="#8b5cf6" icon={Truck} data={sparklines.inTransit} trend={trend.inTransit} onPress={() => applyStatus('In Transit')} isActive={statusFilter === 'In Transit'} />
        <KpiCard label="Delivered" count={kpiCounts.Delivered ?? 0} color="#22c55e" icon={CheckCircle} data={sparklines.delivered} trend={trend.delivered} onPress={() => applyStatus('Delivered')} isActive={statusFilter === 'Delivered'} />
        <KpiCard label="Pending" count={kpiCounts.Pending ?? 0} color="#f59e0b" icon={Clock} data={sparklines.pending} trend={trend.pending} onPress={() => applyStatus('Pending')} isActive={statusFilter === 'Pending'} />
      </div>

      <div className="rounded-sm border border-border bg-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="sm:flex-1"><Input id="shipment-search" variant="secondary" placeholder="Search shipments..." value={search} onChange={(e) => handleSearch(e.target.value)} fullWidth /></div>
            <div className="flex items-center gap-2">
              <TablePreferences
                storageKey="shipments-table"
                columns={SHIPMENT_COLUMNS}
                hidden={prefs.hidden}
                onHiddenChange={prefs.setHidden}
                density={prefs.density}
                onDensityChange={prefs.setDensity}
              />
            </div>
            <Tabs selectedKey={statusFilter} onSelectionChange={(key) => { setStatusFilter(key as string); setPage(1); }} className="sm:flex-[2] overflow-x-auto">
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
                <Dropdown.Trigger className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-3 h-8 text-xs font-medium text-foreground hover:bg-muted transition-colors outline-none data-[pressed]:bg-muted/60">
                  <Tags size={14} /> Set Status <ChevronDown size={12} />
                </Dropdown.Trigger>
                <Dropdown.Popover placement="bottom start">
                  <Dropdown.Menu onAction={(key) => handleBulkStatus(String(key))}>
                    {Object.entries(STATUS_META).map(([value, meta]) => (
                      <Dropdown.Item key={value} id={value} textValue={meta.label}>{meta.label}</Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown.Root>
            )}
            <Button size="sm" variant="secondary" onPress={handleCsvExport}>
              <FileDown size={14} /> Export CSV
            </Button>
            <Button size="sm" variant="secondary" onPress={handlePrintLabels}>
              <Printer size={14} /> Print Labels
            </Button>
            <Button size="sm" variant="danger" isPending={bulkDeleting} isDisabled={bulkDeleting} onPress={handleBulkDelete}>
              <Trash2 size={14} /> Delete
            </Button>
            <Button size="sm" variant="ghost" onPress={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}
<Table className={`table-clickable ${densityClassName(prefs.density)}`}>
<Table.ScrollContainer>
            <Table.Content aria-label="Shipments" className="min-w-[1050px]" sortDescriptor={sortDescriptor} onSortChange={(d) => { setSortDescriptor(d); setPage(1); }} onRowAction={(key) => router.push(`/shipments/${key}`)}>
              <Table.Header>
                <Table.Column id="select" width={40}>
                  {() => (
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      className="accent-[var(--accent)] cursor-pointer"
                      checked={paginated.length > 0 && paginated.every((s) => selected.has(s.id))}
                      onChange={() => toggleAll(paginated)}
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
{prefs.isVisible('billAmount') && <Table.Column allowsSorting id="billAmount" width={100}>Bill</Table.Column>}
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
                {paginated.map((shipment, i) => (
                  <Table.Row key={shipment.id} id={shipment.trackingNumber} className={selected.has(shipment.id) ? 'bg-accent/[0.06]' : undefined}>
                    <Table.Cell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${shipment.trackingNumber}`}
                        className="accent-[var(--accent)] cursor-pointer"
                        checked={selected.has(shipment.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(shipment.id)) next.delete(shipment.id);
                          else next.add(shipment.id);
                          return next;
                        })}
                      />
                    </Table.Cell>
                    <Table.Cell><span className="text-xs text-muted">{start + i}</span></Table.Cell>
                    <Table.Cell>
                      <span className="font-mono text-xs font-medium inline-flex items-center gap-1">
                        {shipment.trackingNumber}
                        <span onClick={(e) => e.stopPropagation()}><CopyButton text={shipment.trackingNumber} label="tracking number" /></span>
                      </span>
                    </Table.Cell>
                    {prefs.isVisible('labelCode') && <Table.Cell className="font-mono text-xs">{shipment.labelCode || '—'}</Table.Cell>}
                    {prefs.isVisible('customerName') && <Table.Cell>{shipment.customerName || '—'}</Table.Cell>}
                    {prefs.isVisible('carrier') && <Table.Cell>{shipment.carrier}</Table.Cell>}
                    {prefs.isVisible('billAmount') && <Table.Cell>{shipment.billAmount ? formatCurrency(shipment.billAmount, tenantCurrency) : '—'}</Table.Cell>}
                    {prefs.isVisible('status') && (
                      <Table.Cell>
                      <ShipmentStatusBadge status={shipment.status} />
                      {shipment.stale && (
                        <span className="ml-1.5 text-xs text-danger inline-flex items-center gap-1" title={`Last tracked ${shipment.lastTrackedAt ? new Date(shipment.lastTrackedAt).toLocaleDateString() : 'unknown'}`}>
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
                            <Dropdown.Menu onAction={(key) => handleContextAction(key, shipment)}>
                              <Dropdown.Item id="view" textValue="View"><span className="flex items-center gap-2"><Eye size={16} /> View</span></Dropdown.Item>
                              <Dropdown.Item id="edit" textValue="Edit"><span className="flex items-center gap-2"><Pencil size={16} /> Edit</span></Dropdown.Item>
                              {userRole !== 'staff' && <Dropdown.Item id="delete" textValue="Delete"><span className="flex items-center gap-2"><Trash2 size={16} /> Delete</span></Dropdown.Item>}
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
      <Select selectedKey={String(rowsPerPage)} onSelectionChange={(k) => setRowsPerPage(Number(k))} variant="secondary" className="w-20" aria-label="Rows per page">
        <Select.Trigger className="h-7 text-xs">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {[25, 50, 100, 250].map((n) => <ListBox.Item key={n} id={String(n)} textValue={String(n)}>{n}</ListBox.Item>)}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
    <Pagination size="sm">
      <Pagination.Summary>{start} to {end} of {totalCount} results</Pagination.Summary>
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous isDisabled={page === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
            <Pagination.PreviousIcon /> Prev
          </Pagination.Previous>
        </Pagination.Item>
        {pages.map((p) => (
          <Pagination.Item key={p}>
            <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>{p}</Pagination.Link>
          </Pagination.Item>
        ))}
        <Pagination.Item>
          <Pagination.Next isDisabled={page === totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Next <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  </div>
</Table.Footer>
        </Table>
      </div>

      <Modal.Backdrop isOpen={createOpen} onOpenChange={(v: boolean) => { if (!v) { setCreateOpen(false); setCreateStep(1); } }}>
        <Modal.Container>
          <Modal.Dialog aria-label="New Shipment" className="max-w-2xl">
            <Modal.Header className="border-b border-border pb-0">
              <div className="w-full">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">New Shipment</h2>
                  <span className="text-[11px] text-muted font-medium">Step {createStep} of 4</span>
                </div>
                <div className="h-1 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${((createStep - 1) / 3) * 100}%` }}
                  />
                </div>
              </div>
            </Modal.Header>
            <Modal.Body className="pt-4">
              <form id="create-form" onSubmit={async (e) => {
                e.preventDefault();
                if (createStep < 4) return;
                setErrors({});
                if ((document.getElementById('hp-create') as HTMLInputElement)?.value) return;

                const newErrors: Record<string, string> = {};
                const trackingNo = newTrackingNumber.trim();
                const branchVisible = isSuperAdmin || isTenantAdmin;

                if (!trackingNo) newErrors.trackingNo = 'Tracking number is required';
                else {
                  const dup = shipmentRows.find((s: { trackingNo: string }) => s.trackingNo.toLowerCase() === trackingNo.toLowerCase());
                  if (dup) newErrors.trackingNo = `Already exists (${dup.id.slice(0, 8)}...)`;
                }

                if (!billAmount || billAmount <= 0) newErrors.billAmount = 'Bill amount is required and must be positive';

                if (branchVisible && !selectedBranchId) newErrors.branchId = 'Please select a branch';

                const hasCustomer = assignerData.customerId !== null && assignerData.customerId !== '';
                const hasContact = assignerData.contactEmail.trim() !== '' || assignerData.contactPhone.trim() !== '';
                if (!hasCustomer && !hasContact) {
                  newErrors.customerId = 'Assign a customer or provide contact details';
                }

                if (Object.keys(newErrors).length > 0) {
                  setErrors(newErrors);
                  setCreateStep(1);
                  return;
                }

                const payload = {
                  trackingNo,
                  billAmount: billAmount || undefined,
                  branchId: selectedBranchId || undefined,
                };
                const customerId = assignerData.customerId === 'self' ? undefined : assignerData.customerId;
                const email = assignerData.contactEmail || undefined;
                const phone = assignerData.contactPhone || undefined;
                createShipment.mutate({
                  customerId,
                  contactEmail: email,
                  contactPhone: phone,
                  senderAddress,
                  recipientAddress,
                  ...payload,
                  tenantId: effectiveTenantId || undefined,
                }, {
                  onSuccess: (data) => {
                    toast('success', 'Shipment created', `Tracking #${data.trackingNo}`);
                    setCreateOpen(false);
                    setCreateStep(1);
                    setNewTrackingNumber('');
                    setBillAmount(0);
                    setSenderAddress({});
                    setRecipientAddress({});
                    setAssignerData({ customerId: null, contactEmail: '', contactPhone: '' });
                    setSelectedBranchId(isStaff ? (userBranchId ?? '') : branchFilter);
                    setErrors({});
                  },
                  onError: (err) => {
                    toast('error', 'Failed to create shipment', err instanceof Error ? err.message : 'Unknown error');
                  },
                });
              }} className="flex flex-col gap-4">
                {/* Honeypot */}
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <label htmlFor="hp-create">Leave empty</label>
                  <input id="hp-create" name="website" type="text" tabIndex={-1} autoComplete="off" />
                </div>

                {createStep === 1 && (
                  <div className="pt-2 space-y-0">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-0.5 h-3.5 bg-primary/60 rounded-full shrink-0" />
                      <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">Shipment Info</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="new-trackingNo" className="text-[11px] font-semibold text-muted uppercase tracking-widest">Tracking Number *</label>
                        <Input id="new-trackingNo" variant="secondary" placeholder="e.g. 1Z999AA10123456784" value={newTrackingNumber} onChange={(e) => { setNewTrackingNumber(e.target.value.trimStart()); clearError('trackingNo'); }} required />
                        {errors.trackingNo && <p className="text-xs text-danger">{errors.trackingNo}</p>}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="new-billAmount" className="text-[11px] font-semibold text-muted uppercase tracking-widest">Bill Amount *</label>
                        <NumberField.Root aria-label="Bill amount" variant="secondary" fullWidth value={billAmount} onChange={(v) => { setBillAmount(v); clearError('billAmount'); }}>
                          <NumberField.Group>
                            <NumberField.DecrementButton />
                            <NumberField.Input id="new-billAmount" placeholder="0.00" />
                            <NumberField.IncrementButton />
                          </NumberField.Group>
                        </NumberField.Root>
                        {errors.billAmount && <p className="text-xs text-danger">{errors.billAmount}</p>}
                      </div>
                    </div>
                    {(isSuperAdmin || isTenantAdmin) && (
                      <div className="flex flex-col gap-1.5 mt-3">
                        <label className="text-[11px] font-semibold text-muted uppercase tracking-widest">Branch *</label>
                        <Select
                          selectedKey={selectedBranchId}
                          onSelectionChange={(k) => { setSelectedBranchId(k as string); clearError('branchId'); }}
                          placeholder="Select branch"
                          variant="secondary"
                          aria-label="Select branch"
                        >
                          <Select.Trigger className={`h-10 text-sm ${errors.branchId ? 'border-danger' : ''}`}>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {newBranches.filter((b) => b.tenantId === effectiveTenantId).map((b) => (
                                <ListBox.Item key={b.id} id={b.id} textValue={b.name}>
                                  {b.name}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                        {errors.branchId && <p className="text-xs text-danger">{errors.branchId}</p>}
                      </div>
                    )}

                    <div className="h-px bg-border/60 my-4" />

                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-0.5 h-3.5 bg-primary/60 rounded-full shrink-0" />
                      <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">Customer</span>
                    </div>
                    <CustomerAssigner
                      customers={allCustomers}
                      customerId={assignerData.customerId ?? ''}
                      onChange={handleAssignerChange}
                      phoneDialCode={phoneDialCode}
                      phoneFlag={phoneFlag}
                      clearError={() => clearError('customerId')}
                      errors={errors}
                    />

                    {!assignerData.customerId && (
                      <>
                        <div className="h-px bg-border/60 my-4" />
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-0.5 h-3.5 bg-primary/60 rounded-full shrink-0" />
                          <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">Contact</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="manual-email" className="text-[11px] font-semibold text-muted uppercase tracking-widest">Email</label>
                            <Input id="manual-email" variant="secondary" type="email" placeholder="customer@example.com"
                              value={assignerData.contactEmail}
                              onChange={(e) => handleAssignerChange({ ...assignerData, contactEmail: e.target.value })}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="manual-phone" className="text-[11px] font-semibold text-muted uppercase tracking-widest">Phone</label>
                            <div className="flex">
                              <div className="flex items-center gap-1 px-2.5 border border-r-0 border-border rounded-l-lg bg-muted/10 text-xs text-muted font-medium shrink-0">
                                {phoneFlag && <span>{phoneFlag}</span>}{phoneDialCode}
                              </div>
                              <Input id="manual-phone" variant="secondary" type="tel" placeholder="Phone number"
                                value={assignerData.contactPhone.replace(phoneDialCode, '').trim()}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/\D/g, '');
                                  handleAssignerChange({
                                    ...assignerData,
                                    contactPhone: raw ? `${phoneDialCode} ${raw}` : '',
                                  });
                                }}
                                className="rounded-l-none border-l-0 flex-1 min-w-0 [&_input]:rounded-l-none"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {createStep === 2 && (
                  <div className="pt-2">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-0.5 h-4 bg-primary rounded-full shrink-0" />
                      <p className="text-sm font-semibold text-foreground">Sender</p>
                      <p className="text-xs text-muted">— Pickup address</p>
                    </div>
                    <AddressForm prefix="sender" value={senderAddress} onChange={setSenderAddress} showCountry={false} />
                  </div>
                )}

                {createStep === 3 && (
                  <div className="pt-2">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-0.5 h-4 bg-primary rounded-full shrink-0" />
                      <p className="text-sm font-semibold text-foreground">Recipient</p>
                      <p className="text-xs text-muted">— Delivery address & contact</p>
                    </div>
                    <AddressForm prefix="recipient" value={recipientAddress} onChange={setRecipientAddress} showContact />
                  </div>
                )}

                {createStep === 4 && (
                  <div className="pt-2">
                    <div className="divide-y divide-border/60 rounded-sm border border-border bg-muted/5">
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-0.5 h-3.5 bg-primary/60 rounded-full shrink-0" />
                          <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">Shipment Info</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted">Tracking</div>
                          <div className="font-medium">{newTrackingNumber}</div>
                          <div className="text-muted">Bill Amount</div>
                          <div className="font-medium">{formatCurrency(billAmount, tenantCurrency)}</div>
                          <div className="text-muted">Customer</div>
                          <div className="font-medium">{assignerData.customerId ? allCustomers.find(c => c.id === assignerData.customerId)?.name || 'Selected' : assignerData.contactEmail || assignerData.contactPhone || 'Self'}</div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-0.5 h-3.5 bg-primary/60 rounded-full shrink-0" />
                          <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">Sender</span>
                        </div>
                        <p className="text-sm">{addressDisplay(senderAddress) || <span className="text-muted italic">Not provided</span>}</p>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-0.5 h-3.5 bg-primary/60 rounded-full shrink-0" />
                          <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">Recipient</span>
                        </div>
                        <p className="text-sm">{addressDisplay(recipientAddress) || <span className="text-muted italic">Not provided</span>}</p>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </Modal.Body>
            <Modal.Footer className="flex gap-2 pt-4 border-t border-border">
              {createStep > 1 ? (
                <Button variant="secondary" onPress={() => setCreateStep((s) => s - 1)}>Back</Button>
              ) : (
                <Button variant="secondary" onPress={() => { setCreateOpen(false); setCreateStep(1); }}>Cancel</Button>
              )}
              {createStep < 4 ? (
                <Button variant="primary" onPress={() => setCreateStep((s) => s + 1)}>Next</Button>
              ) : (
                <Button type="submit" form="create-form" isPending={createShipment.isPending} isDisabled={!newTrackingNumber}>Create Shipment</Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop isOpen={!!deleteTarget} onOpenChange={(v: boolean) => { if (!v) setDeleteTarget(null); }}>
        <Modal.Container>
          <Modal.Dialog aria-label="Delete Shipment">
            <Modal.Header>Delete Shipment</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">Are you sure you want to delete shipment <strong>{deleteTarget?.trackingNumber}</strong>? This action cannot be undone.</p>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" isPending={deleteShipment.isPending} onPress={() => {
                if (deleteTarget) { deleteShipment.mutate(deleteTarget.id); setDeleteTarget(null); }
              }}>{deleteShipment.isPending ? 'Deleting...' : 'Delete'}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      </>)}
    </div>
  );
}

