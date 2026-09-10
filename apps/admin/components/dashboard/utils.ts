import { getCurrencySymbol } from '@/lib/currency';
import type { ShipmentTrendRow, Stats } from './types';

const EMPTY_SHIPMENTS: Stats['shipments'] = {
  total: 0,
  inTransit: 0,
  outForDelivery: 0,
  deliveredToday: 0,
  deliveredThisMonth: 0,
  exceptions: 0,
  pending: 0,
  stale: 0,
  overdue: 0,
  notTracked: 0,
  byStatus: {},
  perDay: [],
  byCarrier: [],
  byBranch: [],
};

const SPARKLINE_POINTS = 14;

/** Superadmin aggregate responses may omit `shipments` — normalize before use. */
export function resolveShipments(stats: Stats): Stats['shipments'] {
  if (stats.shipments) return stats.shipments;
  const t = stats.total?.shipments;
  return {
    ...EMPTY_SHIPMENTS,
    total: t?.total ?? 0,
    inTransit: t?.inTransit ?? 0,
    deliveredToday: t?.deliveredToday ?? 0,
    exceptions: t?.exceptions ?? 0,
    perDay: stats.perDay ?? [],
  };
}

export function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalize API/DB date strings to YYYY-MM-DD. */
export function normalizeDateKey(date: string): string {
  const m = date.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m?.[1]) return m[1];
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date.slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

/** Date key for recent calendar windows (UTC, matches PostgreSQL DATE::text). */
export function seriesDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hasSignal(data: number[]) {
  return data.some((v) => v > 0);
}

function padSeries(values: number[], length: number): number[] {
  const out = values.slice(-length);
  while (out.length < length) out.unshift(0);
  return out;
}

/** Last N daily counts from raw perDay rows (works when shipments are older than the calendar window). */
function recentVolumeSeries(
  perDay: { date: string; count: number }[],
  length = SPARKLINE_POINTS,
): number[] {
  const sorted = [...perDay]
    .map((d) => ({
      date: normalizeDateKey(String(d.date)),
      count: Number(d.count) || 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return padSeries(sorted.map((d) => d.count), length);
}

/** Volume data for the main trend chart — uses historical dates when recent window is empty. */
export function chartVolumeData(
  perDay: { date: string; count: number }[],
  days = 30,
): { date: string; shipments: number }[] {
  const calendar = fillDays(perDay, days);
  if (calendar.some((d) => d.shipments > 0)) return calendar;
  return [...perDay]
    .map((d) => ({
      date: normalizeDateKey(String(d.date)),
      shipments: Number(d.count) || 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days);
}

export function fillDays(data: { date: string; count: number }[], days: number) {
  const map = new Map(
    data.map((d) => [normalizeDateKey(String(d.date)), Number(d.count) || 0]),
  );
  const result: { date: string; shipments: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = seriesDateKey(d);
    result.push({ date: key, shipments: map.get(key) ?? 0 });
  }
  return result;
}

/** Calendar window first; falls back to most recent historical per-day counts. */
export function volumeSeries(
  perDay: { date: string; count: number }[] | undefined,
  days = SPARKLINE_POINTS,
): number[] {
  const calendar = fillDays(perDay ?? [], days).map((d) => d.shipments);
  if (hasSignal(calendar)) return calendar;
  return recentVolumeSeries(perDay ?? [], days);
}

type TrendField = 'total' | 'intransit' | 'outfordelivery' | 'delivered' | 'pending' | 'exception';

function recentTrendField(
  trendData: ShipmentTrendRow[],
  field: TrendField,
  length = SPARKLINE_POINTS,
): number[] {
  const sorted = [...trendData].sort((a, b) =>
    normalizeDateKey(String(a.date)).localeCompare(normalizeDateKey(String(b.date))),
  );
  return padSeries(
    sorted.map((r) => Number(r[field]) || 0),
    length,
  );
}

function calendarTrendField(
  trendData: ShipmentTrendRow[],
  field: TrendField,
  days = SPARKLINE_POINTS,
): number[] {
  const map = new Map(trendData.map((r) => [normalizeDateKey(String(r.date)), r]));
  const result: number[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const row = map.get(seriesDateKey(d));
    result.push(Number(row?.[field]) || 0);
  }
  return result;
}

function pickTrendSeries(
  trendData: ShipmentTrendRow[] | undefined,
  perDay: { date: string; count: number }[] | undefined,
  field: TrendField,
  days = SPARKLINE_POINTS,
): number[] {
  const volume = volumeSeries(perDay, days);
  if (!trendData?.length) return volume;

  const calendar = calendarTrendField(trendData, field, days);
  if (hasSignal(calendar)) return calendar;

  const historical = recentTrendField(trendData, field, days);
  if (hasSignal(historical)) return historical;

  return volume;
}

/** Build KPI sparkline series from dashboard stats (trend + per-day volume fallback). */
export function resolveSparklines(
  trendData: ShipmentTrendRow[] | undefined,
  perDay: { date: string; count: number }[] | undefined,
  days = SPARKLINE_POINTS,
) {
  return {
    total: pickTrendSeries(trendData, perDay, 'total', days),
    inTransit: pickTrendSeries(trendData, perDay, 'intransit', days),
    outForDelivery: pickTrendSeries(trendData, perDay, 'outfordelivery', days),
    delivered: pickTrendSeries(trendData, perDay, 'delivered', days),
    pending: pickTrendSeries(trendData, perDay, 'pending', days),
    exceptions: pickTrendSeries(trendData, perDay, 'exception', days),
  };
}

export function formatCurrency(value: string | number, currency?: string | null) {
  const n = Number(value);
  const sym = getCurrencySymbol(currency ?? null);
  if (n >= 100_000) return `${sym}${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `${sym}${(n / 1_000).toFixed(1)}K`;
  return `${sym}${n.toLocaleString()}`;
}

export function trendDir(pct: number | null): 'up' | 'down' | 'neutral' {
  if (pct === null) return 'neutral';
  if (pct > 0) return 'up';
  if (pct < 0) return 'down';
  return 'neutral';
}

export function pctStr(pct: number | null): string {
  if (pct === null) return '—';
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

export function periodTrend(data: { shipments: number }[]): number | null {
  if (data.length < 4) return null;
  const half = Math.floor(data.length / 2);
  const prev = data.slice(0, half).reduce((s, d) => s + d.shipments, 0);
  const curr = data.slice(-half).reduce((s, d) => s + d.shipments, 0);
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}
