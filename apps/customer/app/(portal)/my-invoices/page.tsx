'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { Chip, Button } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { authClient } from '@/lib/auth-client';
import { useTenantConfig } from '@/lib/use-tenant-config';

const API_BASE = '';

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'danger'> = { unpaid: 'warning', paid: 'success', cancelled: 'danger' };

function MyInvoicesContent(): ReactNode {
  const config = useTenantConfig();
  const { data: session } = authClient.useSession();
  const isEmerald = config.theme === 'emerald';
  const [filter, setFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-invoices', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      const res = await fetch(`${API_BASE}/api/customers/my-invoices?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      return res.json() as Promise<{ data: Array<{ id: string; invoiceNo: string; amount: string; status: string; trackingNo: string; paidAt: string | null; createdAt: string }>; total: number }>;
    },
    enabled: !!session,
  });

  if (!session) return <p className="text-center text-muted py-20">Sign in to view your invoices.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">My Invoices</h1>
        {data && data.total > 0 && <span className="text-xs text-muted">{data.total} total</span>}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['', 'unpaid', 'paid', 'cancelled'].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? 'solid' : 'ghost'} onPress={() => setFilter(s)}
            className={filter === s && isEmerald ? 'bg-emerald-600 text-white' : filter === s && !isEmerald ? 'bg-violet-600 text-white' : ''}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </Button>
        ))}
      </div>

      {isLoading ? <p className="text-center text-muted py-10">Loading...</p>
      : error ? <div className="rounded-xl border border-danger/20 bg-danger/10 p-6 text-center"><p className="text-sm text-danger">Failed to load invoices.</p></div>
      : !data?.data.length ? (
        <div className="text-center py-20"><Receipt size={40} className="mx-auto text-muted/40" /><p className="text-muted mt-4">No invoices found.</p></div>
      ) : (
        <div className="space-y-2">
          {data.data.map((inv) => (
            <a key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 hover:bg-surface-secondary transition-colors">
              <div>
                <p className="text-sm font-mono font-medium text-foreground">{inv.invoiceNo}</p>
                <p className="text-xs text-muted mt-0.5">{inv.trackingNo} — {new Date(inv.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">{Number(inv.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                <Chip size="sm" variant="soft" color={STATUS_COLORS[inv.status] ?? 'warning'}>{inv.status}</Chip>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyInvoicesPage(): ReactNode {
  return <ErrorBoundary><MyInvoicesContent /></ErrorBoundary>;
}
