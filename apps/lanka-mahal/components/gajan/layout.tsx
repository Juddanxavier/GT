'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Footer } from '@/components/footer';
import { MarqueeBar } from '@/components/marquee-bar';
import { PortalNav } from '@/components/portal-nav';
import { isAuthPath, isMarketingPath } from '@/lib/marketing-paths';

export function GajanLayout({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const authPage = isAuthPath(pathname);
  const showMarquee = isMarketingPath(pathname);

  if (authPage) {
    return <>{children}</>;
  }

  return (
    <>
      {showMarquee && <MarqueeBar />}
      <PortalNav hasMarquee={showMarquee} />
      {children}
      <Footer />
    </>
  );
}
