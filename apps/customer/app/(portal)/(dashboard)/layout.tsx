'use client';

import type { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { LeftSidebar, RightSidebar } from '@/components/sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <AuthGuard>
      <div className="px-4 sm:px-6 lg:px-8 pt-20 pb-12 bg-white min-h-screen">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[220px_1fr_260px] gap-6">
          <LeftSidebar />
          <main className="min-w-0">{children}</main>
          <RightSidebar />
        </div>
      </div>
    </AuthGuard>
  );
}