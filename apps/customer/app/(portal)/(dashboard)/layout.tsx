'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { LeftSidebar, RightSidebar } from '@/components/sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    <AuthGuard>
      <div className="px-4 sm:px-6 lg:px-8 pt-20 pb-12 bg-white min-h-screen">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[220px_1fr_260px] gap-6">
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-foreground/5 text-sm font-semibold text-foreground shadow-sm cursor-pointer"
            >
              <Menu size={16} /> Menu
            </button>
          </div>
          <div className="hidden lg:block"><LeftSidebar /></div>
          <main className="min-w-0">{children}</main>
          <RightSidebar />
        </div>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <span className="text-sm font-bold uppercase tracking-wider text-foreground/60">Menu</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="p-2 rounded-lg text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="px-4 pb-6"><LeftSidebar drawer /></div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
