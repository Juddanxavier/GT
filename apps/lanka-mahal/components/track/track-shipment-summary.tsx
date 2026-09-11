'use client';

import { Chip } from '@heroui/react';
import { Clock, Copy, MapPin, PackageSearch, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TrackResult } from '@/lib/queries';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/status';
import { TrackStatusProgress } from '@/components/track/track-status-progress';

type TrackShipmentSummaryProps = {
  result: TrackResult;
};

export function TrackShipmentSummary({ result }: TrackShipmentSummaryProps): ReactNode {
  return (
    <div className="overflow-hidden rounded-3xl border border-foreground/5 bg-white shadow-[0_8px_40px_-12px_rgba(12,25,41,0.12)]">
      <div className="border-b border-foreground/5 bg-gradient-to-br from-brand-navy via-[#12243a] to-[#0c1929] px-6 py-6 text-white sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-brand-accent backdrop-blur-sm">
              <PackageSearch size={22} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/50">
                Tracking number
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-mono text-xl font-bold tracking-tight sm:text-2xl">{result.trackingNo}</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(result.trackingNo)}
                  className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
                  aria-label="Copy tracking number"
                >
                  <Copy size={15} />
                </button>
              </div>
              <Chip
                size="sm"
                variant="soft"
                color={STATUS_COLORS[result.status] ?? 'default'}
                className="mt-2"
              >
                {STATUS_LABELS[result.status] || result.status}
              </Chip>
            </div>
          </div>
        </div>

        {(result.origin || result.destination) && (
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white/5 px-4 py-3">
              <MapPin size={16} className="shrink-0 text-brand-accent" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-white/45">From</p>
                <p className="truncate font-medium">{result.origin || '—'}</p>
              </div>
            </div>
            <div className="hidden h-px w-8 bg-white/20 sm:block" aria-hidden />
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white/5 px-4 py-3">
              <MapPin size={16} className="shrink-0 text-brand-accent" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-white/45">To</p>
                <p className="truncate font-medium">{result.destination || '—'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6 px-6 py-6 sm:px-8">
        <TrackStatusProgress status={result.status} />

        <div className="flex flex-wrap gap-4 text-sm text-foreground/65">
          {result.carrier && (
            <span className="inline-flex items-center gap-2 rounded-full bg-foreground/[0.04] px-3 py-1.5">
              <Truck size={14} className="text-brand-accent" />
              {result.carrier}
            </span>
          )}
          {result.lastTrackedAt && (
            <span className="inline-flex items-center gap-2 rounded-full bg-foreground/[0.04] px-3 py-1.5">
              <Clock size={14} className="text-brand-accent" />
              Updated {new Date(result.lastTrackedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {result.estimatedDelivery && !result.actualDelivery && (
          <div className="rounded-2xl border border-brand-accent/15 bg-brand-accent/5 px-4 py-3 text-sm">
            <span className="font-semibold text-foreground">Estimated delivery: </span>
            <span className="text-foreground/75">
              {new Date(result.estimatedDelivery).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        )}
        {result.actualDelivery && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Delivered on{' '}
            {new Date(result.actualDelivery).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        )}
      </div>
    </div>
  );
}
