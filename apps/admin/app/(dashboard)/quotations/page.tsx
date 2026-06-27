'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Eye, MoreVertical, Pencil, Trash2, FileText, Send, CheckCircle, XCircle } from 'lucide-react';
import { Button, Dropdown, Input, Modal, Pagination, Skeleton, Table, cn, type Key, type SortDescriptor } from '@heroui/react';
import { useQuotations, useDeleteQuotation, useUpdateQuotationStatus, useQuotationTrend, type Quotation } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';
import { KpiCard } from '@/components/kpi-card';

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
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'quoteNo', direction: 'ascending' });
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: quotations = [], isPending, isError, refetch } = useQuotations();
  const { data: trendData = [] } = useQuotationTrend();

  const sparklines = useMemo(() => {
    const map = new Map(trendData.map((r) => [r.date, r]));
    const days = 14;
    const now = new Date();
    const total: number[] = [];
    const sent: number[] = [];
    const accepted: number[] = [];
    const draft: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = map.get(key);
      total.push(row?.total ?? 0);
      sent.push(row?.sent ?? 0);
      accepted.push(row?.accepted ?? 0);
      draft.push(row?.draft ?? 0);
    }
    return { total, sent, accepted, draft };
  }, [trendData]);

  const trend = useMemo(() => {
    const calc = (data: number[]) => {
      if (data.length < 14) return 0;
      const prev = data.slice(0, 7).reduce((a, b) => a + b, 0);
      const curr = data.slice(7).reduce((a, b) => a + b, 0);
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };
    return { total: calc(sparklines.total), sent: calc(sparklines.sent), accepted: calc(sparklines.accepted), draft: calc(sparklines.draft) };
  }, [sparklines]);

  const deleteQuotation = useDeleteQuotation();
  const updateStatus = useUpdateQuotationStatus();

  const filtered = useMemo(() => {
    let items = quotations;
    if (statusFilter !== 'all') items = items.filter((q) => q.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((qt) => qt.quoteNo.toLowerCase().includes(q) || qt.customerName?.toLowerCase().includes(q));
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
    else if (typeof key === 'string' && key.startsWith('status-')) {
      updateStatus.mutate({ id: quotation.id, status: key.replace('status-', '') });
    }
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

      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total" count={filtered.length} color="#3b82f6" icon={FileText} data={sparklines.total} trend={trend.total} />
        <KpiCard label="Sent" count={filtered.filter((q) => q.status === 'sent').length} color="#8b5cf6" icon={Send} data={sparklines.sent} trend={trend.sent} />
        <KpiCard label="Accepted" count={filtered.filter((q) => q.status === 'accepted').length} color="#22c55e" icon={CheckCircle} data={sparklines.accepted} trend={trend.accepted} />
        <KpiCard label="Draft" count={filtered.filter((q) => q.status === 'draft').length} color="#f59e0b" icon={XCircle} data={sparklines.draft} trend={trend.draft} />
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="sm:flex-1"><Input placeholder="Search quotations..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} fullWidth /></div>
            <div className="flex gap-1 flex-wrap">
              {['all', 'draft', 'sent', 'accepted', 'rejected', 'converted'].map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-muted/10 text-muted hover:text-foreground'}`}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
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
          updateStatus={updateStatus}
          totalPages={totalPages}
          page={page} />
      </div>

      
      <Modal.Backdrop isOpen={!!deleteTarget} onOpenChange={(v: boolean) => { if (!v) setDeleteTarget(null); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Delete Quotation</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">Are you sure you want to delete quotation <strong>{deleteTarget?.quoteNo}</strong>? This action cannot be undone.</p>
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
  handleContextAction, updateStatus, totalPages, page
}: {
  isPending: boolean; isError: boolean; refetch: () => void;
  filtered: Quotation[]; paginated: Quotation[]; start: number;
  sortDescriptor: SortDescriptor; setSortDescriptor: (d: SortDescriptor) => void;
  setPage: (p: number | ((prev: number) => number)) => void;
  handleContextAction: (key: Key, quotation: Quotation) => void;
  updateStatus: { mutate: (args: { id: string; status: string }) => void };
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
            <Table.Column allowsSorting id="quoteNo" isRowHeader>
              {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Quote #</SortableHeader>}
            </Table.Column>
            <Table.Column id="customerName">
              {() => <span className="text-xs text-muted">Customer</span>}
            </Table.Column>
            <Table.Column allowsSorting id="total">
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
                <Table.Cell className="font-mono text-xs font-medium">{q.quoteNo}</Table.Cell>
                <Table.Cell>{q.customerName || '\u2014'}</Table.Cell>
                <Table.Cell className="font-medium">${Number(q.total).toFixed(2)}</Table.Cell>
                <Table.Cell>
                  <select
                    value={q.status}
                    onChange={(e) => updateStatus.mutate({ id: q.id, status: e.target.value })}
                    className="bg-transparent text-xs border border-border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {['draft', 'sent', 'accepted', 'rejected', 'converted'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
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
                        <Dropdown.Item id="delete" textValue="Delete" className="text-danger"><span className="flex items-center gap-2"><TrashIcon /> Delete</span></Dropdown.Item>
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
