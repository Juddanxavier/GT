'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Eye, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button, Chip, Dropdown, Input, Label, Modal, Pagination, Skeleton, Table, Tabs, cn, type Key, type SortDescriptor } from '@heroui/react';
import { useQuotations, useCustomers, useCreateQuotation, useDeleteQuotation, type Quotation } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';

const STATUS_COLORS: Record<string, 'default' | 'accent' | 'success' | 'danger' | 'warning'> = {
  draft: 'default',
  sent: 'accent',
  accepted: 'success',
  rejected: 'danger',
  converted: 'warning',
};

const ROWS_PER_PAGE = 10;

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

export default function QuotationsPage() {
  usePageTitle('Quotations');
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'quoteNumber', direction: 'ascending' });
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const { data: quotations = [], isPending, isError, refetch } = useQuotations();
  const { data: newCustomers = [] } = useCustomers();
  const createQuotation = useCreateQuotation();
  const deleteQuotation = useDeleteQuotation();
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newStatus, setNewStatus] = useState('draft');
  const [newQuoteNo, setNewQuoteNo] = useState('');
  const [newValidUntil, setNewValidUntil] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newItems, setNewItems] = useState<{ description: string; quantity: number; unitPrice: number; total: number }[]>([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);

  function updateNewItem(index: number, field: string, value: string | number) {
    setNewItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      updated.total = updated.quantity * updated.unitPrice;
      return updated;
    }));
  }

  function addNewItem() { setNewItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0, total: 0 }]); }

  function removeNewItem(index: number) { setNewItems((prev) => prev.filter((_, i) => i !== index)); }

  const newGrandTotal = newItems.reduce((sum, item) => sum + item.total, 0);

  const filtered = useMemo(() => {
    let items = quotations;
    if (statusFilter !== 'all') items = items.filter((q) => q.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((qt) => qt.quoteNumber.toLowerCase().includes(q) || qt.customerName?.toLowerCase().includes(q));
    }
    const col = sortDescriptor.column as keyof Quotation;
    const dir = sortDescriptor.direction;
    items = [...items].sort((a, b) => {
      const valA = String(a[col] ?? '');
      const valB = String(b[col] ?? '');
      const cmp = valA.localeCompare(valB);
      return dir === 'descending' ? -cmp : cmp;
    });
    return items;
  }, [search, sortDescriptor, statusFilter]);

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return filtered.slice(start, start + ROWS_PER_PAGE);
  }, [page, filtered]);

  const start = (page - 1) * ROWS_PER_PAGE + 1;
  const end = Math.min(page * ROWS_PER_PAGE, filtered.length);

  function handleContextAction(key: Key, quotation: Quotation) {
    if (key === 'view') router.push(`/quotations/${quotation.id}`);
    else if (key === 'edit') router.push(`/quotations/${quotation.id}`);
    else if (key === 'delete') setDeleteTarget(quotation);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteQuotation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted">Manage customer quotations</p>
        </div>
        <Button onPress={() => { setNewCustomerId(''); setNewStatus('draft'); setNewValidUntil(''); setNewNotes(''); setNewItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]); setCreateOpen(true); }}>New Quotation</Button>
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
            <defs><linearGradient id="g-q-total" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.4" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,18 L10,14 L20,12 L30,8 L40,4 L50,6 L60,4 L70,2 L80,4 L90,2 L100,4 L110,2 L120,2 L120,24 L0,24 Z" fill="url(#g-q-total)" />
            <polyline points="0,18 10,14 20,12 30,8 40,4 50,6 60,4 70,2 80,4 90,2 100,4 110,2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <a className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all block">
          <div className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <p className="text-4xl font-bold tracking-tight text-foreground">{filtered.filter((q) => q.status === 'sent').length}</p>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-success/10 text-success">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                8.3%
              </span>
            </div>
            <p className="text-sm text-muted mt-1">Sent</p>
          </div>
          <svg className="w-full h-8 text-accent/30" viewBox="0 0 120 24" preserveAspectRatio="none">
            <defs><linearGradient id="g-q-sent" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.4" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,20 L10,18 L20,16 L30,14 L40,12 L50,10 L60,8 L70,6 L80,4 L90,6 L100,4 L110,4 L120,4 L120,24 L0,24 Z" fill="url(#g-q-sent)" />
            <polyline points="0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6 80,4 90,6 100,4 110,4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <a className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all block">
          <div className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <p className="text-4xl font-bold tracking-tight text-foreground">{filtered.filter((q) => q.status === 'accepted').length}</p>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-success/10 text-success">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                15.2%
              </span>
            </div>
            <p className="text-sm text-muted mt-1">Accepted</p>
          </div>
          <svg className="w-full h-8 text-success/30" viewBox="0 0 120 24" preserveAspectRatio="none">
            <defs><linearGradient id="g-q-accepted" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.4" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,20 L10,18 L20,16 L30,14 L40,12 L50,10 L60,8 L70,6 L80,4 L90,6 L100,4 L110,4 L120,4 L120,24 L0,24 Z" fill="url(#g-q-accepted)" />
            <polyline points="0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6 80,4 90,6 100,4 110,4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <a className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all block">
          <div className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <p className="text-4xl font-bold tracking-tight text-foreground">{filtered.filter((q) => q.status === 'draft').length}</p>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-warning/10 text-warning">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                3.2%
              </span>
            </div>
            <p className="text-sm text-muted mt-1">Draft</p>
          </div>
          <svg className="w-full h-8 text-warning/30" viewBox="0 0 120 24" preserveAspectRatio="none">
            <defs><linearGradient id="g-q-draft" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.4" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,12 L10,14 L20,10 L30,12 L40,8 L50,10 L60,6 L70,8 L80,4 L90,6 L100,8 L110,4 L120,4 L120,24 L0,24 Z" fill="url(#g-q-draft)" />
            <polyline points="0,12 10,14 20,10 30,12 40,8 50,10 60,6 70,8 80,4 90,6 100,8 110,4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="sm:flex-1"><Input placeholder="Search quotations..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} fullWidth /></div>
            <Tabs selectedKey={statusFilter} onSelectionChange={(key) => { setStatusFilter(key as string); setPage(1); }} className="sm:flex-1">
              <Tabs.List>
                <Tabs.Tab id="all">All</Tabs.Tab>
                <Tabs.Tab id="draft">Draft</Tabs.Tab>
                <Tabs.Tab id="sent">Sent</Tabs.Tab>
                <Tabs.Tab id="accepted">Accepted</Tabs.Tab>
                <Tabs.Tab id="rejected">Rejected</Tabs.Tab>
                <Tabs.Tab id="converted">Converted</Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </div>
        </div>
        <QuotationsTable
          isPending={isPending}
          isError={isError}
          refetch={refetch}
          filtered={filtered}
          paginated={paginated}
          start={start}
          sortDescriptor={sortDescriptor}
          setSortDescriptor={setSortDescriptor}
          setPage={setPage}
          handleContextAction={handleContextAction}
          totalPages={totalPages}
          page={page} />
      </div>

      <Modal.Backdrop isOpen={createOpen} onOpenChange={(v: boolean) => { if (!v) setCreateOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>New Quotation</Modal.Header>
            <Modal.Body>
              <form id="create-form" onSubmit={async (e) => { e.preventDefault(); await createQuotation.mutateAsync({ quoteNo: newQuoteNo, customerId: newCustomerId, status: newStatus, validUntil: newValidUntil || undefined, notes: newNotes || undefined, items: newItems.map((i) => ({ description: i.description, quantity: i.quantity, rate: i.unitPrice, amount: i.total })) }); setCreateOpen(false); }} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="new-customerId">Customer *</Label>
                  <select id="new-customerId" value={newCustomerId} onChange={(e) => setNewCustomerId(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" required>
                    <option value="">Select customer...</option>
                    {newCustomers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-quoteNo">Quote No *</Label>
                  <Input id="new-quoteNo" value={newQuoteNo} onChange={(e) => setNewQuoteNo(e.target.value)} fullWidth required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="new-status">Status</Label>
                    <select id="new-status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                      {['draft', 'sent'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-validUntil">Valid Until</Label>
                    <Input id="new-validUntil" type="date" value={newValidUntil} onChange={(e) => setNewValidUntil(e.target.value)} fullWidth />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-notes">Notes</Label>
                  <textarea id="new-notes" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]" />
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium">Line Items</h3>
                    <Button size="sm" variant="secondary" type="button" onPress={addNewItem}>Add Item</Button>
                  </div>
                  {newItems.map((item, i) => (
                    <div key={i} className="flex items-end gap-3 p-3 border border-border rounded-lg mb-2">
                      <div className="flex-1 space-y-1">
                        <Label>Description</Label>
                        <Input value={item.description} onChange={(e) => updateNewItem(i, 'description', e.target.value)} fullWidth />
                      </div>
                      <div className="w-20 space-y-1">
                        <Label>Qty</Label>
                        <Input type="number" value={String(item.quantity)} onChange={(e) => updateNewItem(i, 'quantity', Number(e.target.value) || 0)} />
                      </div>
                      <div className="w-28 space-y-1">
                        <Label>Unit Price</Label>
                        <Input type="number" value={String(item.unitPrice)} onChange={(e) => updateNewItem(i, 'unitPrice', Number(e.target.value) || 0)} />
                      </div>
                      <div className="w-24 space-y-1">
                        <Label>Total</Label>
                        <p className="py-2 text-sm font-medium">${item.total.toFixed(2)}</p>
                      </div>
                      {newItems.length > 1 && <Button size="sm" variant="ghost" type="button" onPress={() => removeNewItem(i)}>×</Button>}
                    </div>
                  ))}
                  <div className="flex justify-end pt-2">
                    <p className="font-bold text-lg">Total: ${newGrandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </form>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" form="create-form" isPending={createQuotation.isPending}>Create Quotation</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      
      <Modal.Backdrop isOpen={!!deleteTarget} onOpenChange={(v: boolean) => { if (!v) setDeleteTarget(null); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Delete Quotation</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">Are you sure you want to delete quotation <strong>{deleteTarget?.quoteNumber}</strong>? This action cannot be undone.</p>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" isPending={deleteQuotation.isPending} onPress={handleDelete}>{deleteQuotation.isPending ? 'Deleting...' : 'Delete'}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}

function QuotationsTable({
  isPending, isError, refetch, filtered, paginated, start,
  sortDescriptor, setSortDescriptor, setPage,
  handleContextAction, totalPages, page
}: {
  isPending: boolean; isError: boolean; refetch: () => void;
  filtered: Quotation[]; paginated: Quotation[]; start: number;
  sortDescriptor: SortDescriptor; setSortDescriptor: (d: SortDescriptor) => void;
  setPage: (p: number | ((prev: number) => number)) => void;
  handleContextAction: (key: Key, quotation: Quotation) => void;
  totalPages: number; page: number;
}) {
  if (isPending) return (
    <div className="space-y-3 py-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4">
          <Skeleton className="h-4 w-8 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-4 w-36 rounded flex-1" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-6 w-20 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      ))}
    </div>
  );
  if (isError) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <p className="text-danger text-sm">Failed to load quotations</p>
      <Button variant="secondary" size="sm" onPress={() => refetch()}>Retry</Button>
    </div>
  );
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Quotations" className="min-w-[900px]" sortDescriptor={sortDescriptor} onSortChange={(d) => { setSortDescriptor(d); setPage(1); }}>
          <Table.Header>
            <Table.Column id="#" width={48}>
              {() => <span className="text-muted text-xs">#</span>}
            </Table.Column>
            <Table.Column allowsSorting id="quoteNumber" isRowHeader>
              {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Quote #</SortableHeader>}
            </Table.Column>
            <Table.Column allowsSorting id="customerName">
              {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Customer</SortableHeader>}
            </Table.Column>
            <Table.Column allowsSorting id="totalAmount">
              {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Amount</SortableHeader>}
            </Table.Column>
            <Table.Column allowsSorting id="status">
              {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Status</SortableHeader>}
            </Table.Column>
            <Table.Column allowsSorting id="validUntil">
              {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Valid Until</SortableHeader>}
            </Table.Column>
            <Table.Column id="actions" width={48}>
              {() => null}
            </Table.Column>
          </Table.Header>
          <Table.Body
            renderEmptyState={() => (
              <div className="flex items-center justify-center py-16 text-muted text-sm">No quotations found</div>
            )}
          >
            {paginated.map((q, i) => (
              <Table.Row key={q.id} id={q.id}>
                <Table.Cell><span className="text-xs text-muted">{start + i}</span></Table.Cell>
                <Table.Cell className="font-mono text-xs font-medium">{q.quoteNumber}</Table.Cell>
                <Table.Cell>{q.customerName || '\u2014'}</Table.Cell>
                <Table.Cell className="font-medium">${Number(q.totalAmount).toFixed(2)}</Table.Cell>
                <Table.Cell>
                  <Chip size="sm" variant="soft" color={STATUS_COLORS[q.status] ?? 'default'}>{q.status}</Chip>
                </Table.Cell>
                <Table.Cell className="text-muted text-xs">{q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '\u2014'}</Table.Cell>
                <Table.Cell>
                  <Dropdown.Root>
                    <Dropdown.Trigger className="inline-flex items-center justify-center rounded-md min-w-0 px-1 h-7 text-muted hover:text-foreground hover:bg-muted transition-colors outline-none text-sm">
                      <DotsIcon />
                    </Dropdown.Trigger>
                    <Dropdown.Popover placement="bottom end">
                      <Dropdown.Menu onAction={(key) => handleContextAction(key, q)}>
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
      {filtered.length > ROWS_PER_PAGE && (
        <Table.Footer>
          <Pagination size="sm">
            <Pagination.Summary>{start} to {start + paginated.length - 1} of {filtered.length} results</Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous isDisabled={page === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
                  <Pagination.PreviousIcon /> Prev
                </Pagination.Previous>
              </Pagination.Item>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
      )}
    </Table>
  );
}
