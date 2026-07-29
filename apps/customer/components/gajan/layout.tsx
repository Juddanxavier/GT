import type { ReactNode } from 'react';
import { PortalNav } from '@/components/portal-nav';
import { Footer } from '@/components/footer';

export function GajanLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <PortalNav />
      {children}
      <Footer />
    </>
  );
}
