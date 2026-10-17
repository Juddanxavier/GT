'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Download, Send, Trash2, FileText, Calendar, Clock, Mail, DollarSign, Receipt, CheckCircle2 } from 'lucide-react';
import { Button, Chip, Modal, Spinner, Card, cn } from '@heroui/react';
import { api, getTenantFilter } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { useSendInvoice, useDeleteInvoice, type InvoiceDetail } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';
import { DetailBack, DetailShell, DetailGrid, DetailSection } from '@/components/detail-layout';

export default function InvoiceDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const sendInvoice = useSendInvoice();
  const deleteInvoice = useDeleteInvoice();

  usePageTitle(invoice ? `Invoice ${invoice.invoiceNo}` : 'Invoice');

  useEffect(() => {
    api.get<InvoiceDetail>(`/api/invoices/${id}`).then((data) => {
      setInvoice(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner /></div>;
  if (!invoice) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <p className="text-danger-soft-foreground text-sm">Invoice not found</p>
      <Button variant="secondary" size="sm" onPress={() => router.push('/invoices')}>Back</Button>
    </div>
  );

  const emailCount = invoice.emailCount ?? 0;
  const emailsLeft = Math.max(2 - emailCount, 0);
  const currencyCode = invoice.currency ?? undefined;

  return (
    <DetailShell>
      <DetailBack onClick={() => router.push('/invoices')} label="Back to Invoices" />

      <DetailGrid
        main={<>
          {/* Hero section */}
          <div className="relative overflow-hidden rounded-sm border border-success/30">
            <div className="absolute inset-0 bg-gradient-to-br from-success/[0.08] to-transparent" />
            <div className="relative px-6 py-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-sm flex items-center justify-center shrink-0 bg-success/15 text-success-soft-foreground">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Chip size="sm" variant="soft" color="success">Paid</Chip>
                      <span className="text-xs text-success-soft-foreground flex items-center gap-1"><CheckCircle2 size={12} />Paid</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">{invoice.invoiceNo}</h1>
                    {invoice.customerName && (
                      <p className="text-sm text-muted mt-0.5">{invoice.customerName}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted flex-wrap">
                <div className="flex items-center gap-1.5"><Receipt size={14} /><span>{invoice.invoiceNo}</span></div>
                {invoice.trackingNo && (
                  <div className="flex items-center gap-1.5"><DollarSign size={14} /><span>{invoice.trackingNo}</span></div>
                )}
                {invoice.createdAt && (
                  <div className="flex items-center gap-1.5"><Calendar size={14} /><span>Created {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span></div>
                )}
                {invoice.paidAt && (
                  <div className="flex items-center gap-1.5"><CheckCircle2 size={14} /><span>Paid {new Date(invoice.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span></div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Amount" value={formatCurrency(invoice.amount, currencyCode)} icon={<DollarSign size={14} />} highlighted />
            <StatCard label="Status" value="Paid" icon={<Receipt size={14} />} highlighted />
            <StatCard label="Emails Sent" value={`${emailCount}/2 today`} icon={<Mail size={14} />} />
            <StatCard label="Created" value={invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} icon={<Calendar size={14} />} />
          </div>

          {/* Details card */}
          <DetailSection title="Invoice Details">
            <div className="p-5 space-y-3">
              <InfoRow label="Invoice No" value={invoice.invoiceNo} />
              <InfoRow label="Tracking No" value={invoice.trackingNo ?? '—'} />
              <InfoRow label="Customer" value={invoice.customerName ?? '—'} />
              <InfoRow label="Amount" value={formatCurrency(invoice.amount, currencyCode)} />
              <InfoRow label="Emails Sent" value={`${emailCount}/2 today`} />
              <InfoRow label="Created" value={invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
              <InfoRow label="Paid At" value={invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
            </div>
          </DetailSection>
        </>}
        aside={<>
          {/* Status card */}
          <Card>
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold">Status</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Chip size="sm" variant="soft" color="success">Paid</Chip>
                <span className="text-xs text-success-soft-foreground flex items-center gap-1"><CheckCircle2 size={12} />Paid</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Clock size={14} className="text-muted" />
                <span className="text-muted">Amount</span>
                <span className="font-semibold ml-auto">{formatCurrency(invoice.amount, currencyCode)}</span>
              </div>
              {invoice.createdAt && (
                <div className="flex items-center gap-2 text-xs">
                  <Calendar size={14} className="text-muted" />
                  <span className="text-muted">Created</span>
                  <span className="font-semibold ml-auto">{new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <Mail size={14} className="text-muted" />
                <span className="text-muted">Emails</span>
                <span className="font-semibold ml-auto">{emailsLeft > 0 ? `${emailsLeft} left today` : 'Limit reached'}</span>
              </div>
            </div>
          </Card>

          {/* Actions card */}
          <Card>
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold">Actions</h3>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <Button variant="secondary" size="sm" onPress={async () => {
                const headers: Record<string, string> = {};
                const tid = getTenantFilter();
                if (tid) headers['X-Tenant-ID'] = tid;
                const res = await fetch(`/api/invoices/${id}/pdf`, { credentials: 'include', headers });
                const blob = await res.blob();
                window.open(URL.createObjectURL(blob), '_blank');
              }} fullWidth>
                <Download size={14} /> Download PDF
              </Button>
              <Button variant="secondary" size="sm" onPress={() => setSendOpen(true)} isDisabled={emailsLeft === 0} fullWidth>
                <Send size={14} /> Send Email
              </Button>
              <Button variant="danger" size="sm" isPending={deleteInvoice.isPending} onPress={() => {
                deleteInvoice.mutate(id, { onSuccess: () => router.push('/invoices') });
              }} fullWidth>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </Card>
        </>}
      />

      <Modal.Backdrop isOpen={sendOpen} onOpenChange={(v) => { if (!v) { setSendOpen(false); setSendError(''); setSendSuccess(''); } }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Send Invoice</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">Send invoice <strong>{invoice.invoiceNo}</strong> via email?</p>
              {sendError && <p className="text-sm text-danger-soft-foreground mt-2">{sendError}</p>}
              {sendSuccess && <p className="text-sm text-success-soft-foreground mt-2">{sendSuccess}</p>}
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
    </DetailShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm text-muted flex-1">{label}</span>
      <span className="text-sm font-medium text-right max-w-[50%] truncate">{value}</span>
    </div>
  );
}

function StatCard({ label, value, icon, highlighted }: {
  label: string; value: string; icon: React.ReactNode; highlighted?: boolean;
}) {
  return (
    <Card className={cn('p-4', highlighted && 'border-success/30 bg-success/[0.02]')}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-muted">{icon}</span>
        <span className="text-[11px] text-muted font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('text-sm font-semibold truncate', highlighted && 'text-success-soft-foreground')}>{value}</p>
    </Card>
  );
}
