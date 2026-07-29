'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, Package, CheckCircle, AlertTriangle, IndianRupee, TrendingUp,
  Clock, CalendarClock, CheckCircle2, RefreshCw, WifiOff, Hourglass,
  ArrowRight, Users, FileText, Building2, Activity,
  TrendingDown, Sunrise, Sun, Moon, LogIn, Bell, Mail,
} from 'lucide-react';
import { Button, Card, Badge, Chip, Heading, Paragraph, Select, ListBox } from '@heroui/react';
import { authClient } from '@/lib/auth-client';
import { api, ApiError } from '@/lib/api';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import { useTenants } from '@/lib/queries';
import { getCurrencySymbol } from '@/lib/currency';
import { connectSocket } from '@/lib/socket';
import { usePageTitle } from '@/lib/use-page-title';
import { getUser } from '@/types/auth';

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
  const dot = dotMap[accent] ?? 'bg-default-400';
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-muted';

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

function MiniBarChart({ data, height = 120 }: { data: { date: string; shipments: number }[]; height?: number }) {
  const max = Math.max(...data.map(d => d.shipments), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d) => {
        const barH = (d.shipments / max) * 100;
        const date = new Date(d.date + 'T00:00:00');
        const label = `${date.getDate()}/${date.getMonth() + 1}`;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
            <span className="text-[9px] font-medium text-foreground leading-tight">{d.shipments}</span>
            <div className="w-full rounded-t-[3px] bg-accent transition-all min-h-[2px]" style={{ height: `${barH}%` }} />
            <span className="text-[8px] text-muted leading-tight">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatusLegend({ data }: { data: { name: string; value: number }[] }) {
  const colors = ['var(--accent)', 'var(--color-blue-500)', 'var(--color-amber-500)', 'var(--color-gray-400)', 'var(--color-red-500)', 'var(--color-green-500)'];
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={item.name} className="flex items-center justify-between py-0.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
            <span className="text-xs text-muted">{item.name}</span>
          </div>
          <span className="text-xs font-semibold text-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function TrendStat({ label, value, trend: t, sub }: { label: string; value: string; trend?: 'up' | 'down'; sub?: string }) {
  return (
    <div className="rounded-xl bg-surface border border-border p-4">
      <p className="text-[11px] text-muted mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-foreground">{value}</span>
        {t && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${t === 'up' ? 'text-success' : 'text-danger'}`}>
            {t === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {sub}
          </span>
        )}
      </div>
    </div>
  );
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
  const { data: tenantsData = [] } = useTenants();
  const sessionTenantId = getUser(session)?.tenantId;
  const effectiveTidForCurrency = tenantFilter || sessionTenantId || '';
  const tenantCurrency = useMemo(() => {
    const t = tenantsData.find((t) => t.id === effectiveTidForCurrency);
    return t?.currency ?? undefined;
  }, [effectiveTidForCurrency, tenantsData]);
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
    const tenantId = getUser(session)!.tenantId;
    const role = getUser(session)!.role;

    fetchStats(branchFilter || undefined);

    if (role === 'tenant-admin' || role === 'staff') {
      api.get<Branch[]>('/api/dashboard/branches').then((branches) => setBranches(branches ?? [])).catch((e) => console.error('[dashboard] branches fetch failed:', e));
    }

    const socket = connectSocket(tenantId!);
    socket.on('dashboard:update', () => fetchStats(branchFilter || undefined));

    return () => {
      socket.off('dashboard:update');
    };
  }, [session, isPending, fetchStats, branchFilter]);

  if (isPending) {
    return (
      <div className="w-full space-y-6">
        <div className="h-32 rounded-2xl bg-surface-secondary/50 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface-secondary/50 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-64 rounded-2xl bg-surface-secondary/50 animate-pulse lg:col-span-2" />
          <div className="h-64 rounded-2xl bg-surface-secondary/50 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const user = getUser(session)!;
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
      currencySymbol={getCurrencySymbol(tenantCurrency)}
    />
  );
}

function TrackQuotaCard() {
  const [quota, setQuota] = useState<{ quota_total: number; quota_used: number; quota_remain: number; today_used: number } | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    api.get<{ quota_total: number; quota_used: number; quota_remain: number; today_used: number }>('/api/dashboard/17track-quota')
      .then(setQuota)
      .catch(() => setErr(true));
  }, []);
  if (err) return null;
  if (!quota) return <div className="h-24 rounded-xl bg-surface animate-pulse" />;
  const pct = quota.quota_total > 0 ? Math.round((quota.quota_used / quota.quota_total) * 100) : 0;
  return (
    <Card>
      <Card.Header className="pb-1">
        <Card.Title className="text-sm font-semibold">17TRACK Quota</Card.Title>
      </Card.Header>
      <Card.Content className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Used</span>
          <span className="font-semibold text-foreground">{quota.quota_used} / {quota.quota_total}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Remaining</span>
          <span className="font-semibold text-foreground">{quota.quota_remain}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Used Today</span>
          <span className="font-semibold text-foreground">{quota.today_used}</span>
        </div>
      </Card.Content>
    </Card>
  );
}

function SuperadminDashboard({ stats, onRetry, router, isTenantAdmin }: {
  stats: Stats; onRetry: () => void; router: ReturnType<typeof useRouter>; isTenantAdmin?: boolean;
}) {
  const fmtCurrency = useCallback((v: string) => {
    const n = Number(v);
    const sym = getCurrencySymbol(null);
    if (n >= 100000) return `${sym}${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${sym}${(n / 1000).toFixed(1)}K`;
    return `${sym}${n.toLocaleString()}`;
  }, []);
  const [chartRange, setChartRange] = useState<'1w' | '2w' | '1m'>('1w');
  const [revRange, setRevRange] = useState<'3m' | '6m' | '12m' | 'all'>('12m');
  const t = stats.total!;
  const superRevenueData = stats.revenuePerMonth ?? [];
  const supDays = { '1w': 7, '2w': 14, '1m': 30 }[chartRange] ?? 14;
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
    { icon: <IndianRupee size={18} />, label: 'Bill Amount', value: fmtCurrency(t.invoices.revenueTotal), sublabel: 'lifetime', accent: 'emerald' as const, trend: supTrend(supTrendRevenue), trendValue: supPct(supTrendRevenue) },
    { icon: <Users size={18} />, label: 'Active Customers', value: t.customers.active, sublabel: 'registered', accent: 'violet' as const, trend: 'neutral' as const, trendValue: '—' },
    { icon: <TrendingUp size={18} />, label: 'Avg. Conversion', value: `${t.quotations.conversionRate}%`, sublabel: 'quote-to-ship', accent: 'amber' as const, trend: 'neutral' as const, trendValue: '—' },
    { icon: <Hourglass size={18} />, label: 'Overdue', value: stats.shipments?.overdue ?? 0, sublabel: 'past ETA', accent: 'red' as const, trend: 'neutral' as const, trendValue: '—' },
    { icon: <Activity size={18} />, label: 'Stale', value: stats.shipments?.stale ?? 0, sublabel: '72h no update', accent: 'sky' as const, trend: 'neutral' as const, trendValue: '—' },
    { icon: <WifiOff size={18} />, label: 'Not Tracked', value: stats.shipments?.notTracked ?? 0, sublabel: 'not registered', accent: 'purple' as const, trend: 'neutral' as const, trendValue: '—' },
  ];

  const supTotalActive = t.shipments.inTransit + t.shipments.deliveredToday + t.shipments.exceptions;
  const revMax = Math.max(...filteredRevenue.map(r => r.revenue), 1);

  return (
    <div className="w-full space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent/15 text-accent shrink-0">
              <GreetingIcon />
            </div>
            <div>
              <Heading level={1} weight="bold" className="text-foreground text-lg">{timeGreeting()}, <span className="text-accent">{isTenantAdmin ? 'Admin' : 'Super Admin'}</span></Heading>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted flex-wrap">
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                <span className="opacity-30">·</span>
                <Chip color="accent" variant="soft" size="sm" className="capitalize">{isTenantAdmin ? 'admin' : 'super admin'}</Chip>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-lg font-bold text-foreground">{t.shipments.inTransit}</p>
                <p className="text-[10px] text-muted">in transit</p>
              </div>
              <div className="w-px h-8 bg-border/60" />
              <div className="text-right">
                <p className="text-lg font-bold text-foreground">{fmtCurrency(t.invoices.revenueThisMonth)}</p>
                <p className="text-[10px] text-muted">this month</p>
              </div>
            </div>
            <Button isIconOnly variant="ghost" size="sm" onPress={() => onRetry()}><RefreshCw size={14} /></Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {supCards.map((c) => (
          <KpiCard key={c.label} icon={c.icon} label={c.label} value={c.value} sublabel={c.sublabel} accent={c.accent} trend={c.trend} trendValue={c.trendValue} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7">
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
              <MiniBarChart data={filteredPerDay} height={140} />
            ) : (
              <div className="flex items-center justify-center h-[140px] text-muted text-sm">No shipment data yet</div>
            )}
          </Card.Content>
        </Card>

        <div className="lg:col-span-5 space-y-4">
          <Card>
            <Card.Header className="pb-0">
              <Card.Title className="text-sm font-semibold">Global Summary</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-xl bg-warning/10 border border-warning/20">
                  <p className="text-xl font-bold text-warning">{t.shipments.inTransit}</p>
                  <p className="text-xs text-muted mt-1">In Transit</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-success/10 border border-success/20">
                  <p className="text-xl font-bold text-success">{t.shipments.deliveredToday}</p>
                  <p className="text-xs text-muted mt-1">Delivered Today</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-danger/10 border border-danger/20">
                  <p className="text-xl font-bold text-danger">{t.shipments.exceptions}</p>
                  <p className="text-xs text-muted mt-1">Exceptions</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-accent/10 border border-accent/20">
                  <p className="text-xl font-bold text-accent">{t.customers.active}</p>
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
                        <td className="py-3 text-right text-warning font-medium">{pb.shipments.inTransit}</td>
                        <td className="py-3 text-right text-success font-medium">{pb.shipments.deliveredToday}</td>
                        <td className="py-3 text-right">{fmtCurrency(pb.invoices.revenueTotal)}</td>
                        <td className="py-3 text-right">{pb.customers.active}/{pb.customers.total}</td>
                      </tr>
                    );
                  }
                  const pt = row as PerTenant;
                  return (
                    <tr key={pt.tenantId} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="py-3 font-medium">{pt.tenantName}</td>
                      <td className="py-3 text-right">{pt.shipments.total}</td>
                      <td className="py-3 text-right text-warning font-medium">{pt.shipments.inTransit}</td>
                      <td className="py-3 text-right text-success font-medium">{pt.shipments.deliveredToday}</td>
                      <td className="py-3 text-right">{fmtCurrency(pt.invoices.revenueTotal)}</td>
                      <td className="py-3 text-right">{pt.branches.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <Card.Header className="pb-0">
            <Card.Title className="text-sm font-semibold">Revenue</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">This Month</span>
              <span className="text-sm font-bold text-foreground">{fmtCurrency(t.invoices.revenueThisMonth)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">All Time</span>
              <span className="text-sm font-bold text-foreground">{fmtCurrency(t.invoices.revenueTotal)}</span>
            </div>
            <div className="pt-2 border-t border-border space-y-1.5">
              {filteredRevenue.slice(-6).map((r) => (
                <div key={r.month} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted w-10 shrink-0">{r.month}</span>
                  <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
                    <div className="h-full rounded bg-accent/70" style={{ width: `${(r.revenue / revMax) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-medium text-foreground w-16 text-right">{fmtCurrency(r.revenue.toString())}</span>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header className="pb-0">
            <Card.Title className="text-sm font-semibold">Health Summary</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">In Transit</span>
              <span className="font-semibold text-warning">{t.shipments.inTransit}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Delivered Today</span>
              <span className="font-semibold text-success">{t.shipments.deliveredToday}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Exceptions</span>
              <span className="font-semibold text-danger">{t.shipments.exceptions}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
              <span className="text-muted">Active Shipments</span>
              <span className="font-semibold text-foreground">{supTotalActive}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Bill Amount This Month</span>
              <span className="font-semibold text-foreground">{fmtCurrency(t.invoices.revenueThisMonth)}</span>
            </div>
          </Card.Content>
        </Card>

        <ActionCard router={router} onRetry={onRetry} />
        <TrackQuotaCard />
      </div>

      <ActivityLog />
    </div>
  );
}

function OperationalDashboard({
  stats, loading, error, role, isTenantAdmin, isStaff, userName, branchName,
  branches, branchFilter, onBranchChange, onRetry, router, currencySymbol,
}: {
  stats: Stats | null; loading: boolean; error: string | null;
  role: string; isTenantAdmin: boolean; isStaff: boolean; userName: string; branchName?: string;
  branches: Branch[]; branchFilter: string; onBranchChange: (v: string) => void;
  onRetry: () => void; router: ReturnType<typeof useRouter>; currencySymbol?: string;
}) {
  const fmtCurrency = useCallback((v: string) => {
    const n = Number(v);
    const sym = currencySymbol || '₹';
    if (n >= 100000) return `${sym}${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${sym}${(n / 1000).toFixed(1)}K`;
    return `${sym}${n.toLocaleString()}`;
  }, [currencySymbol]);
  const curSym = currencySymbol || '₹';
  const [chartRange, setChartRange] = useState<'1w' | '2w' | '1m'>('2w');

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

  const donutData = Object.entries(shipmentsData.byStatus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: statusLabel(k), value: v }));

  const carrierData = (shipmentsData.byCarrier ?? []).map((c) => ({
    name: c.carrier,
    value: c.count,
  }));

  const branchData = (shipmentsData.byBranch ?? []);

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
    { icon: <Hourglass size={18} />, label: 'Overdue', value: shipmentsData.overdue, accent: 'red', sublabel: 'past ETA', trend: 'neutral' as const, trendValue: '—' },
    { icon: <Activity size={18} />, label: 'Stale', value: shipmentsData.stale, accent: 'sky', sublabel: '72h no update', trend: 'neutral' as const, trendValue: '—' },
    { icon: <WifiOff size={18} />, label: 'Not Tracked', value: shipmentsData.notTracked, accent: 'purple', sublabel: 'not registered', trend: 'neutral' as const, trendValue: '—' },
    { icon: <IndianRupee size={18} />, label: 'Bill Amount This Month', value: fmtCurrency(stats.invoices.revenueThisMonth), accent: 'emerald', trend: trend(trendRevenue), trendValue: pctStr(trendRevenue) },
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

  const revMax = Math.max(...revenueData.map(r => r.revenue), 1);

  return (
    <div className="w-full space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent/15 text-accent shrink-0">
              <GreetingIcon />
            </div>
            <div>
              <Heading level={1} weight="bold" className="text-foreground text-lg">{timeGreeting()}, <span className="text-accent">{userName}</span></Heading>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted flex-wrap">
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                <span className="opacity-30">·</span>
                <Chip color="accent" variant="soft" size="sm" className="capitalize">{role.replace('-', ' ')}</Chip>
                {isStaff && branchName && (
                  <span className="px-1.5 py-0.5 rounded-md bg-muted/50 text-[10px]">{branchName}</span>
                )}
                {isTenantAdmin && branchFilter && (
                  <span className="px-1.5 py-0.5 rounded-md bg-accent/10 text-accent text-[10px]">{branches.find(b => b.id === branchFilter)?.name ?? 'Filtered'}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-lg font-bold text-foreground">{shipmentsData.inTransit}</p>
                <p className="text-[10px] text-muted">in transit</p>
              </div>
              <div className="w-px h-8 bg-border/60" />
              <div className="text-right">
                <p className="text-lg font-bold text-foreground">{fmtCurrency(stats.invoices.revenueThisMonth)}</p>
                <p className="text-[10px] text-muted">this month</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isTenantAdmin && branches.length > 0 && (
                <select
                  value={branchFilter}
                  onChange={(e) => onBranchChange(e.target.value)}
                  className="h-8 text-xs rounded-lg border border-border bg-background/80 backdrop-blur-sm px-2 outline-none transition-colors focus:border-primary text-foreground"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
              <Button isIconOnly variant="ghost" size="sm" onPress={() => onRetry()}><RefreshCw size={14} /></Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <KpiCard key={c.label} icon={c.icon} label={c.label} value={c.value} accent={c.accent} href={c.href} trend={c.trend} trendValue={c.trendValue} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <Card>
            <Card.Header>
              <Card.Title className="text-sm font-semibold">Status</Card.Title>
            </Card.Header>
            <Card.Content>
              {donutData.length > 0 ? (
                <StatusLegend data={donutData} />
              ) : (
                <div className="flex items-center justify-center h-[120px] text-muted text-sm">No status data yet</div>
              )}
            </Card.Content>
          </Card>
          <Card>
            <Card.Header className="pb-0">
              <Card.Title className="text-sm font-semibold">By Carrier</Card.Title>
            </Card.Header>
            <Card.Content>
              {carrierData.length > 0 ? (
                <div className="space-y-2">
                  {carrierData.map((c: { name: string; value: number }) => {
                    const maxVal = Math.max(...carrierData.map((x: { value: number }) => x.value), 1);
                    const pct = (c.value / maxVal) * 100;
                    return (
                      <div key={c.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-foreground truncate">{c.name}</span>
                          <span className="text-muted">{c.value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-muted text-xs">No carrier data yet</div>
              )}
            </Card.Content>
          </Card>
          {branchData.length > 0 && (
            <Card>
              <Card.Header className="pb-0">
                <Card.Title className="text-sm font-semibold">By Branch</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-2">
                  {branchData.slice(0, 6).map((b: { branch: string; count: number }) => {
                    const maxVal = Math.max(...branchData.map((x: { count: number }) => x.count), 1);
                    const pct = (b.count / maxVal) * 100;
                    return (
                      <div key={b.branch}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-foreground truncate">{b.branch}</span>
                          <span className="text-muted">{b.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card.Content>
            </Card>
          )}
        </div>

        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <Card.Title className="text-sm font-semibold">Shipments</Card.Title>
            <Select.Root
              selectedKey={chartRange}
              onSelectionChange={(k) => setChartRange(k as '1w' | '2w' | '1m')}
              className="w-32"
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
              <MiniBarChart data={areaData} height={150} />
            ) : (
              <div className="flex items-center justify-center h-[150px] text-muted text-sm">No shipment data yet</div>
            )}
          </Card.Content>
        </Card>

        <div className="space-y-4">
          <Card>
            <Card.Header className="pb-0">
              <Card.Title className="text-sm font-semibold">Bill Amount</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-xl bg-success/10 border border-success/20">
                  <p className="text-lg font-bold text-success">{fmtCurrency(stats.invoices.revenueThisMonth)}</p>
                  <p className="text-xs text-muted mt-1">This Month</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-accent/10 border border-accent/20">
                  <p className="text-lg font-bold text-accent">{fmtCurrency(stats.invoices.revenueTotal)}</p>
                  <p className="text-xs text-muted mt-1">Bill Amount</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-xl bg-warning/10 border border-warning/20">
                  <p className="text-lg font-bold text-warning">{stats.quotations.conversionRate}%</p>
                  <p className="text-xs text-muted mt-1">Quote Conversion</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-default/10 border border-default/20">
                  <p className="text-lg font-bold text-foreground">{stats.invoices.total}</p>
                  <p className="text-xs text-muted mt-1">Billable Shipments</p>
                </div>
              </div>
              <div className="pt-3 border-t border-border space-y-1.5">
                {revenueData.slice(-4).map((r) => (
                  <div key={r.month} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted w-8 shrink-0">{r.month}</span>
                    <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
                      <div className="h-full rounded bg-accent/70" style={{ width: `${(r.revenue / revMax) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-medium text-foreground w-16 text-right">{curSym}{(r.revenue / 1000).toFixed(0)}k</span>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <Card.Header className="pb-0">
            <Card.Title className="text-sm font-semibold">Performance</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-4">
            {performanceMetrics.map((metric) => (
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

        <div className="space-y-4">
          <Card>
            <Card.Header className="pb-0">
              <Card.Title className="text-sm font-semibold">Quick Stats</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-2.5">
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
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                <span className="text-muted">Total Shipments</span>
                <span className="font-semibold text-foreground">{shipmentsData.total}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Pending</span>
                <span className="font-semibold text-foreground">{shipmentsData.pending}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Not Tracked</span>
                <span className="font-semibold text-foreground">{shipmentsData.notTracked}</span>
              </div>
            </Card.Content>
          </Card>
          {stats.alerts.length > 0 ? (
            renderAlerts(stats.alerts)
          ) : (
            <Card>
              <Card.Header>
                <Card.Title className="text-sm font-semibold">Alerts</Card.Title>
                <Card.Description className="text-xs text-muted">All clear</Card.Description>
              </Card.Header>
              <Card.Content>
                <div className="flex items-center gap-2 text-success text-sm py-4">
                  <CheckCircle2 size={18} />
                  <span>No alerts — all shipments are on track</span>
                </div>
              </Card.Content>
            </Card>
          )}
          <ActionCard router={router} onRetry={onRetry} />
        </div>
      </div>

      <ActivityLog />
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

function ActivityLog() {
  const [entries, setEntries] = useState<{ id: string; event: string; userId: string | null; metadata: Record<string, unknown>; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantFilter } = useTenantFilter();

  useEffect(() => {
    setLoading(true);
    api.getFull<{ data: typeof entries }>('/api/audit-logs?page=1&limit=5')
      .then((b) => setEntries(b.data ?? []))
      .catch((e) => console.error('[dashboard] activity log fetch failed:', e))
      .finally(() => setLoading(false));
  }, [tenantFilter]);

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  const iconMap: Record<string, React.ReactNode> = {
    LOGIN_SUCCESS: <LogIn size={14} />,
    LOGIN_FAILED: <LogIn size={14} />,
    NOTIFICATION_SENT: <Bell size={14} />,
    NOTIFICATION_READ: <Bell size={14} />,
    NOTIFICATION_FAILED: <Bell size={14} />,
    INVITATION_CREATED: <Mail size={14} />,
  };

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between w-full">
          <div>
            <Card.Title className="text-sm font-semibold">Recent Activity</Card.Title>
            <Card.Description className="text-xs text-muted">
              Latest system events
            </Card.Description>
          </div>
          <a href="/audit" className="text-xs text-accent hover:underline shrink-0">
            View all
          </a>
        </div>
      </Card.Header>
      <Card.Content>
        {loading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 w-full rounded-lg bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center gap-2 text-muted text-sm py-4">
            <Activity size={18} />
            <span>No recent activity</span>
          </div>
        ) : (
          <div className="space-y-1">
            {entries.map((e) => (
              <div key={e.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-muted/10 text-muted shrink-0 mt-0.5">
                  {iconMap[e.event] ?? <Activity size={14} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Chip size="sm" variant="soft" color="default" className="text-[10px]">
                      {e.event.replace(/_/g, ' ')}
                    </Chip>
                    <span className="text-[11px] text-muted/60 shrink-0">{formatTime(e.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {((e.metadata as Record<string, unknown>)?.email as string) ||
                     ((e.metadata as Record<string, unknown>)?.recipient as string) ||
                     (e.userId ? `${e.userId.slice(0, 8)}…` : '—')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

function renderAlerts(alerts: Alert[]) {
  const iconMap: Record<string, React.ReactNode> = {
    stale: <Clock size={14} />,
    overdue: <CalendarClock size={14} />,
    exception: <AlertTriangle size={14} />,
  };
  const colorMap: Record<string, string> = {
    stale: 'text-warning bg-warning/10 border-l-warning',
    overdue: 'text-danger bg-danger/10 border-l-danger',
    exception: 'text-danger bg-danger/10 border-l-danger',
  };
  const labelMap: Record<string, string> = {
    stale: 'Stale',
    overdue: 'Overdue',
    exception: 'Exception',
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm font-semibold">Alerts</Card.Title>
        <Card.Description className="text-xs text-muted">
          {alerts.length > 0
            ? `${alerts.length} shipment${alerts.length > 1 ? 's' : ''} need attention`
            : 'All clear'}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-success text-sm py-4">
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
                  className={`flex items-center gap-3 text-sm px-4 py-3 rounded-xl border-l-4 transition-all hover:translate-x-0.5 ${colorMap[a.type] ?? 'text-muted bg-default/10 border-l-default'}`}
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-tertiary shrink-0">
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
