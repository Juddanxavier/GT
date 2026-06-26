'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Download, Send, Trash2, FileText } from 'lucide-react';
import { Button, Chip, Modal, Spinner } from '@heroui/react';
import { api } from '@/lib/api';
import { useSendInvoice, useDeleteInvoice } from '@/lib/queries';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  paid: 'success',
  unpaid: 'warning',
  cancelled: 'danger',
  refunded: 'danger',
};

export default function InvoiceDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const sendInvoice = useSendInvoice();
  const deleteInvoice = useDeleteInvoice();

  useEffect(() => {
    api.get<Record<string, unknown>>(`/api/invoices/${id}`).then((data) => {
      setInvoice(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner /></div>;
  if (!invoice) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <p className="text-danger text-sm">Invoice not found</p>
      <Button variant="secondary" size="sm" onPress={() => router.push('/invoices')}>Back</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onPress={() => router.push('/invoices')}>
          <ArrowLeft size={16} /> Back
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-muted" />
              <div>
                <h1 className="text-xl font-bold">{invoice.invoiceNo as string}</h1>
                <p className="text-sm text-muted">Invoice Details</p>
              </div>
            </div>
            <Chip size="sm" variant="soft" color={STATUS_COLORS[invoice.status as string] ?? 'default'}>
              {invoice.status as string}
            </Chip>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { label: 'Invoice No', value: invoice.invoiceNo as string },
              { label: 'Tracking No', value: invoice.trackingNo as string },
              { label: 'Customer', value: (invoice.customerName as string) ?? '—' },
              { label: 'Amount', value: `₹${Number(invoice.amount).toLocaleString()}` },
              { label: 'Status', value: invoice.status as string },
              { label: 'Created', value: invoice.createdAt ? new Date(invoice.createdAt as string).toLocaleDateString() : '—' },
              { label: 'Emails Sent', value: `${invoice.emailCount ?? 0}/2 today` },
              { label: 'Paid At', value: invoice.paidAt ? new Date(invoice.paidAt as string).toLocaleDateString() : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onPress={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/invoices/${id}/pdf`, '_blank')}>
          <Download size={14} /> Download PDF
        </Button>
        <Button variant="secondary" size="sm" onPress={() => setSendOpen(true)}>
          <Send size={14} /> Send Email
        </Button>
        <Button variant="danger" size="sm" isPending={deleteInvoice.isPending} onPress={() => {
          deleteInvoice.mutate(id, { onSuccess: () => router.push('/invoices') });
        }}>
          <Trash2 size={14} /> Delete
        </Button>
      </div>

      <Modal.Backdrop isOpen={sendOpen} onOpenChange={(v) => { if (!v) { setSendOpen(false); setSendError(''); setSendSuccess(''); } }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Send Invoice</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">Send invoice <strong>{invoice.invoiceNo as string}</strong> via email?</p>
              {sendError && <p className="text-sm text-danger mt-2">{sendError}</p>}
              {sendSuccess && <p className="text-sm text-success mt-2">{sendSuccess}</p>}
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setSendOpen(false)}>Cancel</Button>
              <Button variant="primary" isPending={sendInvoice.isPending} onPress={async () => {
                setSendError(''); setSendSuccess('');
                try {
                  const res = await sendInvoice.mutateAsync(id);
                  setSendSuccess(`Sent. (${res.emailCount}/2 today)`);
                  setTimeout(() => setSendOpen(false), 1500);
                } catch (err) {
                  setSendError(err instanceof Error ? err.message : 'Failed to send');
                }
              }}>
                Send
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
