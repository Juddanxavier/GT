'use client';

import { useMemo, useState } from 'react';
import { useTenants } from '@/lib/queries';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import { useRouter } from 'next/navigation';
import { Download, Eye, FileText, MoreVertical, Send, Trash2, CheckCircle, Clock } from 'lucide-react';
import { Button, Chip, Dropdown, Input, ListBox, Modal, Pagination, Skeleton, Spinner, Table, Tabs, Select, type Key, type SortDescriptor } from '@heroui/react';
import { useInvoices, useSendInvoice, useDeleteInvoice, useInvoiceTrend, type PaginatedResult } from '@/lib/queries';
import type { Invoice } from '@/lib/queries';
import { api, getTenantFilter } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { usePageTitle } from '@/lib/use-page-title';
import { useQueryClient } from '@tanstack/react-query';
import { KpiCard } from '@/components/kpi-card';
import { TablePreferences, useTablePreferences, densityClassName, type ColumnDef } from '@/components/table-preferences';
import { PageHeader } from '@/components/page-header';

const ROWS_PER_PAGE = 10;

const INVOICE_COLUMNS: ColumnDef[] = [
  { id: 'invoiceNo', label: 'Invoice No', always: true },
  { id: 'trackingNo', label: 'Tracking' },
  { id: 'customerName', label: 'Customer' },
  { id: 'amount', label: 'Amount' },
  { id: 'status', label: 'Status', always: true },
  { id: 'emailCount', label: 'Sent' },
  { id: 'createdAt', label: 'Created' },
];

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
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE);
  const prefs = useTablePreferences('invoices-table', INVOICE_COLUMNS);
  const { tenantFilter } = useTenantFilter();
  const { data: tenants = [] } = useTenants();
  const tenantCurrency = useMemo(() => {
    const t = tenants.find((t) => t.id === tenantFilter);
    return t?.currency ?? undefined;
  }, [tenantFilter, tenants]);

  const invoicesQuery = useInvoices(searchQuery, page, rowsPerPage, statusFilter);
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

  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const paginated = invoices; // Data is already server-paginated
  const start = (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, totalCount);

  const kpiTotal = totalCount;
  const kpiPaid = counts?.paid ?? 0;
  const kpiPending = counts?.unpaid ?? 0;

  const { data: trendData = [] } = useInvoiceTrend();

  const sparklines = useMemo(() => {
    const map = new Map(trendData.map((r) => [r.date, r]));
    const days = 14;
    const now = new Date();
    const total: number[] = [];
    const paid: number[] = [];
    const unpaid: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = map.get(key);
      total.push(row?.total ?? 0);
      paid.push(row?.paid ?? 0);
      unpaid.push(row?.unpaid ?? 0);
    }
    return { total, paid, unpaid };
  }, [trendData]);

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
    if (key === 'view') router.push(`/invoices/${inv.invoiceNo}`);
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
      <PageHeader title="Invoices" subtitle="View and send invoices to customers" icon={<FileText size={18} />} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total" count={kpiTotal} color="#3b82f6" icon={FileText} data={sparklines.total} />
        <KpiCard label="Paid" count={kpiPaid} color="#22c55e" icon={CheckCircle} data={sparklines.paid} />
        <KpiCard label="Unpaid" count={kpiPending} color="#f59e0b" icon={Clock} data={sparklines.unpaid} />
      </div>

      <div className="content-panel overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="sm:flex-1">
              <Input variant="secondary" placeholder="Search invoices..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                onKeyDown={(e: { key: string }) => e.key === 'Enter' && handleSearch()}
                fullWidth />
            </div>
            <div className="flex items-center gap-2">
              <TablePreferences
                storageKey="invoices-table"
                columns={INVOICE_COLUMNS}
                hidden={prefs.hidden}
                onHiddenChange={prefs.setHidden}
                density={prefs.density}
                onDensityChange={prefs.setDensity}
              />
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
          <Table className={`table-clickable ${densityClassName(prefs.density)}`}>
            <Table.ScrollContainer>
              <Table.Content aria-label="Invoices" className="min-w-[950px]" sortDescriptor={sortDescriptor} onSortChange={(d) => { setSortDescriptor(d); setPage(1); }} onRowAction={(key) => router.push(`/invoices/${key}`)}>
                <Table.Header>
                  <Table.Column id="#" width={48}>{() => <span className="text-muted text-xs">#</span>}</Table.Column>
                  <Table.Column allowsSorting id="invoiceNo" isRowHeader>Invoice No</Table.Column>
                  {prefs.isVisible('trackingNo') && <Table.Column allowsSorting id="trackingNo">Tracking</Table.Column>}
                  {prefs.isVisible('customerName') && <Table.Column allowsSorting id="customerName">Customer</Table.Column>}
                  {prefs.isVisible('amount') && <Table.Column allowsSorting id="amount" width={120}>Amount</Table.Column>}
                  {prefs.isVisible('status') && <Table.Column allowsSorting id="status">Status</Table.Column>}
                  {prefs.isVisible('emailCount') && <Table.Column allowsSorting id="emailCount">Sent</Table.Column>}
                  {prefs.isVisible('createdAt') && <Table.Column allowsSorting id="createdAt">Created</Table.Column>}
                  <Table.Column id="actions" width={48}>{() => null}</Table.Column>
                </Table.Header>
                <Table.Body renderEmptyState={() => (
                  <div className="flex items-center justify-center py-24 text-muted text-sm">No invoices found</div>
                )}>
                  {paginated.map((inv, i) => (
                    <Table.Row key={inv.id} id={inv.invoiceNo}>
                      <Table.Cell><span className="text-xs text-muted">{start + i}</span></Table.Cell>
                      <Table.Cell><span className="font-mono text-xs font-medium">{inv.invoiceNo}</span></Table.Cell>
                      {prefs.isVisible('trackingNo') && <Table.Cell className="font-mono text-xs">{inv.trackingNo || '—'}</Table.Cell>}
                      {prefs.isVisible('customerName') && <Table.Cell>{inv.customerName}</Table.Cell>}
                      {prefs.isVisible('amount') && <Table.Cell className="font-medium">{formatCurrency(inv.amount, tenantCurrency)}</Table.Cell>}
                      {prefs.isVisible('status') && (
                        <Table.Cell>
                          <Chip size="sm" variant="soft" color="success">Paid</Chip>
                        </Table.Cell>
                      )}
                      {prefs.isVisible('emailCount') && <Table.Cell className="text-muted text-xs">{inv.emailCount}/2</Table.Cell>}
                      {prefs.isVisible('createdAt') && <Table.Cell className="text-muted text-xs">{new Date(inv.createdAt).toLocaleDateString()}</Table.Cell>}
                      <Table.Cell>
                        <span onClick={(e) => e.stopPropagation()}>
                          <Dropdown.Root>
                            <Dropdown.Trigger className="inline-flex items-center justify-center rounded-sm min-w-0 px-1 h-7 text-muted hover:text-foreground hover:bg-muted transition-colors outline-none text-sm">
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
                  <Select selectedKey={String(rowsPerPage)} onSelectionChange={(k) => { setRowsPerPage(Number(k)); setPage(1); }} variant="secondary" className="w-20" aria-label="Rows per page">
                    <Select.Trigger className="h-7 text-xs">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {[10, 25, 50, 100, 250].map((n) => <ListBox.Item key={n} id={String(n)} textValue={String(n)}>{n}</ListBox.Item>)}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
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
              </div>
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
