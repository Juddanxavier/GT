'use client';

import { Chip } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Receipt } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { use } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { STATUS_COLORS } from '@/lib/status';
import { useTenantConfig } from '@/lib/use-tenant-config';

const API_BASE = '';

function InvoiceDetailContent({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}): ReactNode {
  const { id } = use(paramsPromise);
  const config = useTenantConfig();
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-invoice', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/customers/my-invoices/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Not found');
      return res.json() as Promise<{
        data: {
          id: string;
          invoiceNo: string;
          amount: string;
          status: string;
          paidAt: string | null;
          createdAt: string;
          trackingNo: string;
          customerEmail: string;
          customerName: string | null;
        };
      }>;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-6 animate-pulse">
        <div className="h-4 w-32 bg-foreground/5 rounded" />
        <div className="rounded-xl bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] p-6 space-y-4">
          <div className="h-6 w-40 bg-foreground/5 rounded" />
          <div className="h-10 bg-foreground/[0.02] rounded-lg" />
          <div className="h-10 bg-foreground/[0.02] rounded-lg" />
          <div className="h-10 bg-foreground/[0.02] rounded-lg" />
        </div>
      </div>
    );
  }
  if (error)
    return (
      <div className="max-w-lg mx-auto mt-10 rounded-xl bg-red-50 p-6 text-center">
        <p className="text-danger">Failed to load invoice.</p>
      </div>
    );
  if (!data) return <p className="text-center text-foreground/50 py-20">Invoice not found.</p>;

  const inv = data.data;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href="/my-invoices"
        className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} /> Back to invoices
      </Link>

      <div className="rounded-xl bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-foreground/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F94735]/10 text-[#F94735] flex items-center justify-center">
              <Receipt size={18} />
            </div>
            <h1 className="text-xl font-bold text-foreground">{inv.invoiceNo}</h1>
          </div>
          <Chip size="sm" variant="soft" color={STATUS_COLORS[inv.status] ?? 'warning'}>
            {inv.status}
          </Chip>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between py-2 px-3 bg-foreground/[0.02] rounded-lg">
            <span className="text-foreground/50">Tracking No</span>
            <span className="text-foreground font-medium">{inv.trackingNo}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-foreground/[0.02] rounded-lg">
            <span className="text-foreground/50">Amount</span>
            <span className="text-foreground font-bold text-lg tabular-nums">
              {Number(inv.amount).toLocaleString(config.currency.locale, {
                style: 'currency',
                currency: config.currency.code,
              })}
            </span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-foreground/[0.02] rounded-lg">
            <span className="text-foreground/50">Date</span>
            <span className="text-foreground">{new Date(inv.createdAt).toLocaleDateString()}</span>
          </div>
          {inv.paidAt && (
            <div className="flex justify-between py-2 px-3 bg-emerald-50 rounded-lg">
              <span className="text-emerald-600 font-medium">Paid At</span>
              <span className="text-emerald-600 font-medium">
                {new Date(inv.paidAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      <a
        href={`${API_BASE}/api/customers/my-invoices/${id}/pdf`}
        download
        className="flex items-center justify-center gap-2 w-full rounded-xl bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] p-4 hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all text-foreground text-sm font-medium"
      >
        <Download size={16} /> Download PDF
      </a>
    </div>
  );
}

export default function InvoiceDetailPage(props: { params: Promise<{ id: string }> }): ReactNode {
  return (
    <ErrorBoundary>
      <InvoiceDetailContent params={props.params} />
    </ErrorBoundary>
  );
}
