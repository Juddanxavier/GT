'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Eye, MoreVertical, Pencil, Trash2, FileText, Send, CheckCircle, XCircle, Plus } from 'lucide-react';
import { Button, Chip, Dropdown, Input, Modal, Pagination, Skeleton, Table, cn, type Key, type SortDescriptor } from '@heroui/react';
import { useQuotations, useDeleteQuotation, useUpdateQuotationStatus, useQuotationTrend, type Quotation, type PaginatedResult } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';
import { KpiCard } from '@/components/kpi-card';
import { formatCurrency } from '@/lib/currency';

const ROWS_PER_PAGE = 50;

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'accent' | 'success' | 'warning' | 'danger' }> = {
  draft: { label: 'Draft', color: 'default' },
  sent: { label: 'Sent', color: 'accent' },
  accepted: { label: 'Accepted', color: 'success' },
  rejected: { label: 'Rejected', color: 'danger' },
  converted: { label: 'Converted', color: 'warning' },
};

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

export default function QuotationsPage() {
  usePageTitle('Quotations');
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'quoteNo', direction: 'ascending' });
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const quotationsQuery = useQuotations(page, ROWS_PER_PAGE, statusFilter, debouncedSearch);
  const quotationsResp = quotationsQuery.data as PaginatedResult<Quotation> | undefined;
  const quotations = Array.isArray(quotationsResp) ? quotationsResp : (quotationsResp?.data ?? []);
  const totalCount = Array.isArray(quotationsResp) ? quotations.length : (quotationsResp?.total ?? 0);
  const counts = !Array.isArray(quotationsResp) ? quotationsResp?.counts : undefined;
  const { isPending, isError, refetch } = quotationsQuery;

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
    const col = sortDescriptor.column as keyof Quotation;
    const dir = sortDescriptor.direction;
    return [...quotations].sort((a, b) => {
      const valA = String(a[col] ?? '');
      const valB = String(b[col] ?? '');
      const cmp = valA.localeCompare(valB);
      return dir === 'descending' ? -cmp : cmp;
    });
  }, [sortDescriptor, quotations]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ROWS_PER_PAGE));
  const paginated = filtered;
  const start = (page - 1) * ROWS_PER_PAGE + 1;

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

  const statusFilters = ['all', 'draft', 'sent', 'accepted', 'rejected', 'converted'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted">Manage customer quotations</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total" count={totalCount} color="var(--accent)" icon={FileText} data={sparklines.total} trend={trend.total} />
        <KpiCard label="Sent" count={counts?.sent ?? 0} color="var(--accent)" icon={Send} data={sparklines.sent} trend={trend.sent} />
        <KpiCard label="Accepted" count={counts?.accepted ?? 0} color="var(--success)" icon={CheckCircle} data={sparklines.accepted} trend={trend.accepted} />
        <KpiCard label="Draft" count={counts?.draft ?? 0} color="var(--warning)" icon={XCircle} data={sparklines.draft} trend={trend.draft} />
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-surface overflow-hidden">
        <div className="p-4 pb-0 border-b border-border">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pb-4">
            <div className="sm:max-w-xs"><Input placeholder="Search quotations..." value={search} onChange={(e) => handleSearch(e.target.value)} fullWidth /></div>
          </div>
          <div className="flex gap-1 pb-4 overflow-x-auto">
            {statusFilters.map((s) => {
              const count = s === 'all' ? totalCount : (counts?.[s as keyof typeof counts] as number | undefined) ?? 0;
              return (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap border',
                    statusFilter === s
                      ? 'bg-accent/10 text-accent border-accent/20 font-medium'
                      : 'bg-transparent text-muted hover:text-foreground border-transparent hover:border-border',
                  )}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  {count > 0 && (
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full',
                      statusFilter === s ? 'bg-accent/15 text-accent' : 'bg-muted/10 text-muted',
                    )}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <QuotationsTable
          isPending={isPending}
          isError={isError}
          refetch={refetch}
          paginated={paginated}
          start={start}
          totalCount={totalCount}
          sortDescriptor={sortDescriptor}
          setSortDescriptor={setSortDescriptor}
          setPage={setPage}
          handleContextAction={handleContextAction}
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
  isPending, isError, refetch, paginated, start, totalCount,
  sortDescriptor, setSortDescriptor, setPage,
  handleContextAction, totalPages, page
}: {
  isPending: boolean; isError: boolean; refetch: () => void;
  paginated: Quotation[]; start: number;
  totalCount: number;
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
            {paginated.map((q, i) => {
              const cfg = STATUS_CONFIG[q.status] ?? { label: q.status, color: 'default' as const };
              return (
                <Table.Row key={q.id} id={q.id}>
                  <Table.Cell><span className="text-xs text-muted">{start + i}</span></Table.Cell>
                  <Table.Cell className="font-mono text-xs font-medium">{q.quoteNo}</Table.Cell>
                  <Table.Cell>{q.customerName || '\u2014'}</Table.Cell>
                  <Table.Cell className="font-medium">{formatCurrency(q.total, undefined)}</Table.Cell>
                  <Table.Cell>
                    <Chip size="sm" variant="soft" color={cfg.color}>{cfg.label}</Chip>
                  </Table.Cell>
                  <Table.Cell className="text-muted text-xs">{q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '\u2014'}</Table.Cell>
                  <Table.Cell>
                    <Dropdown.Root>
                      <Dropdown.Trigger className="inline-flex items-center justify-center rounded-md min-w-0 px-1 h-7 text-muted hover:text-foreground hover:bg-muted transition-colors outline-none text-sm">
                        <MoreVertical size={16} />
                      </Dropdown.Trigger>
                      <Dropdown.Popover placement="bottom end">
                        <Dropdown.Menu onAction={(key) => handleContextAction(key, q)}>
                          <Dropdown.Item id="view" textValue="View">
                            <span className="flex items-center gap-2"><Eye size={16} /> View</span>
                          </Dropdown.Item>
                          <Dropdown.Item id="edit" textValue="Edit">
                            <span className="flex items-center gap-2"><Pencil size={16} /> Edit</span>
                          </Dropdown.Item>
                          <Dropdown.Item id="status-draft" textValue="Set Draft">
                            <span className="flex items-center gap-2"><FileText size={16} /> Set Draft</span>
                          </Dropdown.Item>
                          <Dropdown.Item id="status-sent" textValue="Mark Sent">
                            <span className="flex items-center gap-2"><Send size={16} /> Mark Sent</span>
                          </Dropdown.Item>
                          <Dropdown.Item id="status-accepted" textValue="Mark Accepted">
                            <span className="flex items-center gap-2"><CheckCircle size={16} /> Mark Accepted</span>
                          </Dropdown.Item>
                          <Dropdown.Item id="status-rejected" textValue="Mark Rejected">
                            <span className="flex items-center gap-2"><XCircle size={16} /> Mark Rejected</span>
                          </Dropdown.Item>
                          <Dropdown.Item id="delete" textValue="Delete" className="text-danger">
                            <span className="flex items-center gap-2"><Trash2 size={16} /> Delete</span>
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown.Root>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
      {totalCount > ROWS_PER_PAGE && (
        <Table.Footer>
          <Pagination size="sm">
            <Pagination.Summary>{start} to {start + paginated.length - 1} of {totalCount} results</Pagination.Summary>
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
