import type { ReactNode } from 'react';
import { Footer } from '@/components/footer';
import { MarqueeBar } from '@/components/marquee-bar';
import { PortalNav } from '@/components/portal-nav';

export function GajanLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <MarqueeBar />
      <PortalNav />
      {children}
      <Footer />
    </>
  );
}
