'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FILTER_GROUPS, STATUS_GROUPS, STATUS_META } from '@repo/ui/status-config';
import { Eye, MoreVertical, Pencil, Trash2, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { Button, Chip, Description, Dropdown, Input, Label, ListBox, Modal, NumberField, Pagination, Select, Spinner, Table, Tabs, type Key, type SortDescriptor } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { CustomerAssigner } from '@/components/customer-assigner';
import { CopyButton, Flag } from '@/components/copy-button';
import { authClient } from '@/lib/auth-client';
import { useShipments, useCustomers, useBranches, useTenants, useCreateShipment, useDeleteShipment, useShipmentTrend, type PaginatedResult, type Shipment } from '@/lib/queries';
import { KpiCard } from '@/components/kpi-card';
import { usePageTitle } from '@/lib/use-page-title';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import { getCountryCode } from '@/lib/country-codes';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

const ROWS_PER_PAGE = 10;



export default function ShipmentsPage() {
  usePageTitle('Shipments');
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'trackingNumber', direction: 'ascending' });
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; trackingNumber: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [assignerData, setAssignerData] = useState<{ customerId: string | null; contactEmail: string; contactPhone: string }>({
    customerId: null,
    contactEmail: '',
    contactPhone: '',
  });
  const [newTrackingNumber, setNewTrackingNumber] = useState('');
  const [billAmount, setBillAmount] = useState(0);

  const { data: session } = authClient.useSession();
  const userData = session?.user as Record<string, unknown> | undefined;
  const userRole = userData?.role as string | undefined;
  const isSuperAdmin = userRole === 'superadmin';
  const isTenantAdmin = userRole === 'tenant-admin';
  const userTenantId = userData?.tenantId as string | undefined;
  const { tenantFilter, branchFilter } = useTenantFilter();
  const effectiveTenantId = isSuperAdmin ? tenantFilter : (userTenantId ?? '');
  const { data: tenants = [] } = useTenants();
  const tenantCountry = useMemo(() => {
    const t = tenants.find((t) => t.id === effectiveTenantId);
    return t?.country ?? undefined;
  }, [effectiveTenantId, tenants]);
  const phoneDialCode = getCountryCode(tenantCountry).dialCode;
  const phoneFlag = getCountryCode(tenantCountry).flag;

  // Compute comma-separated statuses from selected group filter
  const computedStatus = useMemo(() => {
    if (statusFilter === 'all') return 'all';
    return STATUS_GROUPS[statusFilter]?.join(',') ?? 'all';
  }, [statusFilter]);

  // Compute count badges per group from per-status counts
  const groupCounts = useMemo(() => {
    const result: Record<string, number> = { all: totalCount };
    if (!counts) return result;
    for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
      result[group] = statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
    }
    return result;
  }, [counts, totalCount]);

  // Server-side pagination: pass page, ROWS_PER_PAGE, status, and search to the API
  const shipmentsQuery = useShipments(page, ROWS_PER_PAGE, computedStatus, search);
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
  const { data: allCustomers = [] } = useCustomers();
  const { data: newBranches = [] } = useBranches();
  const queryClient = useQueryClient();

  const [selectedBranchId, setSelectedBranchId] = useState(branchFilter);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = (field: string) => setErrors((prev) => { const { [field]: _, ...rest } = prev; return rest; });
  const createShipment = useCreateShipment();
  const deleteShipment = useDeleteShipment();

  const LAST_CUSTOMER_KEY = 'gt:lastCustomerId';
  function handleAssignerChange(data: { customerId: string | null; contactEmail: string; contactPhone: string }) {
    setAssignerData(data);
    if (data.customerId && data.customerId !== 'self') {
      try { localStorage.setItem(LAST_CUSTOMER_KEY, data.customerId); } catch {}
    }
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

  const totalPages = Math.max(1, Math.ceil(totalCount / ROWS_PER_PAGE));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = (page - 1) * ROWS_PER_PAGE + 1;
  const end = Math.min(page * ROWS_PER_PAGE, totalCount);
  const isPending = shipmentsQuery.isPending;
  const isError = shipmentsQuery.isError;
  const refetch = shipmentsQuery.refetch;

  function handleContextAction(key: Key, shipment: typeof paginated[number]) {
    if (key === 'view' || key === 'edit') router.push(`/shipments/${shipment.id}`);
    else if (key === 'delete') setDeleteTarget(shipment);
  }

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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Shipments</h1>
          <p className="text-sm text-muted">Track and manage shipments</p>
        </div>
        <Button onPress={() => {
          setErrors({}); setNewTrackingNumber(''); setBillAmount(0); setCreateOpen(true);
          const lastId = typeof window !== 'undefined' ? localStorage.getItem(LAST_CUSTOMER_KEY) : null;
          const lastCust = lastId ? allCustomers.find((c) => c.id === lastId) : undefined;
          setAssignerData({ customerId: lastCust?.id ?? null, contactEmail: '', contactPhone: '' });
        }}>New Shipment</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: totalCount, color: '#3b82f6', icon: Package, key: 'total' },
          { label: 'In Transit', count: counts?.in_transit ?? 0, color: '#8b5cf6', icon: Truck, key: 'inTransit' },
          { label: 'Delivered', count: counts?.delivered ?? 0, color: '#22c55e', icon: CheckCircle, key: 'delivered' },
          { label: 'Pending', count: counts?.pending ?? 0, color: '#f59e0b', icon: Clock, key: 'pending' },
        ].map(({ label, count, color, icon: Icon, key }) => {
          const data = sparklines[key as keyof typeof sparklines];
          const t = trend[key as keyof typeof trend];
          const up = t >= 0;
          const max = Math.max(...data) || 1;
          const min = Math.min(...data);
          const range = max - min || 1;
          const w = 80; const h = 32;
          const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(1)}`).join(' ');
          const area = `0,${h} ${pts} ${w},${h}`;
          return (
            <a key={label} className="rounded-xl border border-border bg-surface hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col">
              <div className="p-5 pb-3 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">{label}</span>
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold tracking-tight">{count}</p>
                    <span className={`text-xs font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
                      {up ? '↑' : '↓'} {Math.abs(t)}%
                    </span>
                  </div>
                  <div className="w-20 h-8">
                    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id={`fill-${label.replace(/\s/g, '')}`} x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
                        </linearGradient>
                      </defs>
                      <polygon points={area} fill={`url(#fill-${label.replace(/\s/g, '')})`} />
                      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="sm:flex-1"><Input variant="secondary" placeholder="Search shipments..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} fullWidth /></div>
            <Tabs selectedKey={statusFilter} onSelectionChange={(key) => { setStatusFilter(key as string); setPage(1); }} className="sm:flex-[2] overflow-x-auto">
              <Tabs.List>
                <Tabs.Tab id="all">All{groupCounts.all > 0 ? ` (${groupCounts.all})` : ''}</Tabs.Tab>
                {FILTER_GROUPS.map((group) => (
                  <Tabs.Tab key={group} id={group}>
                    {group}{groupCounts[group] > 0 ? ` (${groupCounts[group]})` : ''}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
          </div>
        </div>
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Shipments" className="min-w-[1050px]" sortDescriptor={sortDescriptor} onSortChange={(d) => { setSortDescriptor(d); setPage(1); }}>
              <Table.Header>
                <Table.Column id="#" width={48}>
                  {() => <span className="text-muted text-xs">#</span>}
                </Table.Column>
                <Table.Column allowsSorting id="trackingNumber" isRowHeader>
                  <span className="text-muted text-xs">Tracking #</span>
                </Table.Column>
                <Table.Column allowsSorting id="labelCode">Label Code</Table.Column>
                <Table.Column allowsSorting id="customerName">Customer</Table.Column>
                <Table.Column allowsSorting id="carrier">Carrier</Table.Column>
                <Table.Column allowsSorting id="billAmount" width={100}>Bill</Table.Column>
                <Table.Column allowsSorting id="status">Status</Table.Column>
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
                  <Table.Row key={shipment.id} id={shipment.id}>
                    <Table.Cell><span className="text-xs text-muted">{start + i}</span></Table.Cell>
                    <Table.Cell>
                      <span className="font-mono text-xs font-medium inline-flex items-center gap-1">
                        {shipment.trackingNumber}
                        <CopyButton text={shipment.trackingNumber} label="tracking number" />
                      </span>
                    </Table.Cell>
                    <Table.Cell className="font-mono text-xs">{shipment.labelCode || '—'}</Table.Cell>
                    <Table.Cell>{shipment.customerName || '—'}</Table.Cell>
                    <Table.Cell>{shipment.carrier}</Table.Cell>
                    <Table.Cell>{shipment.billAmount ? `₹${shipment.billAmount}` : '—'}</Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" variant="soft" color={STATUS_META[shipment.status]?.color ?? 'default'}>{STATUS_META[shipment.status]?.label ?? shipment.status.replace(/_/g, ' ')}</Chip>
                    </Table.Cell>
                    <Table.Cell>
                      <Dropdown.Root>
                        <Dropdown.Trigger className="inline-flex items-center justify-center rounded-md min-w-0 px-1 h-7 text-muted hover:text-foreground hover:bg-muted transition-colors outline-none text-sm">
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
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          <Table.Footer>
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
            </Table.Footer>
        </Table>
      </div>

      <Modal.Backdrop isOpen={createOpen} onOpenChange={(v: boolean) => { if (!v) setCreateOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>New Shipment</Modal.Header>
            <Modal.Body>
              <form id="create-form" onSubmit={async (e) => {
                e.preventDefault();
                setErrors({});
                if ((document.getElementById('hp-create') as HTMLInputElement)?.value) return;
                const payload = {
                  trackingNo: newTrackingNumber.trim(),
                  billAmount: billAmount || undefined,
                  branchId: selectedBranchId || undefined,
                };
                if (!payload.trackingNo?.trim()) { setErrors({ trackingNo: 'Tracking number is required' }); return; }
                const dup = shipmentRows.find((s) => s.trackingNo.toLowerCase() === newTrackingNumber.trim().toLowerCase());
                if (dup) { setErrors({ trackingNo: `Already exists (${dup.id.slice(0, 8)}...)` }); return; }
                const customerId = assignerData.customerId === 'self' ? undefined : assignerData.customerId;
                const email = assignerData.contactEmail || undefined;
                const phone = assignerData.contactPhone || undefined;
                createShipment.mutate({
                  customerId,
                  contactEmail: email,
                  contactPhone: phone,
                  ...payload,
                  tenantId: effectiveTenantId || undefined,
                }, { onSuccess: () => setCreateOpen(false) });
              }} className="flex flex-col gap-4">
                {/* Honeypot */}
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <label htmlFor="hp-create">Leave empty</label>
                  <input id="hp-create" name="website" type="text" tabIndex={-1} autoComplete="off" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="new-trackingNo">Tracking Number *</Label>
                  <Input id="new-trackingNo" variant="secondary" value={newTrackingNumber} onChange={(e) => { setNewTrackingNumber(e.target.value); clearError('trackingNo'); }} required />
                  {errors.trackingNo && <p className="text-xs text-danger">{errors.trackingNo}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="new-billAmount">Bill Amount</Label>
                  <NumberField.Root variant="secondary" fullWidth value={billAmount} onChange={(v) => { setBillAmount(v); clearError('billAmount'); }}>
                    <NumberField.Group>
                      <NumberField.DecrementButton />
                      <NumberField.Input id="new-billAmount" placeholder="0.00" />
                      <NumberField.IncrementButton />
                    </NumberField.Group>
                  </NumberField.Root>
                </div>
                {(isSuperAdmin || isTenantAdmin) && (
                  <div className="flex flex-col gap-1">
                    <Label>Branch</Label>
                    <Select
                      selectedKey={selectedBranchId}
                      onSelectionChange={(k) => { setSelectedBranchId(k as string); clearError('branchId'); }}
                      placeholder="Select branch"
                      variant="secondary"
                      aria-label="Select branch"
                    >
                      <Select.Trigger className="h-10 text-sm">
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
                <CustomerAssigner
                  customers={allCustomers}
                  customerId={assignerData.customerId ?? ''}
                  onChange={handleAssignerChange}
                  phoneDialCode={phoneDialCode}
                  phoneFlag={phoneFlag}
                  clearError={() => {}}
                />
              </form>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" form="create-form" isPending={createShipment.isPending} isDisabled={!newTrackingNumber}>Create Shipment</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop isOpen={!!deleteTarget} onOpenChange={(v: boolean) => { if (!v) setDeleteTarget(null); }}>
        <Modal.Container>
          <Modal.Dialog>
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

