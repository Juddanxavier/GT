'use client';

import type { ReactNode } from 'react';
import { use } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { Chip } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/error-boundary';
import { authClient } from '@/lib/auth-client';

const API_BASE = '';

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'danger'> = { unpaid: 'warning', paid: 'success', cancelled: 'danger' };

function InvoiceDetailContent({ params: paramsPromise }: { params: Promise<{ id: string }> }): ReactNode {
  const { id } = use(paramsPromise);
  const { data: session } = authClient.useSession();
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-invoice', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/customers/my-invoices/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Not found');
      return res.json() as Promise<{ data: { id: string; invoiceNo: string; amount: string; status: string; paidAt: string | null; createdAt: string; trackingNo: string; customerEmail: string; customerName: string | null } }>;
    },
    enabled: !!session,
  });

  if (!session) return <p className="text-center text-muted py-20">Sign in first.</p>;
  if (isLoading) return <p className="text-center text-muted py-20">Loading...</p>;
  if (error) return <div className="max-w-lg mx-auto mt-10 rounded-xl border border-danger/20 bg-danger/10 p-6 text-center"><p className="text-sm text-danger">Failed to load invoice.</p></div>;
  if (!data) return <p className="text-center text-muted py-20">Invoice not found.</p>;

  const inv = data.data;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link href="/my-invoices" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> Back to invoices
      </Link>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">{inv.invoiceNo}</h1>
          <Chip size="sm" variant="soft" color={STATUS_COLORS[inv.status] ?? 'warning'}>{inv.status}</Chip>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted">Tracking No</span><span className="text-foreground">{inv.trackingNo}</span></div>
          <div className="flex justify-between"><span className="text-muted">Amount</span><span className="text-foreground font-semibold">{Number(inv.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span></div>
          <div className="flex justify-between"><span className="text-muted">Date</span><span className="text-foreground">{new Date(inv.createdAt).toLocaleDateString()}</span></div>
          {inv.paidAt && <div className="flex justify-between"><span className="text-muted">Paid At</span><span className="text-foreground">{new Date(inv.paidAt).toLocaleDateString()}</span></div>}
        </div>
      </div>

      <a href={`${API_BASE}/api/customers/my-invoices/${id}/pdf`} download
        className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-surface p-4 hover:bg-surface-secondary transition-colors text-foreground text-sm">
        <Download size={16} /> Download PDF
      </a>
    </div>
  );
}

export default function InvoiceDetailPage(props: { params: Promise<{ id: string }> }): ReactNode {
  return <ErrorBoundary><InvoiceDetailContent params={props.params} /></ErrorBoundary>;
}
