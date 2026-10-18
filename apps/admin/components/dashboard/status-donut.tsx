'use client';

import { PieChart } from 'lucide-react';
import { BentoWidget, type BentoSize } from '@/components/bento';

/** Segment ramp — the same lime→amber→red family used across the admin. */
const RAMP = ['#7CB342', '#8DC63F', '#F6F23F', '#F59E42', '#E5484D', '#A2D145'];

/**
 * Status distribution as a segmented ring with a legend, sized for a bento
 * tile. Replaces the earlier stacked bar list on the dashboards. Decorative
 * only — the legend carries the numbers as text.
 */
export function StatusDonut({
  data,
  total,
  size = 'tall',
  className,
}: {
  data: { name: string; value: number }[];
  /** Ring centre figure. Defaults to the sum of the segments. */
  total?: number;
  size?: BentoSize;
  className?: string;
}) {
  const sum = data.reduce((a, d) => a + d.value, 0);
  const r = 40;
  const c = 2 * Math.PI * r;

  let acc = 0;
  const segments = data.map((d, i) => {
    const len = sum > 0 ? (d.value / sum) * c : 0;
    const segment = {
      name: d.name,
      value: d.value,
      len: Math.max(0, len),
      offset: -acc,
      color: RAMP[i % RAMP.length] ?? RAMP[0],
    };
    acc += len;
    return segment;
  });

  return (
    <BentoWidget size={size} className={className}>
      <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground/80">
        <span
          aria-hidden="true"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-default-100 text-muted"
        >
          <PieChart size={15} />
        </span>
        Status
      </div>

      {data.length > 0 ? (
        <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-4">
          <svg width="132" height="132" viewBox="0 0 100 100" aria-hidden="true" className="shrink-0">
            <g transform="rotate(-90 50 50)" fill="none" strokeWidth="13">
              {segments.map((s) => (
                <circle
                  key={s.name}
                  cx="50"
                  cy="50"
                  r={r}
                  stroke={s.color}
                  strokeDasharray={`${s.len} ${c}`}
                  strokeDashoffset={s.offset}
                />
              ))}
            </g>
            <text
              x="50"
              y="48"
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fill="currentColor"
              className="text-foreground"
            >
              {(total ?? sum).toLocaleString('en-IN')}
            </text>
            <text
              x="50"
              y="61"
              textAnchor="middle"
              fontSize="8"
              letterSpacing="1"
              fill="currentColor"
              className="text-muted"
            >
              SHIPMENTS
            </text>
          </svg>

          <ul className="flex w-full min-w-0 flex-col gap-1.5">
            {segments.map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-[11.5px]">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ background: s.color }}
                />
                <span className="min-w-0 flex-1 truncate text-muted">{s.name}</span>
                <span className="font-semibold tabular-nums text-foreground">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center py-8 text-xs text-muted">
          No status data yet
        </div>
      )}
    </BentoWidget>
  );
}
