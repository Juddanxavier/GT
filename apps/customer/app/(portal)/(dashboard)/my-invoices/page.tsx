'use client';

import { Button, Chip, Pagination, Skeleton } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { STATUS_COLORS } from '@/lib/status';
import { useTenantConfig } from '@/lib/use-tenant-config';

const API_BASE = '';

const INVOICE_STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
];

function InvoiceSkeleton(): ReactNode {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
          key={i}
          className="flex items-center justify-between rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] p-4"
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-3 w-40 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MyInvoicesContent(): ReactNode {
  const config = useTenantConfig();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 20;
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-invoices', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API_BASE}/api/customers/my-invoices?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load');
      return res.json() as Promise<{
        data: Array<{
          id: string;
          invoiceNo: string;
          amount: string;
          status: string;
          trackingNo: string;
          paidAt: string | null;
          createdAt: string;
        }>;
        total: number;
        page: number;
        limit: number;
      }>;
    },
  });
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  function handleStatusFilter(s: string) {
    setStatusFilter(s);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#E8621A]/10 text-[#E8621A] flex items-center justify-center">
          <Receipt size={24} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Invoices</h1>
          <p className="text-foreground/50 mt-0.5">View and download your invoices.</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {INVOICE_STATUS_FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={statusFilter === f.key ? 'primary' : 'ghost'}
            onPress={() => handleStatusFilter(f.key)}
            className={statusFilter === f.key ? 'bg-[#E8621A] text-white' : ''}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <InvoiceSkeleton />
      ) : error ? (
        <div className="rounded-xl bg-red-50 p-6 text-center">
          <p className="text-danger">Failed to load invoices.</p>
        </div>
      ) : !data?.data.length ? (
        <div className="text-center py-20">
          <Receipt size={40} className="mx-auto text-foreground/20" />
          <p className="text-foreground/50 mt-4">No invoices found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {data.data.map((inv) => (
              <a
                key={inv.id}
                href={`/invoices/${inv.invoiceNo}`}
                className="flex items-center justify-between rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] p-4 hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.08)] transition-all"
              >
                <div>
                  <p className="text-sm font-mono font-bold text-foreground">{inv.invoiceNo}</p>
                  <p className="text-xs text-foreground/50 mt-0.5">
                    {inv.trackingNo} — {new Date(inv.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {Number(inv.amount).toLocaleString(config.currency.locale, {
                      style: 'currency',
                      currency: config.currency.code,
                    })}
                  </span>
                  <Chip size="sm" variant="soft" color={STATUS_COLORS[inv.status] ?? 'warning'}>
                    {inv.status === 'unpaid'
                      ? 'Unpaid'
                      : inv.status === 'paid'
                        ? 'Paid'
                        : 'Cancelled'}
                  </Chip>
                </div>
              </a>
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-foreground/5">
            <p className="text-xs text-foreground/40 tabular-nums">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className={totalPages <= 1 ? 'opacity-40 pointer-events-none' : ''}>
              <Pagination size="sm">
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      isDisabled={page === 1}
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Pagination.Previous>
                  </Pagination.Item>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Pagination.Item key={p}>
                      <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>
                        {p}
                      </Pagination.Link>
                    </Pagination.Item>
                  ))}
                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={page === totalPages}
                      onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyInvoicesPage(): ReactNode {
  return (
    <ErrorBoundary>
      <MyInvoicesContent />
    </ErrorBoundary>
  );
}
