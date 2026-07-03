import type { ReactNode } from 'react';

export interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent: string;
}

export function KpiCard({ icon, label, value, accent }: KpiCardProps): ReactNode {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className={`w-10 h-10 rounded-lg ${accent} flex items-center justify-center text-white shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
