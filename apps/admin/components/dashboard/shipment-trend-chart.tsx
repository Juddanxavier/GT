'use client';

import { useState } from 'react';
import { Card, ListBox, Select } from '@heroui/react';
import type { ChartRange } from './types';

function MiniBarChart({
  data,
  height = 190,
}: {
  data: { date: string; shipments: number }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.shipments), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d) => {
        const barH = (d.shipments / max) * 100;
        const date = new Date(`${d.date}T00:00:00`);
        const label = `${date.getDate()}/${date.getMonth() + 1}`;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end min-w-0">
            <span className="text-[9px] font-medium text-foreground leading-tight">{d.shipments}</span>
            <div
              className="w-full rounded-t-md bg-accent transition-all min-h-[2px]"
              style={{ height: `${barH}%` }}
            />
            <span className="text-[8px] text-muted leading-tight">{label}</span>
          </div>
        );
      })}
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
  const [chartRange, setChartRange] = useState<ChartRange>('2w');
  const days = { '1w': 7, '2w': 14, '1m': 30 }[chartRange];
  const sliced = data.slice(-days);

  return (
    <Card className="content-panel border-glass h-full">
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <Card.Title className="text-sm font-semibold">{title}</Card.Title>
        <Select.Root
          selectedKey={chartRange}
          onSelectionChange={(k) => setChartRange(k as ChartRange)}
          className="w-32"
        >
          <Select.Trigger className="h-9 content-panel px-3 text-xs outline-none">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover className="min-w-[140px] content-panel p-1">
            <ListBox>
              <ListBox.Item id="1w">Last 7 days</ListBox.Item>
              <ListBox.Item id="2w">Last 14 days</ListBox.Item>
              <ListBox.Item id="1m">Last 30 days</ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select.Root>
      </div>
      <Card.Content className="px-5 pb-5">
        {sliced.length > 0 ? (
          <MiniBarChart data={sliced} />
        ) : (
          <div className="flex items-center justify-center h-[190px] text-muted text-sm">
            No shipment data yet
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
