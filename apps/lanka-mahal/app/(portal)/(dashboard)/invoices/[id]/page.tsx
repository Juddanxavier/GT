'use client';

import type { ReactNode } from 'react';
import { use } from 'react';
import { ArrowLeft, Download, Receipt } from 'lucide-react';
import { Chip } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/error-boundary';

const API_BASE = '';

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'danger'> = { unpaid: 'warning', paid: 'success', cancelled: 'danger' };

function InvoiceDetailContent({ params: paramsPromise }: { params: Promise<{ id: string }> }): ReactNode {
  const { id } = use(paramsPromise);
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-invoice', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/customers/my-invoices/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Not found');
      return res.json() as Promise<{ data: { id: string; invoiceNo: string; amount: string; status: string; paidAt: string | null; createdAt: string; trackingNo: string; customerEmail: string; customerName: string | null } }>;
    },
  });

  if (isLoading) return <p className="text-center text-foreground/50 py-20">Loading...</p>;
  if (error) return <div className="max-w-lg mx-auto mt-10 rounded-xl bg-red-50 p-6 text-center"><p className="text-danger">Failed to load invoice.</p></div>;
  if (!data) return <p className="text-center text-foreground/50 py-20">Invoice not found.</p>;

  const inv = data.data;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link href="/my-invoices" className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> Back to invoices
      </Link>

      <div className="rounded-2xl bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-foreground/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center">
              <Receipt size={18} />
            </div>
            <h1 className="text-xl font-bold text-foreground">{inv.invoiceNo}</h1>
          </div>
          <Chip size="sm" variant="soft" color={STATUS_COLORS[inv.status] ?? 'warning'}>{inv.status}</Chip>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between py-2 px-3 bg-foreground/[0.02] rounded-lg">
            <span className="text-foreground/50">Tracking No</span>
            <span className="text-foreground font-medium">{inv.trackingNo}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-foreground/[0.02] rounded-lg">
            <span className="text-foreground/50">Amount</span>
            <span className="text-foreground font-bold text-lg tabular-nums">{Number(inv.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-foreground/[0.02] rounded-lg">
            <span className="text-foreground/50">Date</span>
            <span className="text-foreground">{new Date(inv.createdAt).toLocaleDateString()}</span>
          </div>
          {inv.paidAt && (
            <div className="flex justify-between py-2 px-3 bg-blue-50 rounded-lg">
              <span className="text-[#F59E0B] font-medium">Paid At</span>
              <span className="text-[#F59E0B] font-medium">{new Date(inv.paidAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      <a
        href={`${API_BASE}/api/customers/my-invoices/${id}/pdf`}
        download
        className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#F59E0B] p-4 hover:bg-[#D97706] hover:-translate-y-0.5 transition-all text-white text-sm font-semibold shadow-[0_1px_3px_0_rgba(245,158,11,0.3)]"
      >
        <Download size={16} /> Download PDF
      </a>
    </div>
  );
}

export default function InvoiceDetailPage(props: { params: Promise<{ id: string }> }): ReactNode {
  return <ErrorBoundary><InvoiceDetailContent params={props.params} /></ErrorBoundary>;
}
