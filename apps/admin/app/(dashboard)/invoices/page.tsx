'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Eye, FileText, MoreVertical, Send, Trash2, CheckCircle, Clock } from 'lucide-react';
import { Button, Chip, Dropdown, Input, Modal, Pagination, Skeleton, Spinner, Table, Tabs, type Key, type SortDescriptor } from '@heroui/react';
import { useInvoices, useSendInvoice, useDeleteInvoice, type PaginatedResult } from '@/lib/queries';
import type { Invoice } from '@/lib/queries';
import { api, fmtINR, getTenantFilter } from '@/lib/api';
import { usePageTitle } from '@/lib/use-page-title';
import { useQueryClient } from '@tanstack/react-query';

const ROWS_PER_PAGE = 10;
const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  paid: 'success',
  unpaid: 'warning',
  cancelled: 'danger',
  refunded: 'danger',
};

export default function InvoicesPage() {
  usePageTitle('Invoices');
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'createdAt', direction: 'descending' });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sendTarget, setSendTarget] = useState<{ id: string; invoiceNo: string; trackingNo: string; emailCount: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; invoiceNo: string } | null>(null);

  const invoicesQuery = useInvoices(searchQuery, page, ROWS_PER_PAGE, statusFilter);
  const invoicesResp = invoicesQuery.data as PaginatedResult<Invoice> | undefined;
  const invoicesRaw = Array.isArray(invoicesResp) ? invoicesResp : (invoicesResp?.data ?? []);
  const totalCount = Array.isArray(invoicesResp) ? invoicesRaw.length : (invoicesResp?.total ?? 0);
  const counts = !Array.isArray(invoicesResp) ? invoicesResp?.counts : undefined;
  const { isPending: loading, isError, refetch } = invoicesQuery;

  const sendInvoice = useSendInvoice();
  const deleteInvoice = useDeleteInvoice();

  const invoices = useMemo(() => {
    const items = invoicesRaw.map((inv) => ({
      ...inv,
      customerName: inv.customerName ?? '—',
    }));
    if (sortDescriptor.column) {
      const col = sortDescriptor.column as string;
      const dir = sortDescriptor.direction;
      items.sort((a, b) => {
        const valA = String((a as Record<string, unknown>)[col] ?? '');
        const valB = String((b as Record<string, unknown>)[col] ?? '');
        const cmp = valA.localeCompare(valB);
        return dir === 'descending' ? -cmp : cmp;
      });
    }
    return items;
  }, [invoicesRaw, sortDescriptor]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ROWS_PER_PAGE));
  const paginated = invoices; // Data is already server-paginated
  const start = (page - 1) * ROWS_PER_PAGE + 1;
  const end = Math.min(page * ROWS_PER_PAGE, totalCount);

  const kpiTotal = totalCount;
  const kpiPaid = counts?.paid ?? 0;
  const kpiPending = counts?.unpaid ?? 0;

  function handleSearch() {
    setPage(1);
    setSearchQuery(search);
  }

  async function handleSend(invoice: typeof sendTarget) {
    if (!invoice) return;
    setSending(true);
    setSendError('');
    setSendSuccess('');
    try {
      const res = await sendInvoice.mutateAsync(invoice.id);
      setSendSuccess(`Invoice ${invoice.invoiceNo} sent. (${res.emailCount}/2 today)`);
      setTimeout(() => { setSendTarget(null); setSendSuccess(''); }, 2000);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send');
    } finally { setSending(false); }
  }

  function handleContextAction(key: Key, inv: typeof paginated[number]) {
    if (key === 'view') router.push(`/invoices/${inv.id}`);
    else if (key === 'send') setSendTarget(inv);
    else if (key === 'delete') setDeleteTarget(inv);
  }

  async function downloadPdf(id: string) {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const headers: Record<string, string> = {};
    const tid = getTenantFilter();
    if (tid) headers['X-Tenant-ID'] = tid;
    const res = await fetch(`${base}/api/invoices/${id}/pdf`, { credentials: 'include', headers });
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), '_blank');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted">View and send invoices to customers</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: kpiTotal, color: '#3b82f6', icon: FileText },
          { label: 'Paid', count: kpiPaid, color: '#22c55e', icon: CheckCircle },
          { label: 'Unpaid', count: kpiPending, color: '#f59e0b', icon: Clock },
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-surface overflow-hidden flex flex-col">
            <div className="p-5 pb-3 flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">{label}</span>
                <Icon size={18} style={{ color }} />
              </div>
              <p className="text-4xl font-bold tracking-tight">{count}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="sm:flex-1">
              <Input variant="secondary" placeholder="Search invoices..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                onKeyDown={(e: { key: string }) => e.key === 'Enter' && handleSearch()}
                fullWidth />
            </div>
            <Tabs selectedKey={statusFilter} onSelectionChange={(key) => { setStatusFilter(key as string); setPage(1); }} className="sm:flex-[2] overflow-x-auto">
              <Tabs.List>
                <Tabs.Tab id="all">All</Tabs.Tab>
                <Tabs.Tab id="paid">Paid</Tabs.Tab>
                <Tabs.Tab id="unpaid">Unpaid</Tabs.Tab>
                <Tabs.Tab id="cancelled">Cancelled</Tabs.Tab>
                <Tabs.Tab id="refunded">Refunded</Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </div>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center"><Spinner /></div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-danger text-sm">Failed to load invoices</p>
            <Button variant="secondary" size="sm" onPress={() => refetch()}>Retry</Button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-muted text-sm">No invoices found</div>
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Invoices" className="min-w-[950px]" sortDescriptor={sortDescriptor} onSortChange={(d) => { setSortDescriptor(d); setPage(1); }}>
                <Table.Header>
                  <Table.Column id="#" width={48}>{() => <span className="text-muted text-xs">#</span>}</Table.Column>
                  <Table.Column allowsSorting id="invoiceNo" isRowHeader>Invoice No</Table.Column>
                  <Table.Column allowsSorting id="trackingNo">Tracking</Table.Column>
                  <Table.Column allowsSorting id="customerName">Customer</Table.Column>
                  <Table.Column allowsSorting id="amount" width={120}>Amount</Table.Column>
                  <Table.Column allowsSorting id="status">Status</Table.Column>
                  <Table.Column allowsSorting id="emailCount">Sent</Table.Column>
                  <Table.Column allowsSorting id="createdAt">Created</Table.Column>
                  <Table.Column id="actions" width={48}>{() => null}</Table.Column>
                </Table.Header>
                <Table.Body renderEmptyState={() => (
                  <div className="flex items-center justify-center py-24 text-muted text-sm">No invoices found</div>
                )}>
                  {paginated.map((inv, i) => (
                    <Table.Row key={inv.id} id={inv.id}>
                      <Table.Cell><span className="text-xs text-muted">{start + i}</span></Table.Cell>
                      <Table.Cell><span className="font-mono text-xs font-medium">{inv.invoiceNo}</span></Table.Cell>
                      <Table.Cell className="font-mono text-xs">{inv.trackingNo || '—'}</Table.Cell>
                      <Table.Cell>{inv.customerName}</Table.Cell>
                      <Table.Cell className="font-medium">{fmtINR(inv.amount)}</Table.Cell>
                      <Table.Cell>
                        <Chip size="sm" variant="soft" color={STATUS_COLORS[inv.status] ?? 'default'}>{inv.status}</Chip>
                      </Table.Cell>
                      <Table.Cell className="text-muted text-xs">{inv.emailCount}/2</Table.Cell>
                      <Table.Cell className="text-muted text-xs">{new Date(inv.createdAt).toLocaleDateString()}</Table.Cell>
                      <Table.Cell>
                        <Dropdown.Root>
                          <Dropdown.Trigger className="inline-flex items-center justify-center rounded-md min-w-0 px-1 h-7 text-muted hover:text-foreground hover:bg-muted transition-colors outline-none text-sm">
                            <MoreVertical size={16} />
                          </Dropdown.Trigger>
                          <Dropdown.Popover placement="bottom end">
                            <Dropdown.Menu onAction={(key) => handleContextAction(key, inv)}>
                              <Dropdown.Item id="view" textValue="View"><span className="flex items-center gap-2"><Eye size={16} /> View</span></Dropdown.Item>
                              <Dropdown.Item id="send" textValue="Send"><span className="flex items-center gap-2"><Send size={16} /> Send Email</span></Dropdown.Item>
                              <Dropdown.Item id="pdf" textValue="PDF"><span className="flex items-center gap-2"><Download size={16} /> Download PDF</span></Dropdown.Item>
                              <Dropdown.Item id="delete" textValue="Delete" className="text-danger"><span className="flex items-center gap-2"><Trash2 size={16} /> Delete</span></Dropdown.Item>
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
                    <Pagination.Previous isDisabled={page === 1} onPress={() => setPage(Math.max(1, page - 1))}>
                      <Pagination.PreviousIcon /> Prev
                    </Pagination.Previous>
                  </Pagination.Item>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Pagination.Item key={p}>
                      <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>{p}</Pagination.Link>
                    </Pagination.Item>
                  ))}
                  <Pagination.Item>
                    <Pagination.Next isDisabled={page >= totalPages} onPress={() => setPage(Math.min(totalPages, page + 1))}>
                      Next <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </Table.Footer>
          </Table>
        )}
      </div>

      <Modal.Backdrop isOpen={!!sendTarget} onOpenChange={(v: boolean) => { if (!v) { setSendTarget(null); setSendError(''); setSendSuccess(''); } }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Send Invoice</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">
                Send invoice <strong>{sendTarget?.invoiceNo}</strong> for shipment <strong>{sendTarget?.trackingNo}</strong> to the customer via email?
              </p>
              <p className="text-xs text-muted mt-1">({sendTarget?.emailCount}/2 emails sent today)</p>
              {sendError && <p className="text-sm text-danger mt-2">{sendError}</p>}
              {sendSuccess && <p className="text-sm text-success mt-2">{sendSuccess}</p>}
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => { setSendTarget(null); setSendError(''); setSendSuccess(''); }}>Cancel</Button>
              <Button variant="primary" isPending={sending} onPress={() => handleSend(sendTarget)} isDisabled={sending}>
                <Send size={14} /> Send Email
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop isOpen={!!deleteTarget} onOpenChange={(v: boolean) => { if (!v) setDeleteTarget(null); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Delete Invoice</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">Delete invoice <strong>{deleteTarget?.invoiceNo}</strong>? This action cannot be undone.</p>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" isPending={deleteInvoice.isPending} onPress={() => {
                if (deleteTarget) { deleteInvoice.mutate(deleteTarget.id); setDeleteTarget(null); }
              }}>{deleteInvoice.isPending ? 'Deleting...' : 'Delete'}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
