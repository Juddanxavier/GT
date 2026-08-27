import type { ReactNode } from 'react';

export default function DashboardLoading(): ReactNode {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-foreground/5" />
        <div className="space-y-2">
          <div className="h-6 w-64 bg-foreground/5 rounded-lg" />
          <div className="h-4 w-40 bg-foreground/5 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] p-6">
            <div className="h-20" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] p-6">
        <div className="h-48" />
      </div>
    </div>
  );
}
