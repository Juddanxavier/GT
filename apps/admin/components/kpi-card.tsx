'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currency';
import { bentoSpan, type BentoSize } from '@/components/bento';
import { AreaChart, MiniChart } from './dashboard/mini-chart';
import { hasSeriesSignal } from './dashboard/utils';

/**
 * The one KPI tile grammar for the whole admin surface. The dashboards, the
 * shipments list, the invoices list, and the reports page all render through
 * this component, so label, number, trend, chart, spacing, hover, focus, and
 * active states cannot drift apart again.
 *
 * The dashboard shows a parcel `image`; the list pages show a lucide `icon`.
 * A tile becomes a link with `href`, a button with `onPress` (carrying
 * `aria-pressed` when `isActive`), and a plain panel with neither.
 */
export interface KpiCardProps {
  label: string;
  /** Raw count. `format` decides how it renders. */
  value: string | number;
  /** Parcel illustration under `public/`. Takes precedence over `icon`. */
  image?: string;
  /** Lucide glyph, shown in a tinted badge when no `image` is set. */
  icon?: LucideIcon;
  /** Ramp hex for the value, glyph badge, and chart. */
  color?: string;
  sublabel?: string;
  href?: string;
  onPress?: () => void;
  /** Marks the tile as the current filter: active tone plus `aria-pressed`. */
  isActive?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  /** Rendered beside the glyph, e.g. `+12.0%`, or `—` when the change is unknown. */
  trendValue?: string;
  /** Set when a rise is bad (exceptions, overdue): flips the tone, not the arrow. */
  invertTrend?: boolean;
  /** Sparkline series, oldest first. */
  spark?: number[];
  chart?: 'line' | 'bars' | 'donut';
  format?: 'number' | 'currency';
  /** Preserves the tenant currency sign (`LKR` → `Rs`) — never a hardcoded symbol. */
  currencyCode?: string;
  /** Entrance stagger offset, in ms. Omit to render settled. */
  revealDelay?: number;
  /** Bento footprint. `feature` also renders the large gridlined area chart. */
  size?: BentoSize;
}

export function KpiCard({
  label,
  value,
  image,
  icon: Icon,
  color = '#7CB342',
  sublabel,
  href,
  onPress,
  isActive,
  trend = 'neutral',
  trendValue = '\u2014',
  invertTrend,
  spark,
  chart,
  format = 'number',
  currencyCode,
  revealDelay,
  size = 'base',
}: KpiCardProps) {
  const numeric = typeof value === 'number' ? value : Number(value);
  const count = Number.isFinite(numeric) ? numeric : 0;
  const feature = size === 'feature';

  // AC-11: a zero count or an all-zero series drops the chart and tones the delta neutral.
  const signal = hasSeriesSignal(count, spark ?? []);
  const showChart = signal && (spark?.length ?? 0) > 1 && (feature || !!chart);

  const placeholder = !signal || trend === 'neutral' || trendValue === '\u2014';
  const trendIsGood = invertTrend ? trend === 'down' : trend === 'up';
  // Trend reads as a tinted pill: glyph + percentage, never colour alone (DESIGN.md).
  const trendClass = placeholder
    ? 'bg-default-100 text-muted'
    : trendIsGood
      ? 'bg-success/10 text-success-soft-foreground'
      : 'bg-danger/10 text-danger-soft-foreground';

  const displayValue =
    format === 'currency'
      ? `${getCurrencySymbol(currencyCode)}${count.toLocaleString('en-IN')}`
      : String(value);

  const interactive = !!href || !!onPress;
  const shell = [
    'group flex flex-col overflow-hidden rounded-lg content-panel text-left transition-colors duration-150',
    bentoSpan[size],
    isActive ? 'bg-accent-soft' : '',
    interactive ? 'hover:bg-content2' : '',
    revealDelay !== undefined ? 'reveal' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const style =
    revealDelay !== undefined ? ({ '--reveal-delay': `${revealDelay}ms` } as CSSProperties) : undefined;

  const trendPill = (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${trendClass}`}
    >
      {!placeholder && trend === 'up' ? <TrendingUp size={12} /> : null}
      {!placeholder && trend === 'down' ? <TrendingDown size={12} /> : null}
      {trendValue}
    </span>
  );

  const inner = (
    <>
      <div className="flex items-center gap-2">
        {image ? (
          // biome-ignore lint/performance/noImgElement: fixed decorative parcel mark; the app ships no image optimizer and next/image would add a sharp dependency to the Docker build for a small asset.
          <img
            src={image}
            alt=""
            aria-hidden="true"
            width={32}
            height={32}
            decoding="async"
            className="shrink-0 w-8 h-8 object-contain"
          />
        ) : Icon ? (
          <span
            aria-hidden="true"
            className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: `color-mix(in oklab, ${color} 18%, transparent)` }}
          >
            <Icon size={15} style={{ color }} />
          </span>
        ) : null}
        <span className="min-w-0 flex-1 text-[13px] font-semibold text-foreground/80 truncate">{label}</span>
        {trendPill}
      </div>

      <p
        className={`mt-3 tracking-tight text-foreground leading-none tabular-nums ${
          feature ? 'text-[54px] font-bold' : 'text-[38px] font-medium'
        }`}
      >
        {displayValue}
      </p>

      {sublabel && <span className="mt-1.5 text-[11px] text-muted">{sublabel}</span>}

      {showChart && spark && (
        <div className="mt-auto pt-2.5 border-t border-divider">
          {feature ? (
            <>
              <AreaChart data={spark} color={color} className="h-20 lg:h-24" />
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted tabular-nums">
                <span>
                  <span className="sr-only">Chart range </span>
                  {spark.length}d &middot; {Math.min(...spark)}&ndash;{Math.max(...spark)}
                </span>
                <span>peak {Math.max(...spark)}</span>
              </div>
            </>
          ) : chart === 'donut' ? (
            <MiniChart variant={chart} data={spark} color={color} />
          ) : (
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0 flex-1">
                <MiniChart variant={chart ?? 'line'} data={spark} color={color} />
              </div>
              <span className="shrink-0 text-[11px] tabular-nums text-muted">
                <span className="sr-only">Chart range </span>
                {spark.length}d &middot; {Math.min(...spark)}&ndash;{Math.max(...spark)}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );

  // A signal band pins the metric's colour to the top edge, and the body carries
  // a soft wash of the same colour. Both are decorative only.
  const content = (
    <>
      <span
        aria-hidden="true"
        className="block h-[5px] w-full shrink-0"
        style={{
          background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 40%, transparent))`,
        }}
      />
      <div
        className="flex flex-1 flex-col p-5"
        style={{
          background: `linear-gradient(160deg, color-mix(in oklab, ${color} 9%, transparent), transparent 62%)`,
        }}
      >
        {inner}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={shell} style={style} aria-current={isActive ? 'page' : undefined}>
        {content}
      </Link>
    );
  }
  if (onPress) {
    return (
      <button type="button" onClick={onPress} aria-pressed={!!isActive} className={shell} style={style}>
        {content}
      </button>
    );
  }
  return (
    <div className={shell} style={style}>
      {content}
    </div>
  );
}
