'use client';

import { useId } from 'react';

function chartScale(data: number[]) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;

  if (range === 0) {
    if (max === 0) return { min: 0, range: 1 };
    const pad = Math.max(max * 0.2, 1);
    return { min: Math.max(0, max - pad), range: pad * 2 };
  }

  const pad = range * 0.1;
  return { min: Math.max(0, min - pad), range: range + pad * 2 };
}

/** Gradient area line with a highlighted latest point. */
export function Sparkline({ data, color }: { data: number[]; color: string }) {
  const id = useId();
  if (data.length < 2) return null;

  const { min, range } = chartScale(data);
  const w = 100;
  const h = 32;
  const padY = 3;
  const plot = h - padY * 2;
  const x = (i: number) => (i / (data.length - 1)) * w;
  const y = (v: number) => h - padY - ((v - min) / range) * plot;

  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  const lastX = x(data.length - 1);
  const lastY = y(data[data.length - 1] ?? 0);

  return (
    <div className="w-full h-6 mt-1.5">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${id})`} />
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastX} cy={lastY} r="2.4" fill={color} stroke="var(--content1)" strokeWidth="1.25" />
      </svg>
    </div>
  );
}

/** Rounded bars on a hairline baseline; the peak reads at full strength. */
export function MiniBars({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const { min, range } = chartScale(data);
  const peak = Math.max(...data);

  return (
    <div className="flex items-end gap-[3px] mt-1.5 h-6 border-b border-divider pb-px">
      {data.map((v, i) => {
        const norm = (v - min) / range;
        const heightPct = Math.max(12, norm * 100);
        const isPeak = v === peak && peak > 0;
        const opacity = isPeak ? 1 : 0.32 + norm * 0.5;
        return (
          <div
            key={i}
            className="flex-1 rounded-t-[3px] min-h-[3px]"
            style={{ height: `${heightPct}%`, backgroundColor: color, opacity }}
          />
        );
      })}
    </div>
  );
}

export function MiniDonut({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const total = data.reduce((a, b) => a + b, 0) || 1;
  const frac = (data[0] ?? 0) / total;
  const r = 11;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex items-center justify-between mt-1.5 gap-2">
      <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0" aria-hidden="true" focusable="false">
        <circle cx="14" cy="14" r={r} fill="none" stroke={color} strokeOpacity="0.14" strokeWidth="4" />
        <circle
          cx="14"
          cy="14"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0.5, frac * c)} ${c}`}
          transform="rotate(-90 14 14)"
        />
      </svg>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>
        {Math.round(frac * 100)}%
      </span>
    </div>
  );
}

export function MiniChart({
  variant,
  data,
  color,
}: {
  variant: 'line' | 'bars' | 'donut';
  data: number[];
  color: string;
}) {
  if (!data.length) return null;
  if (variant === 'line') return <Sparkline data={data} color={color} />;
  if (variant === 'bars') return <MiniBars data={data} color={color} />;
  return <MiniDonut data={data} color={color} />;
}

/** Large area chart for the dashboard hero card: gridlines, gradient fill, latest-point dot. */
export function AreaChart({
  data,
  color,
  className = 'h-32',
}: {
  data: number[];
  color: string;
  className?: string;
}) {
  const id = useId();
  if (data.length < 2) return null;

  const { min, range } = chartScale(data);
  const w = 100;
  const h = 44;
  const padY = 4;
  const plot = h - padY * 2;
  const x = (i: number) => (i / (data.length - 1)) * w;
  const y = (v: number) => h - padY - ((v - min) / range) * plot;

  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  const lastX = x(data.length - 1);
  const lastY = y(data[data.length - 1] ?? 0);

  return (
    <div className={className}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <g stroke="var(--divider)" strokeWidth="0.5">
          <line x1="0" y1={h * 0.25} x2={w} y2={h * 0.25} />
          <line x1="0" y1={h * 0.5} x2={w} y2={h * 0.5} />
          <line x1="0" y1={h * 0.75} x2={w} y2={h * 0.75} />
        </g>
        <polygon points={area} fill={`url(#${id})`} />
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastX} cy={lastY} r="2.8" fill={color} stroke="var(--content1)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
