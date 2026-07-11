'use client';

import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  count: number;
  color: string;
  icon: LucideIcon;
  format?: 'number' | 'currency';
  data?: number[];
  trend?: number;
}

export function KpiCard({ label, count, color, icon: Icon, format = 'number', data, trend }: KpiCardProps) {
  const displayCount = format === 'currency' ? `\u20B9${Number(count).toLocaleString('en-IN')}` : String(count);
  return (
    <div className="rounded-xl border border-border bg-surface hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col">
      <div className="p-5 pb-3 flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">{label}</span>
          <Icon size={18} style={{ color }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <p className={`font-bold tracking-tight ${data ? 'text-4xl' : 'text-3xl'}`}>{displayCount}</p>
            {trend != null && (
              <span className={`text-xs font-medium ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
                {trend >= 0 ? '\u2191' : '\u2193'} {Math.abs(trend)}%
              </span>
            )}
          </div>
          {data && data.length > 0 && (() => {
            const max = Math.max(...data) || 1;
            const min = Math.min(...data);
            const range = max - min || 1;
            const w = 80; const h = 32;
            const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(1)}`).join(' ');
            const area = `0,${h} ${pts} ${w},${h}`;
            return (
              <div className="w-20 h-8">
                <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={`fill-${label.replace(/\s/g, '')}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={color} stopOpacity="0.03" />
                    </linearGradient>
                  </defs>
                  <polygon points={area} fill={`url(#fill-${label.replace(/\s/g, '')})`} />
                  <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
