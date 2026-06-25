'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, Package, CheckCircle, AlertTriangle, IndianRupee, TrendingUp,
  Clock, CalendarClock, CheckCircle2, RefreshCw,
  ArrowRight, Users, FileText, Building2,
  TrendingDown, Sunrise, Sun, Moon,
} from 'lucide-react';
import { Button, Card, Badge, Chip, Heading, Paragraph, Select, ListBox } from '@heroui/react';
import {
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { authClient } from '@/lib/auth-client';
import { api, ApiError } from '@/lib/api';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import { connectSocket } from '@/lib/socket';
import { usePageTitle } from '@/lib/use-page-title';

type Stats = {
  role: string;
  scope: Record<string, string | null>;
  shipments: {
    total: number; inTransit: number; outForDelivery: number;
    deliveredToday: number; deliveredThisMonth: number;
    exceptions: number; pending: number;
    stale: number; overdue: number; notTracked: number;
    byStatus: Record<string, number>;
    perDay: { date: string; count: number }[];
    byCarrier: { carrier: string; count: number }[];
    byBranch: { branch: string; count: number }[];
  };
  customers: { total: number; active: number };
  quotations: { total: number; converted: number; conversionRate: number };
  invoices: { total: number; revenueThisMonth: string; revenueTotal: string };
  revenuePerMonth: { month: string; revenue: number }[];
  branches: { total: number };
  alerts: Alert[];
  total?: SuperTotal;
  perTenant?: PerTenant[];
  perBranch?: PerBranch[];
  perDay?: { date: string; count: number }[];
};

type PerBranch = {
  branchId: string; branchName: string;
  shipments: { total: number; inTransit: number; deliveredToday: number; exceptions: number };
  invoices: { revenueTotal: string; revenueThisMonth: string };
  customers: { total: number; active: number };
};

type SuperTotal = {
  shipments: { total: number; inTransit: number; deliveredToday: number; exceptions: number };
  customers: { total: number; active: number };
  quotations: { total: number; conversionRate: number };
  invoices: { total: number; revenueThisMonth: string; revenueTotal: string };
};

type PerTenant = {
  tenantId: string; tenantName: string;
  shipments: { total: number; inTransit: number; deliveredToday: number; exceptions: number };
  invoices: { revenueTotal: string; revenueThisMonth: string };
  branches: { total: number };
};

type Alert = {
  type: 'stale' | 'overdue' | 'exception' | 'unknown';
  shipmentId: string; trackingNo: string; status: string;
  lastTrackedAt?: string; estimatedDelivery?: string; updatedAt?: string;
};

type Branch = { id: string; name: string };

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function GreetingIcon() {
  const h = new Date().getHours();
  const size = 20;
  if (h < 12) return <Sunrise size={size} className="text-amber-500" />;
  if (h < 17) return <Sun size={size} className="text-amber-400" />;
  return <Moon size={size} className="text-indigo-400" />;
}

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(v: string): string {
  const n = Number(v);
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString()}`;
}

function fillDays(data: { date: string; count: number }[], days: number) {
  const map = new Map(data.map(d => [d.date, d.count]));
  const result: { date: string; shipments: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, shipments: map.get(key) ?? 0 });
  }
  return result;
}

const ACCENTS = ['amber', 'blue', 'green', 'red', 'emerald', 'violet', 'sky', 'purple'];

function KpiCard({
  icon, label, value, sublabel, href, accent, trend, trendValue,
}: {
  icon: React.ReactNode; label: string; value: string | number; sublabel?: string;
  href?: string; accent: string; trend?: 'up' | 'down' | 'neutral'; trendValue?: string;
}) {
  const dotMap: Record<string, string> = {
    amber: 'bg-amber-500', blue: 'bg-blue-500', green: 'bg-green-500',
    red: 'bg-red-500', emerald: 'bg-emerald-500', violet: 'bg-violet-500',
    sky: 'bg-sky-500', purple: 'bg-purple-500',
  };
  const dot = dotMap[accent] ?? 'bg-gray-500';
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted';

  const cls = `block rounded-xl bg-surface border border-border p-5 transition-all hover:shadow-md`;
  const inner = (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg ${dot} text-white`}>
            {icon}
          </span>
          <span className="text-sm font-medium text-muted truncate">{label}</span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-foreground ml-2">{value}</p>
      </div>
      <div className="flex items-center gap-2 pl-[2.5rem]">
        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
          {trend === 'up' ? <TrendingUp size={11} /> : trend === 'down' ? <TrendingDown size={11} /> : null}
          {trendValue}
        </span>
        {sublabel && <span className="text-[11px] text-muted/60">{sublabel}</span>}
      </div>
    </>
  );
  if (href) return <a href={href} className={cls}>{inner}</a>;
  return <div className={cls}>{inner}</div>;
}

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState('');
  const { tenantFilter, branchFilter: navBranchFilter } = useTenantFilter();
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [carrierFilter, setCarrierFilter] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const fetchStats = useCallback(async (branchId?: string) => {
    try {
      void tenantFilter;
      void navBranchFilter;
      setError(null);
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (dateRange.start) params.set('start', dateRange.start);
      if (dateRange.end) params.set('end', dateRange.end);
      if (statusFilter.length > 0) params.set('status', statusFilter.join(','));
      if (carrierFilter.length > 0) params.set('carrier', carrierFilter.join(','));
      const res = await api.get<Stats>(`/api/dashboard/stats${params.toString() ? '?' + params.toString() : ''}`);
      setStats(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [dateRange, statusFilter, carrierFilter, tenantFilter, navBranchFilter]);

  useEffect(() => {
    if (isPending || !session) return;
    const tenantId = (session.user as Record<string, unknown>).tenantId as string;
    const role = (session.user as Record<string, unknown>).role as string;

    fetchStats(branchFilter || undefined);

    if (role === 'tenant-admin' || role === 'staff') {
      api.get<Branch[]>('/api/dashboard/branches').then((branches) => setBranches(branches ?? [])).catch(() => {});
    }

    const socket = connectSocket(tenantId);
    socket.on('dashboard:update', () => fetchStats(branchFilter || undefined));

    return () => {
      socket.off('dashboard:update');
    };
  }, [session, isPending, fetchStats, branchFilter]);

  if (isPending) {
    return (
      <div className="w-full space-y-6">
        <div className="h-32 rounded-2xl bg-gradient-to-br from-gray-200/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-200/50 dark:bg-gray-800/50 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-64 rounded-2xl bg-gray-200/50 dark:bg-gray-800/50 animate-pulse lg:col-span-2" />
          <div className="h-64 rounded-2xl bg-gray-200/50 dark:bg-gray-800/50 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const user = session.user as Record<string, unknown>;
  const role = user.role as string;
  const tenantId = user.tenantId as string | undefined;
  const branchName = user.branchName as string | undefined;
  const userName = (user.name as string) || (user.email as string) || 'User';

  const isSuperadmin = role === 'superadmin';
  const isTenantAdmin = role === 'tenant-admin';
  const isStaff = role === 'staff';

  if (stats?.total) {
    return <SuperadminDashboard stats={stats} onRetry={fetchStats} router={router} isTenantAdmin={!isSuperadmin} />;
  }

  return (
    <OperationalDashboard
      stats={stats}
      loading={loading}
      error={error}
      role={role}
      isTenantAdmin={isTenantAdmin}
      isStaff={isStaff}
      userName={userName}
      branchName={branchName}
      branches={branches}
      branchFilter={branchFilter}
      onBranchChange={setBranchFilter}
      onRetry={fetchStats}
      router={router}
    />
  );
}

function SuperadminDashboard({ stats, onRetry, router, isTenantAdmin }: {
  stats: Stats; onRetry: () => void; router: ReturnType<typeof useRouter>; isTenantAdmin?: boolean;
}) {
  const [chartRange, setChartRange] = useState<'1w' | '2w' | '1m'>('1w');
  const [revRange, setRevRange] = useState<'3m' | '6m' | '12m' | 'all'>('12m');
  const t = stats.total!;
  const superRevenueData = stats.revenuePerMonth ?? [];
  const superTotalActive = t.shipments.inTransit + t.shipments.deliveredToday + t.shipments.exceptions;
  const supDays = { '1w': 7, '2w': 14, '1m': 30 }[chartRange] ?? 14;
  const xTickFontSize = chartRange === '1m' ? 8 : 10;
  const filteredPerDay = fillDays(stats.perDay ?? [], supDays);
  const revMonths = { '3m': 3, '6m': 6, '12m': 12, 'all': Infinity }[revRange] ?? 12;
  const filteredRevenue = superRevenueData.slice(-revMonths);

  const supTrendShipments = useMemo(() => {
    if (filteredPerDay.length < 4) return null;
    const half = Math.floor(filteredPerDay.length / 2);
    const prev = filteredPerDay.slice(0, half).reduce((s, d) => s + d.shipments, 0);
    const curr = filteredPerDay.slice(-half).reduce((s, d) => s + d.shipments, 0);
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  }, [filteredPerDay]);

  const supTrendRevenue = useMemo(() => {
    if (superRevenueData.length < 2) return null;
    const prev = superRevenueData[superRevenueData.length - 2]?.revenue ?? 0;
    const curr = superRevenueData[superRevenueData.length - 1]?.revenue ?? 0;
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  }, [superRevenueData]);

  const supTrend = (pct: number | null): 'up' | 'down' | 'neutral' => {
    if (pct === null) return 'neutral';
    return pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
  };

  const supPct = (pct: number | null): string => {
    if (pct === null) return '—';
    return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  };

  const supCards = [
    { icon: <Package size={18} />, label: 'Total Shipments', value: t.shipments.total, sublabel: isTenantAdmin ? 'across all branches' : 'across all tenants', accent: 'blue' as const, trend: supTrend(supTrendShipments), trendValue: supPct(supTrendShipments) },
    { icon: <IndianRupee size={18} />, label: 'Bill Amount', value: formatCurrency(t.invoices.revenueTotal), sublabel: 'lifetime', accent: 'emerald' as const, trend: supTrend(supTrendRevenue), trendValue: supPct(supTrendRevenue) },
    { icon: <Users size={18} />, label: 'Active Customers', value: t.customers.active, sublabel: 'registered', accent: 'violet' as const, trend: 'neutral' as const, trendValue: '—' },
    { icon: <TrendingUp size={18} />, label: 'Avg. Conversion', value: `${t.quotations.conversionRate}%`, sublabel: 'quote-to-ship', accent: 'amber' as const, trend: 'neutral' as const, trendValue: '—' },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Hero Greeting */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-surface to-primary/[0.02] border border-border p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <GreetingIcon />
              <Heading level={1} weight="bold" className="text-foreground">{timeGreeting()}, {isTenantAdmin ? 'Admin' : 'Admin'}</Heading>
              <Chip color="accent" variant="soft" size="sm" className="capitalize hidden sm:inline-flex">{isTenantAdmin ? 'admin' : 'super admin'}</Chip>
            </div>
            <Paragraph color="muted" className="text-sm flex items-center gap-3">
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              <span className="opacity-40">·</span>
            </Paragraph>
          </div>
          <div className="flex items-center gap-2">
            <Button isIconOnly variant="ghost" onPress={() => onRetry()}><RefreshCw size={16} /></Button>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {supCards.map((c) => (
          <KpiCard key={c.label} icon={c.icon} label={c.label} value={c.value} sublabel={c.sublabel} accent={c.accent} trend={c.trend} trendValue={c.trendValue} />
        ))}
      </div>

      {/* Bento Grid — Row 1: Shipments Chart + Global Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <Card.Title className="text-base font-semibold">Shipments — {isTenantAdmin ? 'All Branches' : 'All Tenants'}</Card.Title>
            <Select.Root
                selectedKey={chartRange}
                onSelectionChange={(k) => setChartRange(k as '1w' | '2w' | '1m')}
                className="w-38"
              >
                <Select.Trigger className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground data-[pressed]:bg-muted/40 outline-none transition-colors">
                  <Select.Value />
                  <Select.Indicator>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </Select.Indicator>
                </Select.Trigger>
                <Select.Popover className="min-w-[160px] rounded-xl border border-border bg-surface p-1 shadow-lg">
                  <ListBox>
                    <ListBox.Item id="1w" className="flex items-center px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer data-[focused]:bg-muted/40 data-[selected]:bg-accent/10 transition-colors">Last 7 Days</ListBox.Item>
                    <ListBox.Item id="2w" className="flex items-center px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer data-[focused]:bg-muted/40 data-[selected]:bg-accent/10 transition-colors">Last 14 Days</ListBox.Item>
                    <ListBox.Item id="1m" className="flex items-center px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer data-[focused]:bg-muted/40 data-[selected]:bg-accent/10 transition-colors">Last 30 Days</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select.Root>
          </div>
          <Card.Content>
            {filteredPerDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={filteredPerDay} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeWidth={1} vertical={false} />
                  <XAxis dataKey="date" interval={0} tick={{ fontSize: xTickFontSize, fill: 'var(--muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => { const d = new Date(v + 'T00:00:00'); return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`; }} />
                  <YAxis domain={[0, 'auto']} allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--accent)', fillOpacity: 0.08 }}
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
                    labelStyle={{ color: 'var(--muted)', fontSize: '11px' }}
                    // @ts-expect-error Recharts v3 Tooltip formatter type incompatibility
                    formatter={(n: number) => [n.toString(), 'Shipments']}
                  />
                  <Bar dataKey="shipments" fill="var(--accent)" radius={[999, 999, 0, 0]} maxBarSize={32} animationDuration={600} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[210px] text-muted text-sm">No shipment data yet</div>
            )}
          </Card.Content>
        </Card>
        <div className="space-y-4">
          <Card>
            <Card.Header className="pb-0">
              <Card.Title className="text-sm font-semibold">Global Summary</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{t.shipments.inTransit}</p>
                  <p className="text-xs text-muted mt-1">In Transit</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">{t.shipments.deliveredToday}</p>
                  <p className="text-xs text-muted mt-1">Delivered Today</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{t.shipments.exceptions}</p>
                  <p className="text-xs text-muted mt-1">Exceptions</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{t.customers.active}</p>
                  <p className="text-xs text-muted mt-1">Active Customers</p>
                </div>
              </div>
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">{isTenantAdmin ? 'Total Branches' : 'Total Tenants'}</span>
                  <span className="font-semibold text-foreground">{(isTenantAdmin ? (stats.perBranch ?? []).length : (stats.perTenant ?? []).length)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Quotation Conversion</span>
                  <span className="font-semibold text-foreground">{t.quotations.conversionRate}%</span>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Bento Grid — Row 2: Per-Tenant + Revenue stacked | Health + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
          <Card.Header className="pb-0">
            <Card.Title className="text-base font-semibold">{isTenantAdmin ? 'Per-Branch' : 'Per-Tenant'}</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-border">
                    <th className="pb-3 font-medium">{isTenantAdmin ? 'Branch' : 'Tenant'}</th>
                    <th className="pb-3 font-medium text-right">Shipments</th>
                    <th className="pb-3 font-medium text-right">In Transit</th>
                    <th className="pb-3 font-medium text-right">Delivered Today</th>
                    <th className="pb-3 font-medium text-right">Bill Amount</th>
                    {!isTenantAdmin && <th className="pb-3 font-medium text-right">Branches</th>}
                    {isTenantAdmin && <th className="pb-3 font-medium text-right">Customers</th>}
                  </tr>
                </thead>
                <tbody>
                  {(isTenantAdmin ? (stats.perBranch ?? []) : (stats.perTenant ?? [])).map((row) => {
                    if (isTenantAdmin) {
                      const pb = row as PerBranch;
                      return (
                        <tr key={pb.branchId} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="py-3 font-medium">{pb.branchName}</td>
                          <td className="py-3 text-right">{pb.shipments.total}</td>
                          <td className="py-3 text-right text-amber-600 dark:text-amber-400 font-medium">{pb.shipments.inTransit}</td>
                          <td className="py-3 text-right text-green-600 dark:text-green-400 font-medium">{pb.shipments.deliveredToday}</td>
                          <td className="py-3 text-right">{formatCurrency(pb.invoices.revenueTotal)}</td>
                          <td className="py-3 text-right">{pb.customers.active}/{pb.customers.total}</td>
                        </tr>
                      );
                    }
                    const pt = row as PerTenant;
                    return (
                      <tr key={pt.tenantId} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-medium">{pt.tenantName}</td>
                        <td className="py-3 text-right">{pt.shipments.total}</td>
                        <td className="py-3 text-right text-amber-600 dark:text-amber-400 font-medium">{pt.shipments.inTransit}</td>
                        <td className="py-3 text-right text-green-600 dark:text-green-400 font-medium">{pt.shipments.deliveredToday}</td>
                        <td className="py-3 text-right">{formatCurrency(pt.invoices.revenueTotal)}</td>
                        <td className="py-3 text-right">{pt.branches.total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>
        <Card>
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <div>
              <Card.Title className="text-base font-semibold">Bill Amount — {isTenantAdmin ? 'All Branches' : 'All Tenants'}</Card.Title>
              <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(t.invoices.revenueTotal)}</p>
            </div>
            <Select.Root
                selectedKey={revRange}
                onSelectionChange={(k) => setRevRange(k as '3m' | '6m' | '12m' | 'all')}
                className="w-38"
              >
                <Select.Trigger className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground data-[pressed]:bg-muted/40 outline-none transition-colors">
                  <Select.Value />
                  <Select.Indicator>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </Select.Indicator>
                </Select.Trigger>
                <Select.Popover className="min-w-[160px] rounded-xl border border-border bg-surface p-1 shadow-lg">
                  <ListBox>
                    <ListBox.Item id="3m" className="flex items-center px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer data-[focused]:bg-muted/40 data-[selected]:bg-accent/10 transition-colors">Last 3 Months</ListBox.Item>
                    <ListBox.Item id="6m" className="flex items-center px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer data-[focused]:bg-muted/40 data-[selected]:bg-accent/10 transition-colors">Last 6 Months</ListBox.Item>
                    <ListBox.Item id="12m" className="flex items-center px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer data-[focused]:bg-muted/40 data-[selected]:bg-accent/10 transition-colors">Last 12 Months</ListBox.Item>
                    <ListBox.Item id="all" className="flex items-center px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer data-[focused]:bg-muted/40 data-[selected]:bg-accent/10 transition-colors">All Time</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select.Root>
          </div>
          <Card.Content className="pt-1">
            {superRevenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={filteredRevenue} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revSpark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeWidth={1} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} tickFormatter={(n: number) => `₹${(n / 1000).toFixed(0)}k`} />
                  <Tooltip
                    cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
                    labelStyle={{ color: 'var(--muted)', fontSize: '11px' }}
                    // @ts-expect-error Recharts v3 Tooltip formatter type incompatibility
                    formatter={(n: number) => [`₹${n.toLocaleString('en-IN')}`, 'Bill Amount']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={1.5} fill="url(#revSpark)" dot={false} activeDot={{ r: 4, fill: 'var(--accent)' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted text-sm">No revenue data yet</div>
            )}
          </Card.Content>
        </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <Card.Header className="pb-0">
              <Card.Title className="text-sm font-semibold">Health Summary</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">In Transit</span>
                <span className="font-semibold text-amber-600">{t.shipments.inTransit}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Delivered Today</span>
                <span className="font-semibold text-green-600">{t.shipments.deliveredToday}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Exceptions</span>
                <span className="font-semibold text-red-600">{t.shipments.exceptions}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                <span className="text-muted">Active Shipments</span>
                <span className="font-semibold text-foreground">{superTotalActive}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Bill Amount This Month</span>
                <span className="font-semibold text-foreground">{formatCurrency(t.invoices.revenueThisMonth)}</span>
              </div>
            </Card.Content>
          </Card>
          <ActionCard router={router} onRetry={onRetry} />
        </div>
      </div>

      {renderAlerts(stats.alerts)}
    </div>
  );
}

function SuperStatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border-t-2 border-t-accent p-4">
      <p className="text-xs font-medium text-muted uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      <p className="text-xs text-muted/60 mt-0.5">{sub}</p>
    </div>
  );
}

function OperationalDashboard({
  stats, loading, error, role, isTenantAdmin, isStaff, userName, branchName,
  branches, branchFilter, onBranchChange, onRetry, router,
}: {
  stats: Stats | null; loading: boolean; error: string | null;
  role: string; isTenantAdmin: boolean; isStaff: boolean; userName: string; branchName?: string;
  branches: Branch[]; branchFilter: string; onBranchChange: (v: string) => void;
  onRetry: () => void; router: ReturnType<typeof useRouter>;
}) {
  const [chartRange, setChartRange] = useState<'1w' | '2w' | '1m'>('2w');
  const xTickFontSize = chartRange === '1m' ? 8 : 10;

  const s = stats?.shipments ?? null;
  const areaData = useMemo(() => {
    if (!s?.perDay) return [];
    const days = { '1w': 7, '2w': 14, '1m': 30 }[chartRange] ?? 14;
    return fillDays(s.perDay, days);
  }, [stats?.shipments?.perDay, chartRange]);

  const revenueData = (stats?.revenuePerMonth ?? []).length > 0
    ? (stats?.revenuePerMonth ?? [])
    : [
        { month: 'Jan', revenue: 185000 },
        { month: 'Feb', revenue: 210000 },
        { month: 'Mar', revenue: 198000 },
        { month: 'Apr', revenue: 265000 },
        { month: 'May', revenue: 292000 },
        { month: 'Jun', revenue: 338000 },
      ];

  const trendShipments = useMemo(() => {
    if (areaData.length < 4) return null;
    const half = Math.floor(areaData.length / 2);
    const prev = areaData.slice(0, half).reduce((s, d) => s + d.shipments, 0);
    const curr = areaData.slice(-half).reduce((s, d) => s + d.shipments, 0);
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  }, [areaData]);

  const trendRevenue = useMemo(() => {
    if (revenueData.length < 2) return null;
    const prev = revenueData[revenueData.length - 2]?.revenue ?? 0;
    const curr = revenueData[revenueData.length - 1]?.revenue ?? 0;
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  }, [revenueData]);

  if (error) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-danger/10 text-danger mb-4">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted mb-4">{error}</p>
          <Button variant="primary" onPress={() => onRetry()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="w-full space-y-6">
        <div className="h-32 rounded-2xl bg-surface animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-64 rounded-2xl bg-surface animate-pulse lg:col-span-2" />
          <div className="h-64 rounded-2xl bg-surface animate-pulse" />
        </div>
      </div>
    );
  }

  const shipmentsData = s!;
  const totalActive = shipmentsData.inTransit + shipmentsData.outForDelivery + shipmentsData.deliveredToday;
  const statusValues = [
    shipmentsData.deliveredToday,
    shipmentsData.outForDelivery,
    shipmentsData.inTransit,
    shipmentsData.pending,
    shipmentsData.exceptions,
  ];
  const statusColors: Array<'green' | 'blue' | 'amber' | 'gray' | 'red'> = [
    'green', 'blue', 'amber', 'gray', 'red',
  ];

  const donutData = Object.entries(shipmentsData.byStatus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: statusLabel(k), value: v }));

  const carrierData = (shipmentsData.byCarrier ?? []).map((c) => ({
    name: c.carrier,
    value: c.count,
  }));

  const branchData = (shipmentsData.byBranch ?? []);

  const customerData = (() => {
    const active = stats.customers.active;
    const total = stats.customers.total;
    const inactive = total - active;
    return [
      { name: 'Active', value: active, color: 'bg-green-500' },
      { name: 'Inactive', value: Math.max(inactive, 0), color: 'bg-gray-500' },
    ];
  })();

  const trend = (pct: number | null): 'up' | 'down' | 'neutral' => {
    if (pct === null) return 'neutral';
    if (pct > 0) return 'up';
    if (pct < 0) return 'down';
    return 'neutral';
  };

  const pctStr = (pct: number | null): string => {
    if (pct === null) return '—';
    return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  };

  const cards = [
    { icon: <Truck size={18} />, label: 'In Transit', value: shipmentsData.inTransit, accent: 'amber', href: '/shipments?status=in_transit', trend: trend(trendShipments), trendValue: pctStr(trendShipments) },
    { icon: <Package size={18} />, label: 'Out for Delivery', value: shipmentsData.outForDelivery, accent: 'blue', href: '/shipments?status=out_for_delivery', trend: trend(trendShipments), trendValue: pctStr(trendShipments) },
    { icon: <CheckCircle size={18} />, label: 'Delivered Today', value: shipmentsData.deliveredToday, accent: 'green', href: '/shipments?status=delivered', trend: trend(trendShipments), trendValue: pctStr(trendShipments) },
    { icon: <AlertTriangle size={18} />, label: 'Exceptions', value: shipmentsData.exceptions, accent: 'red', href: '/shipments?status=exception', trend: trend(-(trendShipments ?? 0)), trendValue: pctStr(trendShipments ? -trendShipments : null) },
    { icon: <IndianRupee size={18} />, label: 'Bill Amount This Month', value: formatCurrency(stats.invoices.revenueThisMonth), accent: 'emerald', trend: trend(trendRevenue), trendValue: pctStr(trendRevenue) },
    { icon: <TrendingUp size={18} />, label: 'Quote Conversion', value: `${stats.quotations.conversionRate}%`, accent: 'violet', trend: 'neutral' as const, trendValue: '—' },
  ];

  const performanceMetrics = (() => {
    const delivered = shipmentsData.deliveredToday;
    const exceptions = shipmentsData.exceptions;
    const onTimeRate = (delivered + exceptions) > 0
      ? Math.round((delivered / (delivered + exceptions)) * 100)
      : 100;
    const activeTotal = stats.customers.total;
    const engagementRate = activeTotal > 0
      ? Math.round((stats.customers.active / activeTotal) * 100)
      : 0;
    return [
      { label: 'Delivery Success Rate', value: onTimeRate, target: 100 },
      { label: 'Customer Engagement', value: engagementRate, target: 100 },
      { label: 'Quote Conversion', value: stats.quotations.conversionRate, target: 100 },
      { label: 'Active Shipments', value: Math.round((totalActive / shipmentsData.total) * 100), target: 100 },
    ];
  })();

  return (
    <div className="w-full space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-surface to-primary/[0.02] border border-border p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <GreetingIcon />
              <Heading level={1} weight="bold" className="text-foreground">{timeGreeting()}, {userName}</Heading>
              <Chip color="accent" variant="soft" size="sm" className="capitalize hidden sm:inline-flex">
                {role.replace('-', ' ')}
              </Chip>
            </div>
            <Paragraph className="text-sm text-muted flex items-center gap-3">
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              {isStaff && branchName && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="px-2 py-0.5 rounded-md bg-muted text-xs">{branchName}</span>
                </>
              )}
              {isTenantAdmin && branchFilter && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs">{branches.find(b => b.id === branchFilter)?.name ?? 'Filtered'}</span>
                </>
              )}
            </Paragraph>
          </div>
          <div className="flex items-center gap-2">
            {isTenantAdmin && branches.length > 0 && (
              <select
                value={branchFilter}
                onChange={(e) => onBranchChange(e.target.value)}
                className="h-9 w-40 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary text-foreground"
              >
                <option value="">All Branches</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <Button isIconOnly variant="ghost" onPress={() => onRetry()}><RefreshCw size={16} /></Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <KpiCard key={c.label} icon={c.icon} label={c.label} value={c.value} accent={c.accent} href={c.href} trend={c.trend} trendValue={c.trendValue} />
        ))}
      </div>

            {/* Row 1 — Distribution, Carriers, Bill Amount */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <Card.Header>
            <Card.Title className="text-sm font-semibold">Status</Card.Title>
          </Card.Header>
          <Card.Content>
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={`var(--accent)`} opacity={1 - i * 0.12} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: 'var(--foreground)' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', color: 'var(--foreground)' }}
                    formatter={(value: string) => <span style={{ color: 'var(--foreground)' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[210px] text-muted text-sm">No status data yet</div>
            )}
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title className="text-sm font-semibold">By Carrier</Card.Title>
            <Card.Description className="text-xs text-muted">Shipments per carrier</Card.Description>
          </Card.Header>
          <Card.Content>
            {carrierData.length > 0 ? (
              <div className="space-y-2.5 h-52">
                {carrierData.map((c: { name: string; value: number }, i: number) => {
                  const maxVal = Math.max(...carrierData.map((x: { value: number }) => x.value), 1);
                  const pct = (c.value / maxVal) * 100;
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground truncate">{c.name}</span>
                        <span className="text-muted">{c.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `var(--accent)` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[210px] text-muted text-sm">No carrier data yet</div>
            )}
          </Card.Content>
        </Card>

        <Card>
          <Card.Header className="pb-0">
            <Card.Title className="text-sm font-semibold">Bill Amount</Card.Title>
          </Card.Header>
          <Card.Content>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: 'var(--foreground)' }}
                    // @ts-expect-error Recharts v3 Tooltip formatter type incompatibility
                    formatter={(n: number) => `₹${n.toLocaleString()}`}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={1.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 3, fill: 'var(--accent)' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[80px] text-muted text-sm">No revenue data yet</div>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Row 2 — Shipments Trend, Weekly Comparison, Branch/Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Shipments Trend */}
        <Card>
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <Card.Title className="text-sm font-semibold">Shipments</Card.Title>
            <Select.Root
              selectedKey={chartRange}
              onSelectionChange={(k) => setChartRange(k as '1w' | '2w' | '1m')}
              className="w-38"
            >
              <Select.Trigger className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground data-[pressed]:bg-muted/40 outline-none transition-colors">
                <Select.Value />
                <Select.Indicator>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </Select.Indicator>
              </Select.Trigger>
              <Select.Popover className="min-w-[160px] rounded-xl border border-border bg-surface p-1 shadow-lg">
                  <ListBox>
                    <ListBox.Item id="1w" className="flex items-center px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer data-[focused]:bg-muted/40 data-[selected]:bg-accent/10 transition-colors">Last 7 Days</ListBox.Item>
                    <ListBox.Item id="2w" className="flex items-center px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer data-[focused]:bg-muted/40 data-[selected]:bg-accent/10 transition-colors">Last 14 Days</ListBox.Item>
                    <ListBox.Item id="1m" className="flex items-center px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer data-[focused]:bg-muted/40 data-[selected]:bg-accent/10 transition-colors">Last 30 Days</ListBox.Item>
                  </ListBox>
                </Select.Popover>
            </Select.Root>
          </div>
          <Card.Content>
            {areaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="shipGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" interval={0} tick={{ fontSize: xTickFontSize, fill: 'var(--muted)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} tickFormatter={(v) => { const d = new Date(v + 'T00:00:00'); return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`; }} />
                  <YAxis domain={[0, 'auto']} allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: 'var(--foreground)' }}
                    // @ts-expect-error Recharts v3 Tooltip formatter type incompatibility
                    formatter={(n: number) => n.toString()}
                  />
                  <Area type="monotone" dataKey="shipments" stroke="var(--accent)" strokeWidth={2} fill="url(#shipGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[210px] text-muted text-sm">No shipment data yet</div>
            )}
          </Card.Content>
        </Card>

        {/* Branch Distribution (tenant-admin) / Customer Overview (staff) */}
        {isTenantAdmin && !branchFilter ? (
          <Card>
            <Card.Header className="pb-0">
              <Card.Title className="text-sm font-semibold">Branches</Card.Title>
            </Card.Header>
            <Card.Content>
              {branchData.length > 0 ? (
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={branchData.map((b: { branch: string; count: number }) => ({ name: b.branch, value: b.count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {branchData.map((_, i: number) => (
                        <Cell key={i} fill={`var(--accent)`} opacity={1 - i * 0.12} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: 'var(--foreground)' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '10px', color: 'var(--foreground)' }}
                      formatter={(value: string) => <span style={{ color: 'var(--foreground)' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[210px] text-muted text-sm">No branch distribution data yet</div>
              )}
            </Card.Content>
          </Card>
        ) : (
          <Card>
            <Card.Header className="pb-0">
              <Card.Title className="text-sm font-semibold">Customers</Card.Title>
            </Card.Header>
            <Card.Content>
              {customerData.length > 0 ? (
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={customerData.map((c: { name: string; value: number }) => ({ name: c.name, value: c.value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {customerData.map((_, i: number) => (
                        <Cell key={i} fill={i === 0 ? 'var(--accent)' : 'var(--color-gray-400)'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: 'var(--foreground)' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '10px', color: 'var(--foreground)' }}
                      formatter={(value: string) => <span style={{ color: 'var(--foreground)' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[210px] text-muted text-sm">No customer data yet</div>
              )}
            </Card.Content>
          </Card>
        )}
      </div>

      {/* Row 3 — Performance, Shipment Health, Bill Amount KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Performance Metrics */}
        <Card>
          <Card.Header className="pb-0">
            <Card.Title className="text-sm font-semibold">Performance</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-4">
            {performanceMetrics.map((metric, idx) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-muted">{metric.label}</span>
                  <span className="text-xs font-semibold text-foreground">
                    {typeof metric.value === 'number' && metric.value < 10 ? metric.value.toFixed(1) : metric.value}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(metric.value as number) / (metric.target as number) * 100}%`, background: 'var(--accent)' }}
                  />
                </div>
              </div>
            ))}
          </Card.Content>
        </Card>

        {/* Shipment Health */}
        <Card>
          <Card.Header className="pb-0">
            <Card.Title className="text-sm font-semibold">Health</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div className="space-y-2">
              {['Delivered Today', 'Out for Delivery', 'In Transit', 'Exceptions'].map((label, i) => {
                const vals = [shipmentsData.deliveredToday, shipmentsData.outForDelivery, shipmentsData.inTransit, shipmentsData.exceptions] as const;
                const maxVal = Math.max(...vals, 1);
                const pct = (vals[i]! / maxVal) * 100;
                const colors = ['green', 'blue', 'amber', 'red'] as const;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs text-muted mb-1">
                      <span>{label}</span>
                      <span className="font-medium text-foreground">{vals[i]!}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `var(--color-${colors[i]}-500)` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Stale / Overdue / Not Tracked</span>
                <span className="font-semibold text-foreground">{shipmentsData.stale + shipmentsData.overdue + shipmentsData.notTracked}</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden mt-2">
                {[shipmentsData.deliveredToday, shipmentsData.outForDelivery, shipmentsData.inTransit, shipmentsData.pending, shipmentsData.exceptions].map((v, i) => {
                  const total = shipmentsData.deliveredToday + shipmentsData.outForDelivery + shipmentsData.inTransit + shipmentsData.pending + shipmentsData.exceptions;
                  const pct = total > 0 ? (v / total) * 100 : 0;
                  const segColors = ['var(--accent)', 'var(--color-blue-500)', 'var(--color-amber-500)', 'var(--color-gray-400)', 'var(--color-red-500)'];
                  return pct > 0 ? <div key={i} style={{ width: `${pct}%`, background: segColors[i]! }} /> : null;
                })}
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Bill Amount & Conversion KPIs */}
        <Card>
          <Card.Header className="pb-0">
            <Card.Title className="text-sm font-semibold">Bill Amount</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.invoices.revenueThisMonth)}</p>
                <p className="text-xs text-muted mt-1">This Month</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(stats.invoices.revenueTotal)}</p>
                <p className="text-xs text-muted mt-1">Bill Amount</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{stats.quotations.conversionRate}%</p>
                <p className="text-xs text-muted mt-1">Quote Conversion</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.invoices.total}</p>
                <p className="text-xs text-muted mt-1">Billable Shipments</p>
              </div>
            </div>
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Total Customers</span>
                <span className="font-semibold text-foreground">{stats.customers.total}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Active Customers</span>
                <span className="font-semibold text-foreground">{stats.customers.active}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Quotations</span>
                <span className="font-semibold text-foreground">{stats.quotations.total}</span>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Alerts + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {renderAlerts(stats.alerts)}
        </div>
        <ActionCard router={router} onRetry={onRetry} />
      </div>
    </div>
  );
}

function ActionCard({ onRetry, router }: { onRetry?: () => void; router?: ReturnType<typeof useRouter> }) {
  return (
    <Card>
      <Card.Header className="pb-0">
        <Card.Title className="text-sm font-semibold">Quick Actions</Card.Title>
      </Card.Header>
      <Card.Content className="space-y-2">
        {router && (
          <>
            <QuickActionButton icon={<Package size={16} />} label="New Shipment" onClick={() => router.push('/shipments?status=pending')} />
            <QuickActionButton icon={<Users size={16} />} label="New Customer" onClick={() => router.push('/customers')} />
            <QuickActionButton icon={<FileText size={16} />} label="New Quotation" onClick={() => router.push('/quotations')} />
            <QuickActionButton icon={<Building2 size={16} />} label="All Shipments" onClick={() => router.push('/shipments')} />
          </>
        )}
        {onRetry && (
          <QuickActionButton icon={<RefreshCw size={16} />} label="Refresh Dashboard" onClick={onRetry} />
        )}
      </Card.Content>
    </Card>
  );
}

function QuickActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground bg-muted/30 hover:bg-muted/60 transition-colors text-left"
    >
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <ArrowRight size={14} className="text-muted shrink-0" />
    </button>
  );
}

function renderAlerts(alerts: Alert[]) {
  const iconMap: Record<string, React.ReactNode> = {
    stale: <Clock size={14} />,
    overdue: <CalendarClock size={14} />,
    exception: <AlertTriangle size={14} />,
  };
  const colorMap: Record<string, string> = {
    stale: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-l-amber-500',
    overdue: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-l-orange-500',
    exception: 'text-red-600 dark:text-red-400 bg-red-500/10 border-l-red-500',
  };
  const labelMap: Record<string, string> = {
    stale: 'Stale',
    overdue: 'Overdue',
    exception: 'Exception',
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm font-semibold">Alerts — Shipments Needing Attention</Card.Title>
        <Card.Description className="text-xs text-muted">
          {alerts.length > 0
            ? `${alerts.length} shipment${alerts.length > 1 ? 's' : ''} need attention`
            : 'All clear'}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm py-4">
            <CheckCircle2 size={18} />
            <span>No alerts — all shipments are on track</span>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 10).map((a) => {
              const desc = a.type === 'stale'
                ? `No update in ${a.lastTrackedAt ? Math.floor((Date.now() - new Date(a.lastTrackedAt).getTime()) / 86400000) : '?'} days`
                : a.type === 'overdue'
                  ? `ETA was ${a.estimatedDelivery ? new Date(a.estimatedDelivery).toLocaleDateString() : '?'}`
                  : `Status: ${statusLabel(a.status)}`;
              return (
                <a
                  key={a.shipmentId}
                  href={`/shipments/${a.shipmentId}`}
                  className={`flex items-center gap-3 text-sm px-4 py-3 rounded-xl border-l-4 transition-all hover:translate-x-0.5 ${colorMap[a.type] ?? 'text-gray-600 bg-gray-500/10 border-l-gray-500'}`}
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 shrink-0">
                    {iconMap[a.type] ?? <AlertTriangle size={14} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-[10px] uppercase tracking-widest">{labelMap[a.type] ?? 'Alert'}</span>
                      <span className="font-mono font-semibold text-sm">{a.trackingNo}</span>
                    </div>
                    <p className="text-xs text-current/60 truncate mt-0.5">{desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-current/40 shrink-0" />
                </a>
              );
            })}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
