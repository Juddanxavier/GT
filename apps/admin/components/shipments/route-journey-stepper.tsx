'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, Check, MapPin, Package, Truck } from 'lucide-react';
import { cn } from '@heroui/react';

const JOURNEY_STEPS = [
  { key: 'created', label: 'Created', icon: Package, statuses: ['pending', 'info_received'] },
  { key: 'transit', label: 'In Transit', icon: Truck, statuses: ['in_transit', 'failed_attempt', 'available_for_pickup'] },
  { key: 'out', label: 'Out for Delivery', icon: MapPin, statuses: ['out_for_delivery'] },
  { key: 'delivered', label: 'Delivered', icon: Check, statuses: ['delivered'] },
] as const;

function stepIndex(status: string): number {
  if (['exception', 'expired'].includes(status)) return -1;
  for (let i = JOURNEY_STEPS.length - 1; i >= 0; i--) {
    const step = JOURNEY_STEPS[i];
    if (step && (step.statuses as readonly string[]).includes(status)) return i;
  }
  return 0;
}

interface RouteJourneyStepperProps {
  status: string;
  origin?: string | null;
  destination?: string | null;
  compact?: boolean;
  className?: string;
}

export function RouteJourneyStepper({
  status,
  origin,
  destination,
  compact = false,
  className,
}: RouteJourneyStepperProps): ReactNode {
  const active = stepIndex(status);
  const isException = ['exception', 'expired'].includes(status);

  return (
    <div className={cn('space-y-3', className)}>
      {(origin || destination) && (
        <div className={cn('flex items-center gap-2', compact ? 'text-xs' : 'text-sm')}>
          <span className="font-medium truncate max-w-[40%]" title={origin ?? undefined}>
            {origin || 'Origin TBD'}
          </span>
          <div className="flex-1 flex items-center gap-1 min-w-[60px]">
            <div className="h-px flex-1 bg-[var(--ops-border)]" />
            <Truck size={compact ? 12 : 14} className="text-[var(--ops-accent)] shrink-0" />
            <div className="h-px flex-1 bg-[var(--ops-border)]" />
          </div>
          <span className="font-medium truncate max-w-[40%] text-right" title={destination ?? undefined}>
            {destination || 'Destination TBD'}
          </span>
        </div>
      )}

      {isException ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-danger/30 bg-danger/10 text-danger text-xs font-medium">
          <AlertTriangle size={14} />
          Exception — requires attention
        </div>
      ) : (
        <div className={cn('flex items-center', compact ? 'gap-1' : 'gap-2')}>
          {JOURNEY_STEPS.map((step, i) => {
            const done = i < active;
            const current = i === active;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center flex-1 min-w-0 last:flex-none">
                <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                  <div
                    className={cn(
                      'rounded-full flex items-center justify-center border transition-colors',
                      compact ? 'w-6 h-6' : 'w-8 h-8',
                      done && 'bg-[var(--ops-accent)] border-[var(--ops-accent)] text-[var(--accent-foreground)]',
                      current && 'bg-[var(--ops-accent-dim)] border-[var(--ops-accent)] text-[var(--ops-accent)]',
                      !done && !current && 'bg-transparent border-[var(--ops-border)] text-muted',
                    )}
                  >
                    {done ? <Check size={compact ? 10 : 12} /> : <Icon size={compact ? 10 : 14} />}
                  </div>
                  {!compact && (
                    <span
                      className={cn(
                        'text-[10px] font-medium text-center leading-tight truncate w-full',
                        current ? 'text-[var(--ops-accent)]' : 'text-muted',
                      )}
                    >
                      {step.label}
                    </span>
                  )}
                </div>
                {i < JOURNEY_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-px flex-1 mx-0.5',
                      i < active ? 'bg-[var(--ops-accent)]' : 'bg-[var(--ops-border)]',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
