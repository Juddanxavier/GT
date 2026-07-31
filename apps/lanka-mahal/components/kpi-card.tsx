import type { ReactNode } from 'react';

export interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent: string;
}

export function KpiCard({ icon, label, value, accent }: KpiCardProps): ReactNode {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full ${accent}/10 flex items-center justify-center`}>
          <span className={accent.replace('bg-', 'text-')}>{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted font-medium tracking-wide uppercase">{label}</p>
          <p className="text-lg font-bold text-foreground mt-px">{value}</p>
        </div>
      </div>
    </div>
  );
}
