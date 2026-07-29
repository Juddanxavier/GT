'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { Chip, Pagination } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';

const API_BASE = '';

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'danger'> = { unpaid: 'warning', paid: 'success', cancelled: 'danger' };

function MyInvoicesContent(): ReactNode {
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-invoices', page],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/customers/my-invoices?page=${page}&limit=${limit}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      return res.json() as Promise<{ data: Array<{ id: string; invoiceNo: string; amount: string; status: string; trackingNo: string; paidAt: string | null; createdAt: string }>; total: number; page: number; limit: number }>;
    },
  });
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#F94735]/10 text-[#F94735] flex items-center justify-center">
          <Receipt size={24} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Invoices</h1>
          <p className="text-foreground/50 mt-0.5">View and download your invoices.</p>
        </div>
      </div>

      {isLoading ? <p className="text-center text-foreground/50 py-10">Loading...</p>
      : error ? <div className="rounded-xl bg-red-50 p-6 text-center"><p className="text-danger">Failed to load invoices.</p></div>
      : !data?.data.length ? (
        <div className="text-center py-20"><Receipt size={40} className="mx-auto text-foreground/20" /><p className="text-foreground/50 mt-4">No invoices found.</p></div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {data.data.map((inv) => (
              <a key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] p-4 hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.08)] transition-all">
                <div>
                  <p className="text-sm font-mono font-bold text-foreground">{inv.invoiceNo}</p>
                  <p className="text-xs text-foreground/50 mt-0.5">{inv.trackingNo} — {new Date(inv.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground tabular-nums">{Number(inv.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                  <Chip size="sm" variant="soft" color={STATUS_COLORS[inv.status] ?? 'warning'}>{inv.status === 'unpaid' ? 'Unpaid' : inv.status === 'paid' ? 'Paid' : 'Cancelled'}</Chip>
                </div>
              </a>
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-foreground/5">
            <p className="text-xs text-foreground/40 tabular-nums">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
            <div className={totalPages <= 1 ? 'opacity-40 pointer-events-none' : ''}>
              <Pagination size="sm">
                <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous isDisabled={page === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>Prev</Pagination.Previous>
                    </Pagination.Item>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Pagination.Item key={p}><Pagination.Link isActive={p === page} onPress={() => setPage(p)}>{p}</Pagination.Link></Pagination.Item>
                    ))}
                    <Pagination.Item>
                      <Pagination.Next isDisabled={page === totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Pagination.Next>
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
  return <ErrorBoundary><MyInvoicesContent /></ErrorBoundary>;
}
