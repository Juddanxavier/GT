import { describe, expect, it } from 'vitest';
import {
  chartVolumeData,
  resolveSparklines,
  volumeSeries,
} from '@/components/dashboard/utils';

describe('dashboard sparkline utils', () => {
  const perDay = [
    { date: '2026-01-01', count: 5 },
    { date: '2026-01-15', count: 12 },
    { date: '2026-02-01', count: 6 },
  ];

  it('uses historical volume when recent calendar window is empty', () => {
    const series = volumeSeries(perDay, 14);
    expect(series.some((v) => v > 0)).toBe(true);
    expect(series.filter((v) => v > 0)).toEqual([5, 12, 6]);
    expect(series.length).toBe(14);
  });

  it('chartVolumeData returns historical dates when calendar is empty', () => {
    const data = chartVolumeData(perDay, 30);
    expect(data.length).toBeGreaterThan(0);
    expect(data.some((d) => d.shipments > 0)).toBe(true);
  });

  it('resolveSparklines uses shipmentTrend per field', () => {
    const trend = [
      {
        date: '2026-01-01',
        total: 10,
        intransit: 3,
        outfordelivery: 1,
        delivered: 4,
        pending: 2,
        exception: 0,
      },
      {
        date: '2026-01-15',
        total: 8,
        intransit: 2,
        outfordelivery: 0,
        delivered: 5,
        pending: 1,
        exception: 0,
      },
    ];
    const sparks = resolveSparklines(trend, perDay, 14);
    expect(sparks.total.some((v) => v > 0)).toBe(true);
    expect(sparks.inTransit.some((v) => v > 0)).toBe(true);
    expect(sparks.delivered.some((v) => v > 0)).toBe(true);
  });
});
