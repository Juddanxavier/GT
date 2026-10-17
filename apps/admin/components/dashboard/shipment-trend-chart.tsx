'use client';

import { Card } from '@heroui/react';

function TrendBars({
  data,
  height = 190,
}: {
  data: { date: string; shipments: number }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.shipments), 1);
  const mid = Math.round(max / 2);
  const dayLabel = (iso: string) => {
    const date = new Date(`${iso}T00:00:00`);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <div className="flex gap-3">
      {/* Value axis. Offset by the same margin as the plot so the ticks line up
          with the gridlines instead of the padded box. */}
      <div
        className="mt-3.5 flex w-8 shrink-0 flex-col justify-between text-[9px] leading-none tabular-nums text-muted"
        style={{ height }}
        aria-hidden="true"
      >
        <span>{max}</span>
        <span>{mid}</span>
        <span>0</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative mt-3.5" style={{ height }}>
          {/* Light gridlines — no heavy axis lines. */}
          <div
            className="pointer-events-none absolute inset-0 flex flex-col justify-between"
            aria-hidden="true"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="h-px w-full bg-divider" />
            ))}
          </div>

          {/* Bars are solid lime; each carries its own value so nothing hides
              behind a hover. The sr-only summary above the chart is the
              accessible version of this. */}
          <div className="relative z-10 flex h-full items-end gap-1.5" aria-hidden="true">
            {data.map((d) => {
              const pct = (d.shipments / max) * 100;
              return (
                <div
                  key={d.date}
                  className="group relative flex h-full min-w-0 flex-1 items-end justify-center"
                >
                  <span
                    className="absolute left-0 right-0 hidden text-center text-[9px] leading-none tabular-nums text-muted sm:block"
                    style={{ bottom: `calc(${pct}% + 3px)` }}
                  >
                    {d.shipments}
                  </span>
                  <div
                    className="w-full min-h-[3px] rounded-t-[3px] transition-[filter] duration-150 group-hover:brightness-95"
                    style={{
                      height: `${pct}%`,
                      background: 'linear-gradient(to top, var(--accent-hover), var(--accent))',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Baseline. */}
        <div className="mt-1.5 h-px w-full bg-divider" aria-hidden="true" />

        <div className="mt-1 flex gap-1.5" aria-hidden="true">
          {data.map((d) => (
            <span
              key={d.date}
              className="min-w-0 flex-1 truncate text-center text-[9px] leading-none text-[#B0B0B0]"
            >
              {dayLabel(d.date)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ShipmentTrendChart({
  data,
  title = 'Shipment Volume',
}: {
  data: { date: string; shipments: number }[];
  title?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.shipments, 0);
  const peak = data.reduce((m, d) => Math.max(m, d.shipments), 0);
  const avg = data.length > 0 ? Math.round(total / data.length) : 0;

  const stats: [string, number][] = [
    ['Total', total],
    ['Avg / day', avg],
    ['Peak', peak],
  ];

  return (
    <Card className="content-panel border-0 h-full">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-5 pt-5 pb-3">
        <Card.Title className="text-base font-medium text-foreground">{title}</Card.Title>
        {data.length > 0 && (
          <div className="flex items-end gap-5">
            {stats.map(([label, value]) => (
              <div key={label} className="text-right">
                <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted/70">
                  {label}
                </div>
                <div className="text-sm font-semibold tabular-nums text-foreground">
                  {value.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Card.Content className="px-5 pb-5">
        {data.length > 0 ? (
          <>
            <p className="sr-only">
              Daily shipments over {data.length} days: {total} total, averaging {avg} per day,
              peaking at {peak}.
            </p>
            <TrendBars data={data} />
          </>
        ) : (
          <div className="flex h-[190px] items-center justify-center text-sm text-muted">
            No shipment data yet
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
