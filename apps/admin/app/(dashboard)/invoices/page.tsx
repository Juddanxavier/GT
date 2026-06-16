'use client';

import { useEffect, useState } from 'react';
import { FileText, Send, Download, RotateCw } from 'lucide-react';
import { Button, Chip, Input, Modal, Pagination, Table, cn, type SortDescriptor } from '@heroui/react';
import { api } from '@/lib/api';

interface InvoiceRow {
  id: string;
  invoiceNo: string;
  amount: string;
  status: string;
  emailCount: number;
  trackingNo: string;
  customerId: string;
  paidAt: string;
  createdAt: string;
}

const ROWS_PER_PAGE = 10;

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'createdAt', direction: 'descending' });
  const [page, setPage] = useState(1);
  const [invoicesRaw, setInvoicesRaw] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendTarget, setSendTarget] = useState<InvoiceRow | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');

  function fetchInvoices() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    api.get<InvoiceRow[]>(`/api/invoices?${params}`)
      .then(setInvoicesRaw)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchInvoices(); }, []);

  const sorted = [...invoicesRaw].sort((a, b) => {
    const dir = sortDescriptor.direction === 'ascending' ? 1 : -1;
    const col = sortDescriptor.column as keyof InvoiceRow;
    const va = a[col] ?? '';
    const vb = b[col] ?? '';
    if (col === 'amount') return (Number(va) - Number(vb)) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
  const paginated = sorted.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  function handleSearch() {
    setPage(1);
    fetchInvoices();
  }

  async function handleSend(invoice: InvoiceRow) {
    setSending(true);
    setSendError('');
    setSendSuccess('');
    try {
      const res = await api.post<{ sent: boolean; emailCount: number }>(`/api/invoices/${invoice.id}/send`);
      if (res.sent) {
        setSendSuccess(`Invoice ${invoice.invoiceNo} sent successfully. (${res.emailCount}/2 today)`);
        invoice.emailCount = res.emailCount;
      }
      setTimeout(() => { setSendTarget(null); setSendSuccess(''); }, 2000);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  function downloadPdf(id: string) {
    window.open(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/invoices/${id}/pdf`, '_blank');
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Invoices</h1>
          <p className="text-sm text-muted mt-1">View and send invoices to customers</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Input
              variant="secondary"
              size="sm"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-56"
            />
            <Button size="sm" variant="ghost" onPress={handleSearch} aria-label="Search">
              <RotateCw size={14} />
            </Button>
          </div>
        </div>
      </div>

      <Table>
        <Table.Content aria-label="Invoices" className="min-w-[900px]" sortDescriptor={sortDescriptor} onSortChange={(d) => { setSortDescriptor(d); setPage(1); }}>
          <Table.Header>
            <Table.Column id="#" width={48}>
              {() => <span className="text-muted text-xs">#</span>}
            </Table.Column>
            <Table.Column allowsSorting id="invoiceNo" isRowHeader>
              Invoice No
            </Table.Column>
            <Table.Column id="trackingNo">
              Tracking
            </Table.Column>
            <Table.Column allowsSorting id="amount">
              Amount
            </Table.Column>
            <Table.Column id="status">
              Status
            </Table.Column>
            <Table.Column allowsSorting id="emailCount" width={120}>
              Emails Sent
            </Table.Column>
            <Table.Column allowsSorting id="createdAt" width={140}>
              Created
            </Table.Column>
            <Table.Column id="actions" width={100}>
              {() => <span className="text-muted text-xs">Actions</span>}
            </Table.Column>
          </Table.Header>
          <Table.Body loadingState={loading ? 'loading' : undefined} emptyContent={<p className="py-12 text-center text-muted">No invoices found.</p>}>
            {paginated.map((inv, i) => (
              <Table.Row key={inv.id}>
                <Table.Cell><span className="text-muted text-xs">{(page - 1) * ROWS_PER_PAGE + i + 1}</span></Table.Cell>
                <Table.Cell><span className="font-medium text-sm">{inv.invoiceNo}</span></Table.Cell>
                <Table.Cell><span className="text-sm">{inv.trackingNo}</span></Table.Cell>
                <Table.Cell><span className="font-medium">${Number(inv.amount).toLocaleString()}</span></Table.Cell>
                <Table.Cell>
                  <Chip size="sm" variant="soft" color="success">Paid</Chip>
                </Table.Cell>
                <Table.Cell><span className="text-sm">{inv.emailCount}/2 today</span></Table.Cell>
                <Table.Cell><span className="text-sm text-muted">{new Date(inv.createdAt).toLocaleDateString()}</span></Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onPress={() => downloadPdf(inv.id)} aria-label="Download PDF">
                      <Download size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onPress={() => setSendTarget(inv)} aria-label="Send invoice email">
                      <Send size={14} />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
        {totalPages > 1 && (
          <Table.Pagination align="center">
            <Pagination total={totalPages} page={page} onChange={setPage} />
          </Table.Pagination>
        )}
      </Table>

      <Modal.Backdrop isOpen={!!sendTarget} onOpenChange={(v: boolean) => { if (!v) { setSendTarget(null); setSendError(''); setSendSuccess(''); } }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Send Invoice</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">
                Send invoice <strong>{sendTarget?.invoiceNo}</strong> for shipment <strong>{sendTarget?.trackingNo}</strong> to the customer via email?
              </p>
              <p className="text-xs text-muted mt-1">
                ({sendTarget?.emailCount}/2 emails sent today)
              </p>
              {sendError && <p className="text-sm text-danger mt-2">{sendError}</p>}
              {sendSuccess && <p className="text-sm text-success mt-2">{sendSuccess}</p>}
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="ghost" onPress={() => { setSendTarget(null); setSendError(''); setSendSuccess(''); }}>Cancel</Button>
              <Button color="primary" isLoading={sending} onPress={() => sendTarget && handleSend(sendTarget)} isDisabled={sending}>
                <Send size={14} />
                Send Email
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
