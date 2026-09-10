'use client';

import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  count: number;
  color: string;
  icon?: LucideIcon;
  format?: 'number' | 'currency';
  data?: number[];
  trend?: number;
  onPress?: () => void;
  isActive?: boolean;
}

export function KpiCard({
  label,
  count,
  color,
  icon: Icon,
  format = 'number',
  data,
  trend,
  onPress,
  isActive,
}: KpiCardProps) {
  const displayCount =
    format === 'currency' ? `\u20B9${Number(count).toLocaleString('en-IN')}` : String(count);
  const Comp = onPress ? 'button' : 'div';
  return (
    <Comp
      type={onPress ? 'button' : undefined}
      onClick={onPress}
      className={`rounded-xl border glass-panel ${isActive ? 'border-accent/30 ring-1 ring-accent/20 shadow-glow-accent-subtle' : 'border-glass'} ${onPress ? 'cursor-pointer glass-panel-hover hover:-translate-y-0.5' : ''} transition-all duration-200 overflow-hidden flex flex-col text-left`}
    >
      <div className="p-5 flex-1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">{label}</span>
          {Icon && (
            <span
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
              style={{ background: `color-mix(in oklab, ${color} 15%, transparent)` }}
            >
              <Icon size={16} style={{ color }} />
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <p className={`font-bold tracking-tight tabular-nums ${data ? 'text-3xl' : 'text-2xl'}`}>
              {displayCount}
            </p>
            {trend != null && (
              <span
                className={`text-xs font-medium ${trend >= 0 ? 'text-success' : 'text-danger'}`}
              >
                {trend >= 0 ? '\u2191' : '\u2193'} {Math.abs(trend)}%
              </span>
            )}
          </div>
          {data && data.length > 0 && (() => {
            const max = Math.max(...data) || 1;
            const min = Math.min(...data);
            const range = max - min || 1;
            const w = 80;
            const h = 32;
            const pts = data
              .map(
                (v, i) =>
                  `${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(1)}`,
              )
              .join(' ');
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
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            );
          })()}
        </div>
      </div>
    </Comp>
  );
}
