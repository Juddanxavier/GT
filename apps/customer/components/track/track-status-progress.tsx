'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { STATUS_LABELS } from '@/lib/status';

const STEPS = [
  { id: 'booked', label: 'Booked', statuses: ['pending', 'info_received'] },
  { id: 'transit', label: 'In transit', statuses: ['in_transit', 'failed_attempt'] },
  {
    id: 'delivery',
    label: 'Out for delivery',
    statuses: ['out_for_delivery', 'available_for_pickup'],
  },
  { id: 'delivered', label: 'Delivered', statuses: ['delivered'] },
] as const;

function stepIndex(status: string): number {
  if (status === 'exception' || status === 'expired' || status === 'cancelled') {
    return 1;
  }
  const idx = STEPS.findIndex((s) => s.statuses.includes(status as never));
  return idx >= 0 ? idx : 0;
}

type TrackStatusProgressProps = {
  status: string;
};

export function TrackStatusProgress({ status }: TrackStatusProgressProps): ReactNode {
  const active = stepIndex(status);
  const isException = status === 'exception' || status === 'expired' || status === 'delivery_failure';

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
          Shipment progress
        </p>
        {isException && (
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-600">
            {STATUS_LABELS[status] || status}
          </span>
        )}
      </div>
      <div className="relative flex items-center justify-between">
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-foreground/10" aria-hidden />
        <div
          className="absolute left-0 top-4 h-0.5 bg-brand-accent transition-all duration-500"
          style={{ width: `${(active / (STEPS.length - 1)) * 100}%` }}
          aria-hidden
        />
        {STEPS.map((step, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <div key={step.id} className="relative z-10 flex flex-1 flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? 'border-brand-accent bg-brand-accent text-white'
                    : current
                      ? 'border-brand-accent bg-white text-brand-accent shadow-[0_0_0_4px_rgba(232,98,26,0.15)]'
                      : 'border-foreground/15 bg-white text-foreground/30'
                }`}
              >
                {done ? <Check size={14} strokeWidth={3} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
              </div>
              <span
                className={`mt-2 hidden text-center text-[11px] font-medium sm:block ${
                  current ? 'text-brand-accent' : done ? 'text-foreground/70' : 'text-foreground/40'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm font-semibold text-foreground sm:hidden">
        {STATUS_LABELS[status] || status}
      </p>
    </div>
  );
}
