import type { ReactNode } from 'react';
import { PortalNav } from '@/components/portal-nav';

export function GajanLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <PortalNav />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="border-t border-separator py-6 text-center text-sm text-muted">
        &copy; {new Date().getFullYear()} Gajan Traders
      </footer>
    </>
  );
}
