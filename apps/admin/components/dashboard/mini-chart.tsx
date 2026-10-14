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

export function Sparkline({ data, color }: { data: number[]; color: string }) {
  const id = useId();
  if (data.length < 2) return null;

  const { min, range } = chartScale(data);
  const w = 100;
  const h = 32;
  const pts = data
    .map(
      (v, i) =>
        `${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(1)}`,
    )
    .join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;

  return (
    <div className="w-full h-8 mt-2">
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
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.04" />
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
      </svg>
    </div>
  );
}

export function MiniBars({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const { min, range } = chartScale(data);

  return (
    <div className="flex items-end gap-0.5 mt-2 h-8">
      {data.map((v, i) => {
        const norm = (v - min) / range;
        const heightPct = Math.max(10, norm * 100);
        const opacity = 0.35 + norm * 0.55;
        return (
          <div
            key={i}
            className="flex-1 rounded-sm min-h-[2px]"
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
  const r = 12;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex items-center justify-between mt-2 gap-2">
      <svg width="32" height="32" viewBox="0 0 32 32" className="shrink-0" aria-hidden="true" focusable="false">
        <circle cx="16" cy="16" r={r} fill="none" stroke={color} strokeOpacity="0.15" strokeWidth="4" />
        <circle
          cx="16"
          cy="16"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0.5, frac * c)} ${c}`}
          transform="rotate(-90 16 16)"
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
