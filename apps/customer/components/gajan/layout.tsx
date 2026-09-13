'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Footer } from '@/components/footer';
import { MarqueeBar } from '@/components/marquee-bar';
import { PortalNav } from '@/components/portal-nav';
import { isAuthPath, isMarketingPath } from '@/lib/marketing-paths';

export function GajanLayout({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const authPage = isAuthPath(pathname);
  const showMarquee = isMarketingPath(pathname);
  const [marqueeVisible, setMarqueeVisible] = useState(true);

  useEffect(() => {
    if (!showMarquee) {
      setMarqueeVisible(true);
      return;
    }
    const onScroll = () => setMarqueeVisible(window.scrollY < 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showMarquee, pathname]);

  if (authPage) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[70]">
        {showMarquee && (
          <div
            className={`overflow-hidden transition-[max-height] duration-300 ease-out ${
              marqueeVisible ? 'max-h-10' : 'max-h-0'
            }`}
            aria-hidden={!marqueeVisible}
          >
            <MarqueeBar />
          </div>
        )}
        <PortalNav />
      </div>
      {children}
      <Footer />
    </>
  );
}
