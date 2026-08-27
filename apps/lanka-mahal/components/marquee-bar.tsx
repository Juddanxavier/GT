'use client';

import type { ReactNode } from 'react';

const MESSAGES = [
  'New: Air freight to Europe — 3-5 day delivery',
      'Door-to-door pickup available within 3 km of our offices',
  'Track shipments in real time — no login required',
  'Customs clearance included for all international parcels',
  'Ocean freight rates starting LKR 3,500/kg',
];

export function MarqueeBar(): ReactNode {
  const content = MESSAGES.map((m, i) => (
    <span key={i} className="mx-8 inline-flex shrink-0 items-center gap-2 text-xs font-medium tracking-wide text-white">
      <span className="h-1 w-1 rounded-full bg-[#F59E0B]" />
      {m}
    </span>
  ));

  return (
    <div className="fixed top-0 left-0 z-[60] w-full h-9 flex items-center overflow-hidden bg-[#1a1a2e]/95 backdrop-blur-md">
      <div className="marquee-track flex whitespace-nowrap">
        {content}
        {content}
      </div>

      <style>{`
        .marquee-track {
          animation: marqueeScroll 30s linear infinite;
        }
        @keyframes marqueeScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
