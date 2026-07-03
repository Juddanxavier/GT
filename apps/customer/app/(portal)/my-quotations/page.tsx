'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { CheckCircle, FileText, XCircle } from 'lucide-react';
import { Button, Chip, Pagination } from '@heroui/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { authClient } from '@/lib/auth-client';
import { useTenantConfig } from '@/lib/use-tenant-config';
import {
  useMyQuotations,
  useUpdateQuotationStatus,
  type QuotationRow,
} from '@/lib/queries';

const ROWS_PER_PAGE = 20;

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  converted: 'Converted',
};
const STATUS_COLORS: Record<
  string,
  'warning' | 'primary' | 'success' | 'danger' | 'default'
> = {
  draft: 'warning',
  sent: 'primary',
  accepted: 'success',
  rejected: 'danger',
  converted: 'default',
};

function SkeletonRow(): ReactNode {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-muted/20" />
        <div className="h-3 w-20 rounded bg-muted/20" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-4 w-20 rounded bg-muted/20" />
        <div className="h-5 w-16 rounded-full bg-muted/20" />
      </div>
    </div>
  );
}

function MyQuotationsContent(): ReactNode {
  const config = useTenantConfig();
  const { data: session } = authClient.useSession();
  const isEmerald = config.theme === 'emerald';
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const updateStatus = useUpdateQuotationStatus();

  const { data, isLoading, error } = useMyQuotations(statusFilter, page);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.total ?? 0) / ROWS_PER_PAGE)),
    [data?.total],
  );

  if (!session)
    return (
      <p className="text-center text-muted py-20">
        Sign in to view your quotations.
      </p>
    );

  function handleAction(
    q: QuotationRow,
    newStatus: 'accepted' | 'rejected',
  ): void {
    updateStatus.mutate({ id: q.id, status: newStatus });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">My Quotations</h1>
        {data && data.total > 0 && (
          <span className="text-xs text-muted">{data.total} total</span>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['', 'sent', 'accepted', 'rejected', 'converted'].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'solid' : 'ghost'}
            onPress={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={
              statusFilter === s && isEmerald
                ? 'bg-emerald-600 text-white'
                : statusFilter === s && !isEmerald
                  ? 'bg-violet-600 text-white'
                  : ''
            }
          >
            {s ? STATUS_LABELS[s] : 'All'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-danger/20 bg-danger/10 p-6 text-center">
          <p className="text-sm text-danger">Failed to load quotations.</p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-3 text-danger"
            onPress={() => window.location.reload()}
          >
            Try again
          </Button>
        </div>
      ) : !data?.data.length ? (
        <div className="text-center py-20">
          <FileText size={40} className="mx-auto text-muted/40" />
          <p className="text-muted mt-4">No quotations found.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {data.data.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 hover:bg-surface-secondary transition-colors"
              >
                <a
                  href={`/quotations/${q.id}`}
                  className="flex-1 min-w-0 mr-3"
                >
                  <p className="text-sm font-mono font-medium text-foreground truncate">
                    {q.quoteNo}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(q.createdAt).toLocaleDateString()}
                  </p>
                </a>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-foreground">
                    {Number(q.total).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                    })}
                  </span>

                  {q.status === 'sent' ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label="Accept quotation"
                        className="text-success hover:bg-success/10 min-w-8 h-8"
                        isDisabled={
                          updateStatus.isPending &&
                          updateStatus.variables?.id === q.id
                        }
                        onPress={() => handleAction(q, 'accepted')}
                      >
                        <CheckCircle size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label="Reject quotation"
                        className="text-danger hover:bg-danger/10 min-w-8 h-8"
                        isDisabled={
                          updateStatus.isPending &&
                          updateStatus.variables?.id === q.id
                        }
                        onPress={() => handleAction(q, 'rejected')}
                      >
                        <XCircle size={16} />
                      </Button>
                    </div>
                  ) : (
                    <Chip
                      size="sm"
                      variant="soft"
                      color={STATUS_COLORS[q.status] ?? 'default'}
                    >
                      {STATUS_LABELS[q.status] || q.status}
                    </Chip>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center pt-2">
              <Pagination size="sm">
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous isDisabled={page === 1} onPress={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                      Prev
                    </Pagination.Previous>
                  </Pagination.Item>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Pagination.Item key={p}>
                      <Pagination.Link isActive={p === page} onPress={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        {p}
                      </Pagination.Link>
                    </Pagination.Item>
                  ))}
                  <Pagination.Item>
                    <Pagination.Next isDisabled={page === totalPages} onPress={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                      Next
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function MyQuotationsPage(): ReactNode {
  return (
    <ErrorBoundary>
      <MyQuotationsContent />
    </ErrorBoundary>
  );
}
