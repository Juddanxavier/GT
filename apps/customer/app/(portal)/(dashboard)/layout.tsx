'use client';

import type { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { LeftSidebar, RightSidebar } from '@/components/sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <AuthGuard>
      <div className="portal-ops-page min-h-screen bg-brand-cream px-4 pb-12 pt-[calc(3.5rem+env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:pt-20">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[220px_1fr_260px]">
          <div className="hidden lg:block">
            <LeftSidebar />
          </div>
          <main className="min-w-0">{children}</main>
          <RightSidebar />
        </div>
      </div>
    </AuthGuard>
  );
}
