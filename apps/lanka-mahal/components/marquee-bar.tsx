'use client';

import { Sparkles, X } from 'lucide-react';
import type { ReactNode } from 'react';

const MESSAGES = [
  'Air freight to Europe — 3–5 day delivery',
  'Door-to-door pickup within 5 km of our offices — conditions apply',
  'Track shipments in real time — no login required',
  'Customs clearance on all international parcels',
  'Ocean freight from LKR 499/kg',
];

interface MarqueeBarProps {
  onDismiss?: () => void;
}

export function MarqueeBar({ onDismiss }: MarqueeBarProps): ReactNode {
  const content = MESSAGES.map((m, i) => (
    <span
      key={i}
      className="mx-4 inline-flex shrink-0 items-center gap-2 text-[11px] text-white/80 sm:mx-8 sm:text-xs"
    >
      <Sparkles size={11} className="shrink-0 text-brand-accent" />
      {m}
    </span>
  ));

  return (
    <div className="relative flex h-10 w-full items-stretch bg-brand-navy-deep/95 backdrop-blur-xl">
      <div className="flex shrink-0 items-center border-r border-white/10 bg-brand-accent/90 px-2.5 sm:px-4">
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white sm:text-[10px] sm:tracking-[0.14em]">
          Live
        </span>
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div
          className="marquee-track flex h-full items-center whitespace-nowrap"
          style={{ animation: 'marquee-scroll 55s linear infinite' }}
        >
          {content}
          {content}
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss announcements"
          className="flex w-10 shrink-0 items-center justify-center border-l border-white/10 text-white/40 transition-colors hover:text-white"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
