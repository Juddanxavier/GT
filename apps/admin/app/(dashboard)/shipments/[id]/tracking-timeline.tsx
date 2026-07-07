'use client';

import type { ReactNode } from 'react';
import { MapPin, Clock, Info } from 'lucide-react';
import { Chip } from '@heroui/react';
import { STATUS_META } from '@repo/ui/status-config';

interface TrackingEvent {
  id?: string;
  status: string;
  subStatus?: string | null;
  description?: string | null;
  location?: string | null;
  carrier?: string | null;
  eventTime: string;
  providerTips?: Record<string, unknown> | null;
}

interface TrackingTimelineProps {
  events: TrackingEvent[];
}

/** ponytail: timeline dots use hardcoded color map — pull colors from STATUS_COLORS if the timeline diverges from status badges */
const DOT_COLORS: Record<string, string> = {
  delivered: '#22c55e',
  in_transit: '#3b82f6',
  out_for_delivery: '#3b82f6',
  exception: '#ef4444',
  expired: '#ef4444',
  failed_attempt: '#ef4444',
  pending: '#9ca3af',
  info_received: '#9ca3af',
  available_for_pickup: '#f59e0b',
};

function elapsedSince(prev: string, curr: string): string {
  const diff = new Date(curr).getTime() - new Date(prev).getTime();
  if (diff < 0) return '0m';
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function TrackingTimeline({ events }: TrackingTimelineProps): ReactNode {
  if (!events?.length) {
    return (
      <div className="text-center py-12 animate-in fade-in">
        <Clock size={24} className="mx-auto mb-2 opacity-40 text-muted" />
        <p className="text-sm text-muted">No tracking events yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, idx) => {
        const meta = STATUS_META[event.status as keyof typeof STATUS_META];
        const dotColor = DOT_COLORS[event.status] ?? '#9ca3af';
        const isLatest = idx === 0;
        const hasTips = event.providerTips && Object.keys(event.providerTips).length > 0;

        return (
          <div key={event.id ?? idx} className="flex gap-4 animate-in fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
            {/* Timeline dot + connector */}
            <div className="flex flex-col items-center">
              <div
                className={`rounded-full shrink-0 ${isLatest ? 'w-4 h-4 ring-2 ring-offset-2 ring-[var(--dot-ring)]' : 'w-3 h-3'}`}
                style={{
                  backgroundColor: dotColor,
                  '--dot-ring': isLatest ? dotColor : undefined,
                } as React.CSSProperties}
              />
              {idx < events.length - 1 && <div className="w-0.5 flex-1 bg-border/50" />}
            </div>

            {/* Event content */}
            <div className={`pb-6 flex-1 min-w-0 ${isLatest ? '' : 'opacity-70'}`}>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-medium">{meta?.label ?? event.status.replace(/_/g, ' ')}</span>
                {isLatest && (
                  <Chip size="sm" variant="soft" color="accent" className="text-[10px] h-5">Latest</Chip>
                )}
                {event.subStatus && (
                  <span className="text-xs text-muted">· {event.subStatus.replace(/_/g, ' ')}</span>
                )}
              </div>

              {event.description && (
                <p className="text-sm text-foreground/80 mb-1">{event.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                {event.location && (
                  <span className="flex items-center gap-1"><MapPin size={10} />{event.location}</span>
                )}
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(event.eventTime).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                  {idx > 0 && (
                    <span className="text-muted/60">
                      (+{elapsedSince(events[idx - 1]!.eventTime, event.eventTime)})
                    </span>
                  )}
                </span>
              </div>

              {hasTips && (
                <div className="mt-1.5 flex items-start gap-1 text-xs text-muted bg-muted/5 rounded-md px-2 py-1">
                  <Info size={12} className="shrink-0 mt-0.5" />
                  <span>{JSON.stringify(event.providerTips)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
