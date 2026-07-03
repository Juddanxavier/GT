'use client';

import type { ReactNode } from 'react';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button, Chip } from '@heroui/react';
import { useParams } from 'next/navigation';
import { ErrorBoundary } from '@/components/error-boundary';
import { authClient } from '@/lib/auth-client';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { useMyQuotationDetail, useUpdateQuotationStatus } from '@/lib/queries';

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

function SkeletonDetail(): ReactNode {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
      <div className="h-4 w-32 rounded bg-muted/20" />
      <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-muted/20" />
            <div className="h-3 w-24 rounded bg-muted/20" />
          </div>
          <div className="h-6 w-16 rounded-full bg-muted/20" />
        </div>
        <div className="h-3 w-36 rounded bg-muted/20" />
        <div className="border-t border-separator pt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-32 rounded bg-muted/20" />
              <div className="h-4 w-16 rounded bg-muted/20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuotationDetailContent(): ReactNode {
  const config = useTenantConfig();
  const { data: session } = authClient.useSession();
  const { id } = useParams<{ id: string }>();
  const isEmerald = config.theme === 'emerald';
  const updateStatus = useUpdateQuotationStatus();

  const { data, isLoading, error } = useMyQuotationDetail(id);

  if (!session)
    return (
      <p className="text-center text-muted py-20">
        Sign in to view this quotation.
      </p>
    );
  if (isLoading) return <SkeletonDetail />;
  if (error)
    return (
      <div className="max-w-lg mx-auto mt-10 rounded-xl border border-danger/20 bg-danger/10 p-6 text-center">
        <p className="text-sm text-danger">Failed to load quotation.</p>
      </div>
    );
  if (!data)
    return (
      <p className="text-center text-muted py-20">Quotation not found.</p>
    );

  const q = data.data;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <a
        href="/my-quotations"
        className={`inline-flex items-center gap-1 text-sm ${isEmerald ? 'text-emerald-600' : 'text-violet-600'}`}
      >
        <ArrowLeft size={14} /> Back to quotations
      </a>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground font-mono">
              {q.quoteNo}
            </h1>
            <p className="text-xs text-muted mt-0.5">
              {new Date(q.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Chip
            size="sm"
            variant="soft"
            color={STATUS_COLORS[q.status] ?? 'default'}
          >
            {STATUS_LABELS[q.status] || q.status}
          </Chip>
        </div>

        {q.validUntil && (
          <p className="text-xs text-muted">
            Valid until:{' '}
            {new Date(q.validUntil).toLocaleDateString()}
          </p>
        )}

        <div className="border-t border-separator pt-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wider">
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium text-right">Qty</th>
                <th className="pb-2 font-medium text-right">Rate</th>
                <th className="pb-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-separator">
              {q.items?.map((item, i) => (
                <tr key={i}>
                  <td className="py-2 text-foreground">{item.description}</td>
                  <td className="py-2 text-right text-muted">
                    {Number(item.quantity).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 text-right text-muted">
                    {Number(item.rate).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                    })}
                  </td>
                  <td className="py-2 text-right text-foreground font-medium">
                    {Number(item.amount).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-separator pt-4 flex justify-end">
          <div className="text-right">
            <p className="text-xs text-muted">Total</p>
            <p className="text-lg font-bold text-foreground">
              {Number(q.total).toLocaleString('en-IN', {
                style: 'currency',
                currency: 'INR',
              })}
            </p>
          </div>
        </div>

        {q.notes && (
          <div className="border-t border-separator pt-4">
            <p className="text-xs text-muted mb-1">Notes</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {q.notes}
            </p>
          </div>
        )}

        {/* Accept / Reject actions for sent quotations */}
        {q.status === 'sent' && (
          <div className="border-t border-separator pt-4 flex gap-3 justify-end">
            <Button
              variant="ghost"
              className="border-success text-success hover:bg-success/10"
              isDisabled={updateStatus.isPending}
              onPress={() =>
                updateStatus.mutate({ id: q.id, status: 'accepted' })
              }
            >
              <CheckCircle size={16} /> Accept Quotation
            </Button>
            <Button
              variant="ghost"
              className="border-danger text-danger hover:bg-danger/10"
              isDisabled={updateStatus.isPending}
              onPress={() =>
                updateStatus.mutate({ id: q.id, status: 'rejected' })
              }
            >
              <XCircle size={16} /> Reject Quotation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuotationDetailPage(): ReactNode {
  return <ErrorBoundary><QuotationDetailContent /></ErrorBoundary>;
}
