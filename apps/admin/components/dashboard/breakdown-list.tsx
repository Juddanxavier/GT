'use client';

import type { LucideIcon } from 'lucide-react';
import { Card } from '@heroui/react';

export function BreakdownList({
  title,
  icon: Icon,
  items,
  emptyLabel,
  limit = 6,
  className,
}: {
  title: string;
  icon: LucideIcon;
  items: { name: string; value: number }[];
  emptyLabel: string;
  /** Rows to draw before clipping — bento tiles are short, panels are not. */
  limit?: number;
  /** Bento span classes, when the list sits on a board. */
  className?: string;
}) {
  const maxVal = Math.max(...items.map((x) => x.value), 1);

  return (
    <Card
      className={`content-panel border-0 h-full overflow-hidden p-4 ${className ?? ''}`.trim()}
    >
      <Card.Header className="pb-1">
        <Card.Title className="text-[13px] font-semibold flex items-center gap-2 text-foreground/80">
          <Icon size={15} className="text-muted" />
          {title}
        </Card.Title>
      </Card.Header>
      <Card.Content>
        {items.length > 0 ? (
          <div className="space-y-2.5">
            {items.slice(0, limit).map((item) => {
              const pct = (item.value / maxVal) * 100;
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-foreground truncate">{item.name}</span>
                    <span className="text-muted bg-default-100 px-2 py-0.5 rounded-full text-[11px] tabular-nums">
                      {item.value}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-default-100">
                    <div
                      className="stripe-lime h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted text-xs">
            <Icon size={20} className="mb-2 opacity-40" />
            {emptyLabel}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
