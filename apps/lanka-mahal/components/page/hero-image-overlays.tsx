import type { ReactNode } from 'react';

/** Shared image hero scrim — use on home + all PageHero backgrounds. */
export function HeroImageOverlays(): ReactNode {
  return (
    <>
      <div className="absolute inset-0 bg-brand-navy/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/80 via-brand-navy/30 to-brand-navy/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_80%_20%,rgba(245,158,11,0.1),transparent)]" />
    </>
  );
}
