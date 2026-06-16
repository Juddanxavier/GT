'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Eye, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button, Chip, Description, Dropdown, Input, Label, Modal, NumberField, Pagination, Table, Tabs, cn, type Key, type SortDescriptor } from '@heroui/react';
import { api } from '@/lib/api';
import { CopyButton, Flag, countryFromString } from '@/components/copy-button';

interface ApiShipment {
  id: string;
  trackingNo: string;
  status: string;
  customerId: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  carrier: string;
  origin: string;
  destination: string;
  billAmount: string | null;
  labelCode: string | null;
  trackingRegistered: boolean;
  lastTrackedAt: string | null;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

const STATUS_COLORS: Record<string, 'warning' | 'accent' | 'success' | 'danger'> = {
  pending: 'warning',
  info_received: 'warning',
  in_transit: 'accent',
  out_for_delivery: 'accent',
  delivered: 'success',
  delivery_failure: 'danger',
  cancelled: 'danger',
  exception: 'danger',
};

const ROWS_PER_PAGE = 4;

function SortableHeader({ children, sortDirection }: { children: React.ReactNode; sortDirection?: 'ascending' | 'descending' }) {
  return (
    <span className="flex items-center gap-1 select-none">
      {children}
      {sortDirection && (
        <ChevronDown size={12} className={cn('transition-transform duration-100', sortDirection === 'descending' ? 'rotate-180' : '')} />
      )}
    </span>
  );
}

function EyeIcon() { return <Eye size={16} />; }
function EditIcon() { return <Pencil size={16} />; }
function TrashIcon() { return <Trash2 size={16} />; }
function DotsIcon() { return <MoreVertical size={16} />; }

export default function ShipmentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'trackingNumber', direction: 'ascending' });
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; trackingNumber: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [newCustomers, setNewCustomers] = useState<{ id: string; name: string }[]>([]);
  const [newBranches, setNewBranches] = useState<{ id: string; name: string }[]>([]);
  const [shipmentsRaw, setShipmentsRaw] = useState<ApiShipment[]>([]);
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newCustomerSelf, setNewCustomerSelf] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerLookupResult, setCustomerLookupResult] = useState<Customer | null | 'not-found'>(null);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [unclaimedEmail, setUnclaimedEmail] = useState('');
  const [unclaimedPhone, setUnclaimedPhone] = useState('');
  const [newTrackingNumber, setNewTrackingNumber] = useState('');
  const [billAmount, setBillAmount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Customer[]>('/api/customers'),
      api.get<Customer[]>('/api/branches'),
      api.get<ApiShipment[]>('/api/shipments'),
    ]).then(([custs, brs, ships]) => {
      setNewCustomers(custs);
      setNewBranches(brs);
      setShipmentsRaw(ships);
    }).catch(() => {});
  }, []);

  async function lookupCustomer() {
    const q = customerEmail || customerPhone;
    if (!q) return;
    setCustomerLookupLoading(true);
    try {
      const results = await api.get<Customer[]>(`/api/customers?search=${encodeURIComponent(q)}`);
      if (results.length > 0) {
        setCustomerLookupResult(results[0]!);
        setNewCustomerId(results[0]!.id);
      } else {
        setCustomerLookupResult('not-found');
        setUnclaimedEmail(customerEmail);
        setUnclaimedPhone(customerPhone);
      }
    } catch {
      setCustomerLookupResult('not-found');
      setUnclaimedEmail(customerEmail);
      setUnclaimedPhone(customerPhone);
    }
    setCustomerLookupLoading(false);
  }

  async function detectCarrier() {
    if (!newTrackingNumber.trim()) return;
    setDetecting(true);
    try {
      await api.post<{ detected: { key: string; name: string } | null }>('/api/shipments/detect', { trackingNo: newTrackingNumber.trim() });
    } catch {
      alert('Carrier detection failed.');
    }
    setDetecting(false);
  }

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of newCustomers) map.set(c.id, c.name);
    return map;
  }, [newCustomers]);

  const filtered = useMemo(() => {
    let items = shipmentsRaw.map((s) => ({
      id: s.id,
      trackingNumber: s.trackingNo,
      labelCode: s.labelCode,
      carrier: s.carrier ?? '',
      status: s.status,
      customerName: s.customerId ? (customerMap.get(s.customerId) ?? '—') : s.contactEmail || s.contactPhone || 'Self',
      billAmount: s.billAmount as string | undefined,
      createdAt: s.createdAt,
    }));
    if (statusFilter !== 'all') items = items.filter((s) => s.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (s) => s.trackingNumber.toLowerCase().includes(q) || s.carrier.toLowerCase().includes(q) || s.customerName?.toLowerCase().includes(q),
      );
    }
    const col = sortDescriptor.column as keyof typeof items[number];
    const dir = sortDescriptor.direction;
    items = [...items].sort((a, b) => {
      const valA = String(a[col] ?? '');
      const valB = String(b[col] ?? '');
      const cmp = valA.localeCompare(valB);
      return dir === 'descending' ? -cmp : cmp;
    });
    return items;
  }, [search, sortDescriptor, statusFilter, shipmentsRaw, customerMap]);

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return filtered.slice(start, start + ROWS_PER_PAGE);
  }, [page, filtered]);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = (page - 1) * ROWS_PER_PAGE + 1;
  const end = Math.min(page * ROWS_PER_PAGE, filtered.length);

  function handleContextAction(key: Key, shipment: { id: string; trackingNumber: string }) {
    if (key === 'view') router.push(`/shipments/${shipment.id}`);
    else if (key === 'edit') router.push(`/shipments/${shipment.id}/edit`);
    else if (key === 'delete') setDeleteTarget(shipment);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/shipments/${deleteTarget.id}`);
      setShipmentsRaw((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { /* ignore */ }
    setDeleting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Shipments</h1>
          <p className="text-sm text-muted">Track and manage shipments</p>
        </div>
        <Button onPress={() => { setNewCustomerId(''); setNewCustomerSelf(false); setCustomerEmail(''); setCustomerPhone(''); setCustomerLookupResult(null); setUnclaimedEmail(''); setUnclaimedPhone(''); setNewTrackingNumber(''); setBillAmount(0); setCustomerName(''); setCreateOpen(true); }}>New Shipment</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <a className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all block">
          <div className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <p className="text-4xl font-bold tracking-tight text-foreground">{filtered.length}</p>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-success/10 text-success">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                12.5%
              </span>
            </div>
            <p className="text-sm text-muted mt-1">Total</p>
          </div>
          <svg className="w-full h-8 text-accent/30" viewBox="0 0 120 24" preserveAspectRatio="none">
            <defs><linearGradient id="g-s-total" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.4" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,18 L10,14 L20,12 L30,8 L40,4 L50,6 L60,4 L70,2 L80,4 L90,2 L100,4 L110,2 L120,2 L120,24 L0,24 Z" fill="url(#g-s-total)" />
            <polyline points="0,18 10,14 20,12 30,8 40,4 50,6 60,4 70,2 80,4 90,2 100,4 110,2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <a className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all block">
          <div className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <p className="text-4xl font-bold tracking-tight text-foreground">{filtered.filter((s) => s.status === 'in_transit').length}</p>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-success/10 text-success">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                8.3%
              </span>
            </div>
            <p className="text-sm text-muted mt-1">In Transit</p>
          </div>
          <svg className="w-full h-8 text-accent/30" viewBox="0 0 120 24" preserveAspectRatio="none">
            <defs><linearGradient id="g-s-transit" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.4" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,20 L10,8 L20,22 L30,10 L40,18 L50,6 L60,14 L70,4 L80,16 L90,6 L100,18 L110,8 L120,8 L120,24 L0,24 Z" fill="url(#g-s-transit)" />
            <polyline points="0,20 10,8 20,22 30,10 40,18 50,6 60,14 70,4 80,16 90,6 100,18 110,8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <a className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all block">
          <div className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <p className="text-4xl font-bold tracking-tight text-foreground">{filtered.filter((s) => s.status === 'delivered').length}</p>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-success/10 text-success">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                15.2%
              </span>
            </div>
            <p className="text-sm text-muted mt-1">Delivered</p>
          </div>
          <svg className="w-full h-8 text-success/30" viewBox="0 0 120 24" preserveAspectRatio="none">
            <defs><linearGradient id="g-s-delivered" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.4" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,20 L10,18 L20,16 L30,14 L40,12 L50,10 L60,8 L70,6 L80,4 L90,6 L100,4 L110,4 L120,4 L120,24 L0,24 Z" fill="url(#g-s-delivered)" />
            <polyline points="0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6 80,4 90,6 100,4 110,4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <a className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all block">
          <div className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <p className="text-4xl font-bold tracking-tight text-foreground">{filtered.filter((s) => s.status === 'pending').length}</p>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-warning/10 text-warning">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                3.2%
              </span>
            </div>
            <p className="text-sm text-muted mt-1">Pending</p>
          </div>
          <svg className="w-full h-8 text-warning/30" viewBox="0 0 120 24" preserveAspectRatio="none">
            <defs><linearGradient id="g-s-pending" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.4" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,12 L10,14 L20,10 L30,12 L40,8 L50,10 L60,6 L70,8 L80,4 L90,6 L100,8 L110,4 L120,4 L120,24 L0,24 Z" fill="url(#g-s-pending)" />
            <polyline points="0,12 10,14 20,10 30,12 40,8 50,10 60,6 70,8 80,4 90,6 100,8 110,4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="sm:flex-1"><Input variant="secondary" placeholder="Search shipments..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} fullWidth /></div>
            <Tabs selectedKey={statusFilter} onSelectionChange={(key) => { setStatusFilter(key as string); setPage(1); }} className="sm:flex-1">
              <Tabs.List>
                <Tabs.Tab id="all">All</Tabs.Tab>
                <Tabs.Tab id="in_transit">In Transit</Tabs.Tab>
                <Tabs.Tab id="delivered">Delivered</Tabs.Tab>
                <Tabs.Tab id="pending">Pending</Tabs.Tab>
                <Tabs.Tab id="cancelled">Cancelled</Tabs.Tab>
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
                  {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Tracking #</SortableHeader>}
                </Table.Column>
                <Table.Column allowsSorting id="labelCode">
                  {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Label Code</SortableHeader>}
                </Table.Column>
                <Table.Column allowsSorting id="customerName">
                  {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Customer</SortableHeader>}
                </Table.Column>
                <Table.Column allowsSorting id="carrier">
                  {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Carrier</SortableHeader>}
                </Table.Column>
                <Table.Column allowsSorting id="billAmount" width={100}>
                  {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Bill</SortableHeader>}
                </Table.Column>
                <Table.Column allowsSorting id="status">
                  {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Status</SortableHeader>}
                </Table.Column>
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
                      <Chip size="sm" variant="soft" color={STATUS_COLORS[shipment.status] ?? 'default'}>{shipment.status.replace(/_/g, ' ')}</Chip>
                    </Table.Cell>
                    <Table.Cell>
                      <Dropdown.Root>
                        <Dropdown.Trigger className="inline-flex items-center justify-center rounded-md min-w-0 px-1 h-7 text-muted hover:text-foreground hover:bg-muted transition-colors outline-none text-sm">
                          <DotsIcon />
                        </Dropdown.Trigger>
                        <Dropdown.Popover placement="bottom end">
                          <Dropdown.Menu onAction={(key) => handleContextAction(key, shipment)}>
                            <Dropdown.Item id="view" textValue="View"><span className="flex items-center gap-2"><EyeIcon /> View</span></Dropdown.Item>
                            <Dropdown.Item id="edit" textValue="Edit"><span className="flex items-center gap-2"><EditIcon /> Edit</span></Dropdown.Item>
                            <Dropdown.Item id="delete" textValue="Delete"><span className="flex items-center gap-2"><TrashIcon /> Delete</span></Dropdown.Item>
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
                <Pagination.Summary>{start} to {end} of {filtered.length} results</Pagination.Summary>
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
              <form id="create-form" onSubmit={async (e) => { e.preventDefault(); setCreateSaving(true); try { const dup = shipmentsRaw.find((s) => s.trackingNo.toLowerCase() === newTrackingNumber.trim().toLowerCase()); if (dup) { alert(`Tracking number "${newTrackingNumber}" already exists (${dup.id.slice(0, 8)}...).`); setCreateSaving(false); return; } const email = customerEmail || unclaimedEmail || undefined; const phone = customerPhone || unclaimedPhone || undefined; const created = await api.post<ApiShipment>('/api/shipments', { customerId: newCustomerSelf || !newCustomerId ? undefined : newCustomerId, customerName: customerName || undefined, contactEmail: email, contactPhone: phone, trackingNo: newTrackingNumber.trim(), billAmount: billAmount || undefined }); setShipmentsRaw((prev) => [created, ...prev]); setCreateOpen(false); } finally { setCreateSaving(false); } }} className="space-y-5">
                <div className="space-y-1">
                  <Label htmlFor="new-trackingNo">Tracking Number *</Label>
                  <div className="flex gap-2">
                    <Input id="new-trackingNo" variant="secondary" value={newTrackingNumber} onChange={(e) => setNewTrackingNumber(e.target.value)} required className="flex-1" />
                    <Button variant="secondary" isPending={detecting} onPress={detectCarrier} isDisabled={!newTrackingNumber.trim()}>Detect</Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-billAmount">Bill Amount</Label>
                  <NumberField.Root variant="secondary" fullWidth value={billAmount} onChange={(v) => setBillAmount(v)}>
                    <NumberField.Group>
                      <NumberField.DecrementButton />
                      <NumberField.Input id="new-billAmount" placeholder="0.00" />
                      <NumberField.IncrementButton />
                    </NumberField.Group>
                  </NumberField.Root>
                  <Description>Enter the shipment bill amount</Description>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-customerName">Customer Name *</Label>
                  <Input id="new-customerName" variant="secondary" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required fullWidth />
                </div>
                <div className="space-y-2">
                  <Label>Customer</Label>
                  {newCustomerSelf ? (
                    <div className="flex items-center gap-2 text-sm text-muted bg-surface rounded-lg border border-border px-3 py-2">
                      <span className="italic">Self — no notifications</span>
                      <Button size="sm" variant="secondary" onPress={() => setNewCustomerSelf(false)}>Change</Button>
                    </div>
                  ) : newCustomerId ? (
                    <div className="flex items-center gap-2 text-sm bg-surface rounded-lg border border-border px-3 py-2">
                      <span>{customerLookupResult && typeof customerLookupResult !== 'string' ? customerLookupResult.name : 'Customer'}</span>
                      <button type="button" className="text-xs text-muted underline ml-auto" onClick={() => { setNewCustomerId(''); setCustomerLookupResult(null); setCustomerEmail(''); setCustomerPhone(''); }}>Change</button>
                    </div>
                  ) : customerLookupResult === 'not-found' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm bg-surface rounded-lg border border-border px-3 py-2">
                        <span className="font-medium">{unclaimedEmail || unclaimedPhone}</span>
                        <span className="text-xs text-muted">— will be assignable later</span>
                        <button type="button" className="text-xs underline ml-auto" onClick={() => { setCustomerLookupResult(null); }}>Change</button>
                      </div>
                      {unclaimedEmail && <p className="text-xs text-muted">Invite link will be sent to {unclaimedEmail} (Phase 6)</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Description>Enter email or phone to find an existing customer</Description>
                      <div className="grid grid-cols-2 gap-3">
                        <Input variant="secondary" placeholder="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} fullWidth />
                        <Input variant="secondary" placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} fullWidth />
                      </div>
                      <div className="flex items-center gap-3">
                        <Button size="sm" variant="secondary" isPending={customerLookupLoading} onPress={lookupCustomer}>Lookup Customer</Button>
                        <Button size="sm" variant={newCustomerSelf ? "secondary" : "outline"} onPress={() => { setNewCustomerSelf(true); setNewCustomerId(''); setCustomerLookupResult(null); setCustomerEmail(''); setCustomerPhone(''); }}>
                          Self
                        </Button>
                      </div>
                      <Description>Self means no customer assignment - shipment will not receive any email or WhatsApp notifications</Description>
                    </div>
                  )}
                </div>
              </form>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" form="create-form" isPending={createSaving} isDisabled={!newTrackingNumber}>Create Shipment</Button>
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
              <Button variant="danger" isPending={deleting} onPress={handleDelete}>{deleting ? 'Deleting...' : 'Delete'}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
