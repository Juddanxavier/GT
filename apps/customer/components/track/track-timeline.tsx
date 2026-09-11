'use client';

import { MapPin } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TrackEvent } from '@/lib/queries';
import { STATUS_LABELS } from '@/lib/status';

type TrackTimelineProps = {
  events: TrackEvent[];
};

export function TrackTimeline({ events }: TrackTimelineProps): ReactNode {
  if (events.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground/55">
        No tracking events yet. Check back shortly.
      </p>
    );
  }

  return (
    <div className="relative space-y-0">
      {events.map((event, i) => {
        const isLatest = i === 0;
        return (
          <div key={`${event.eventTime}-${event.description ?? ''}`} className="relative flex gap-4 pb-8 last:pb-0">
            {i < events.length - 1 && (
              <div
                className="absolute left-[15px] top-8 bottom-0 w-px bg-gradient-to-b from-brand-accent/30 to-foreground/10"
                aria-hidden
              />
            )}
            <div className="relative z-10 shrink-0 pt-0.5">
              <div
                className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 ${
                  isLatest
                    ? 'border-brand-accent bg-brand-accent text-white shadow-[0_0_0_4px_rgba(232,98,26,0.2)]'
                    : 'border-foreground/12 bg-white text-foreground/35'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
              </div>
            </div>
            <div className="min-w-0 flex-1 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-4 transition-colors hover:border-brand-accent/15">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className={`text-sm font-semibold ${isLatest ? 'text-foreground' : 'text-foreground/80'}`}>
                  {STATUS_LABELS[event.status] || event.status}
                </p>
                <time className="text-xs text-foreground/45">
                  {new Date(event.eventTime).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </time>
              </div>
              {event.description && (
                <p className="mt-1 text-sm leading-relaxed text-foreground/65">{event.description}</p>
              )}
              {event.location && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-foreground/50">
                  <MapPin size={12} className="text-brand-accent/70" />
                  {event.location}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
