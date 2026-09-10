'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { MiniChart } from './mini-chart';
import type { KpiItem } from './types';

export function KpiStatCard({ item }: { item: KpiItem }) {
  const color = item.color ?? '#6366f1';
  const hasTrend = !!item.trendValue && item.trendValue !== '—';
  const trendClass =
    item.trend === 'up'
      ? 'text-success'
      : item.trend === 'down'
        ? 'text-danger'
        : 'text-muted';

  const cls =
    'group flex flex-col rounded-xl border border-glass glass-panel p-4 transition-all duration-200 hover:border-glass-hover min-h-[132px]';

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted truncate">
          {item.label}
        </span>
        <span
          className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg"
          style={{
            background: `color-mix(in oklab, ${color} 18%, transparent)`,
            color,
          }}
        >
          {item.icon}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight text-foreground leading-none tabular-nums">
          {item.value}
        </p>
        {hasTrend ? (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${trendClass}`}>
            {item.trend === 'up' ? <TrendingUp size={10} /> : item.trend === 'down' ? <TrendingDown size={10} /> : null}
            {item.trendValue}
          </span>
        ) : item.trendValue ? (
          <span className="text-[10px] font-medium text-muted">{item.trendValue}</span>
        ) : null}
      </div>
      {item.sublabel && <span className="mt-0.5 text-[11px] text-muted">{item.sublabel}</span>}
      {item.spark && item.spark.length > 1 && item.chart && (
        <div className="mt-auto pt-1">
          <MiniChart variant={item.chart} data={item.spark} color={color} />
        </div>
      )}
    </>
  );

  if (item.href) return <a href={item.href} className={cls}>{inner}</a>;
  return <div className={cls}>{inner}</div>;
}

export function KpiGroup({ title, items }: { title: string; items: KpiItem[] }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted/80 px-0.5">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <KpiStatCard key={item.label} item={item} />
        ))}
      </div>
    </section>
  );
}
