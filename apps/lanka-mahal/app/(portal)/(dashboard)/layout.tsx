'use client';

import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { LeftSidebar, RightSidebar } from '@/components/sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: close the drawer on every route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-brand-cream px-4 pb-12 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[220px_1fr_260px]">
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="premium-card inline-flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground"
            >
              <Menu size={16} /> Menu
            </button>
          </div>
          <div className="hidden lg:block">
            <LeftSidebar />
          </div>
          <main className="min-w-0">{children}</main>
          <RightSidebar />
        </div>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 cursor-default bg-brand-navy/50 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute left-0 top-28 h-[calc(100dvh-7rem)] w-80 max-w-[85vw] overflow-y-auto bg-brand-cream shadow-2xl">
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <span className="text-sm font-bold uppercase tracking-wider text-foreground/60">
                  Menu
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="cursor-pointer rounded-lg p-2 text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="px-4 pb-6">
                <LeftSidebar drawer />
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
