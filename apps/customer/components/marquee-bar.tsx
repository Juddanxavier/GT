'use client';

import { Sparkles, X } from 'lucide-react';
import type { ReactNode } from 'react';

const MESSAGES = [
  'Air freight to Europe — 3–5 day delivery',
  'Door-to-door pickup within 3 km of our offices',
  'Track shipments in real time — no login required',
  'Customs clearance on all international parcels',
  'Ocean freight from ₹499/kg',
];

interface MarqueeBarProps {
  onDismiss?: () => void;
}

export function MarqueeBar({ onDismiss }: MarqueeBarProps): ReactNode {
  const content = MESSAGES.map((m, i) => (
    <span key={i} className="mx-8 inline-flex shrink-0 items-center gap-2 text-xs text-white/80">
      <Sparkles size={11} className="text-brand-accent" />
      {m}
    </span>
  ));

  return (
    <div className="fixed top-0 left-0 z-[60] flex h-10 w-full items-stretch bg-brand-navy-deep/95 backdrop-blur-xl">
      <div className="flex shrink-0 items-center border-r border-white/10 bg-brand-accent/90 px-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white">Live</span>
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div
          className="flex h-full items-center whitespace-nowrap"
          style={{ animation: 'marquee-scroll 38s linear infinite' }}
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
