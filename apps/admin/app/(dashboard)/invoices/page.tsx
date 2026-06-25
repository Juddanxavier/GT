'use client';

import { useState } from 'react';
import { FileText, Send, Download, RotateCw } from 'lucide-react';
import { Button, Chip, Input, Modal, Skeleton } from '@heroui/react';
import { useInvoices, useSendInvoice } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';
import { useQueryClient } from '@tanstack/react-query';

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
  usePageTitle('Invoices');
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sendTarget, setSendTarget] = useState<InvoiceRow | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const qc = useQueryClient();

  const { data: invoicesRaw = [], isPending: loading } = useInvoices(searchQuery);
  const sendInvoice = useSendInvoice();

  const totalPages = Math.max(1, Math.ceil(invoicesRaw.length / ROWS_PER_PAGE));
  const paginated = invoicesRaw.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  function handleSearch() {
    setPage(1);
    setSearchQuery(search);
  }

  async function handleSend(invoice: InvoiceRow) {
    setSending(true);
    setSendError('');
    setSendSuccess('');
    try {
      const res = await sendInvoice.mutateAsync(invoice.id);
      if (res.sent) {
        setSendSuccess(`Invoice ${invoice.invoiceNo} sent successfully. (${res.emailCount}/2 today)`);
        invoice.emailCount = res.emailCount;
        qc.invalidateQueries({ queryKey: ['invoices'] });
      }
      setTimeout(() => { setSendTarget(null); setSendSuccess(''); }, 2000);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  function downloadPdf(id: string) {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/invoices/${id}/pdf`, '_blank');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Invoices</h1>
          <p className="text-sm text-muted mt-1">View and send invoices to customers</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Input
              variant="secondary"
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

      {loading ? (
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <Skeleton className="h-4 w-48 rounded" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-b-0">
              <Skeleton className="h-4 w-6 rounded shrink-0" />
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-20 rounded ml-auto" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-4 w-12 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-6 w-14 rounded-lg ml-auto" />
            </div>
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="rounded-2xl bg-surface p-12 text-center">
          <FileText size={32} className="mx-auto text-muted mb-3" />
          <p className="text-muted">No invoices found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="px-4 py-3 font-medium text-muted text-xs w-12">#</th>
                <th className="px-4 py-3 font-medium">Invoice No</th>
                <th className="px-4 py-3 font-medium">Tracking</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Emails Sent</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-xs w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((inv, i) => (
                <tr key={inv.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted text-xs">{(page - 1) * ROWS_PER_PAGE + i + 1}</td>
                  <td className="px-4 py-3 font-medium">{inv.invoiceNo}</td>
                  <td className="px-4 py-3">{inv.trackingNo}</td>
                  <td className="px-4 py-3 text-right font-medium">₹{Number(inv.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Chip size="sm" variant="soft" color="success">Paid</Chip>
                  </td>
                  <td className="px-4 py-3">{inv.emailCount}/2 today</td>
                  <td className="px-4 py-3 text-muted">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onPress={() => downloadPdf(inv.id)} aria-label="Download PDF">
                        <Download size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onPress={() => setSendTarget(inv)} aria-label="Send invoice email">
                        <Send size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <Button size="sm" variant="ghost" isDisabled={page <= 1} onPress={() => setPage(page - 1)}>Previous</Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button key={p} size="sm" variant={p === page ? 'primary' : 'ghost'} onPress={() => setPage(p)}>
              {p}
            </Button>
          ))}
          <Button size="sm" variant="ghost" isDisabled={page >= totalPages} onPress={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

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
              <Button variant="primary" isPending={sending} onPress={() => sendTarget && handleSend(sendTarget)} isDisabled={sending}>
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
