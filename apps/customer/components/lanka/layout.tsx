import type { ReactNode } from 'react';
import { PortalNav } from '@/components/portal-nav';

export function LankaLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <PortalNav />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        &copy; {new Date().getFullYear()} Lanka Mahal
      </footer>
    </>
  );
}
