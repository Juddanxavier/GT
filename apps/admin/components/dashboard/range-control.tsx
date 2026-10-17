'use client';

import type { ChartRange } from './types';

const RANGES: { key: ChartRange; label: string }[] = [
  { key: '1w', label: 'Last 7 days' },
  { key: '2w', label: 'Last 14 days' },
  { key: '1m', label: 'Last 30 days' },
];

/**
 * The single window control for the dashboard. It drives the KPI sparklines,
 * the KPI deltas, and the shipment trend chart together, and never touches the
 * card counts (AC-10). There is one control, not two.
 */
export function RangeControl({
  value,
  onChange,
}: {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <fieldset className="m-0 inline-flex items-center gap-1 rounded-md border border-divider p-1">
        <legend className="sr-only">Time range</legend>
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            aria-pressed={value === r.key}
            onClick={() => onChange(r.key)}
            className={`h-7 rounded-sm px-3 text-xs font-medium transition-colors ${
              value === r.key
                ? 'bg-accent-soft text-accent-soft-foreground'
                : 'text-muted hover:bg-content2 hover:text-foreground'
            }`}
          >
            {r.label}
          </button>
        ))}
      </fieldset>
      <p className="text-[11px] text-muted">Ranges the trends and sparklines, not the totals.</p>
    </div>
  );
}
