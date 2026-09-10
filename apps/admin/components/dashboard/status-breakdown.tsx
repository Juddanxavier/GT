'use client';

import { Activity, Package } from 'lucide-react';
import { Card } from '@heroui/react';

export function StatusBreakdown({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="content-panel border-glass h-full">
      <Card.Header className="pb-1">
        <Card.Title className="text-sm font-semibold flex items-center gap-2">
          <Activity size={15} className="text-muted" />
          Status Distribution
        </Card.Title>
      </Card.Header>
      <Card.Content>
        {data.length > 0 ? (
          <div className="space-y-2.5">
            {data.map((item) => {
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted truncate">{item.name}</span>
                    <span className="text-xs font-semibold text-foreground ml-2 tabular-nums">
                      {item.value}
                      <span className="text-muted/60 font-normal"> · {pct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${pct}%`, opacity: 0.35 + (pct / 100) * 0.65 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[160px] text-muted text-sm">
            <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center mb-2">
              <Package size={16} className="text-muted/40" />
            </div>
            No status data yet
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
