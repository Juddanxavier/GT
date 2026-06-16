'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, Package, CheckCircle, AlertTriangle, IndianRupee, TrendingUp,
  Clock, CalendarClock, CheckCircle2, Wifi, WifiOff, RefreshCw,
} from 'lucide-react';
import { Button, Card } from '@heroui/react';
import { DonutChart, BarChart } from '@tremor/react';
import { authClient } from '@/lib/auth-client';
import { api, ApiError } from '@/lib/api';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';

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
  };
  customers: { total: number; active: number };
  quotations: { total: number; converted: number; conversionRate: number };
  invoices: { total: number; revenueThisMonth: string; revenueTotal: string };
  branches: { total: number };
  alerts: Alert[];
  total?: SuperTotal;
  perTenant?: PerTenant[];
  perDay?: { date: string; count: number }[];
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

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(v: string): string {
  const n = Number(v);
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString()}`;
}

function KpiCard({
  icon, label, value, href, color,
}: {
  icon: React.ReactNode; label: string; value: string | number; href?: string; color: string;
}) {
  const cls = 'block rounded-2xl bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg';
  const inner = (
    <>
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${color} mb-3`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-foreground mt-0.5">{value}</p>
    </>
  );
  if (href) return <a href={href} className={cls}>{inner}</a>;
  return <div className={cls}>{inner}</div>;
}

function LiveDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${online ? 'text-green-500' : 'text-gray-400'}`}>
      {online ? <Wifi size={12} /> : <WifiOff size={12} />}
      {online ? 'Live' : 'Disconnected'}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState('');

  const fetchStats = useCallback(async (branchId?: string) => {
    try {
      setError(null);
      const qs = branchId ? `?branchId=${branchId}` : '';
      const res = await api.get<Stats>(`/api/dashboard/stats${qs}`);
      setStats(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPending || !session) return;
    const tenantId = (session.user as Record<string, unknown>).tenantId as string;
    const role = (session.user as Record<string, unknown>).role as string;

    fetchStats();

    // Load branches for tenant-admin
    if (role === 'tenant-admin') {
      api.get<{ data: Branch[] }>('/api/dashboard/branches').then((r) => setBranches(r.data ?? [])).catch(() => {});
    }

    // Socket.IO
    const socket = connectSocket(tenantId);
    socket.on('connect', () => setLive(true));
    socket.on('disconnect', () => setLive(false));
    socket.on('dashboard:update', () => fetchStats(branchFilter || undefined));
    setLive(socket.connected);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('dashboard:update');
    };
  }, [session, isPending, fetchStats, branchFilter]);

  if (isPending) {
    return (
      <div className="w-full space-y-8">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-surface p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-surface p-5 h-64 animate-pulse" />
          <div className="rounded-2xl bg-surface p-5 h-64 animate-pulse" />
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

  if (isSuperadmin && stats?.total) {
    return <SuperadminDashboard stats={stats} live={live} onRetry={fetchStats} />;
  }

  return (
    <OperationalDashboard
      stats={stats}
      loading={loading}
      error={error}
      live={live}
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

function SuperadminDashboard({ stats, live, onRetry }: { stats: Stats; live: boolean; onRetry: () => void }) {
  const t = stats.total!;

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">System Overview</h1>
          <p className="text-sm text-muted">{timeGreeting()} <LiveDot online={live} /></p>
        </div>
        <Button isIconOnly variant="ghost" onPress={() => onRetry()}><RefreshCw size={16} /></Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Package size={20} />} label="Total Shipments" value={t.shipments.total} href="/shipments" color="bg-amber-500/10 text-amber-600" />
        <KpiCard icon={<IndianRupee size={20} />} label="Total Revenue" value={formatCurrency(t.invoices.revenueTotal)} color="bg-green-500/10 text-green-600" />
        <KpiCard icon={<CheckCircle size={20} />} label="Active Customers" value={t.customers.active} href="/customers" color="bg-sky-500/10 text-sky-600" />
        <KpiCard icon={<TrendingUp size={20} />} label="Avg. Conversion" value={`${t.quotations.conversionRate}%`} color="bg-violet-500/10 text-violet-600" />
      </div>

      <Card>
        <Card.Header>
          <Card.Title className="text-base">Per-Tenant Breakdown</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 font-medium">Tenant</th>
                  <th className="pb-3 font-medium text-right">Shipments</th>
                  <th className="pb-3 font-medium text-right">In Transit</th>
                  <th className="pb-3 font-medium text-right">Delivered Today</th>
                  <th className="pb-3 font-medium text-right">Revenue</th>
                  <th className="pb-3 font-medium text-right">Branches</th>
                </tr>
              </thead>
              <tbody>
                {(stats.perTenant ?? []).map((pt) => (
                  <tr key={pt.tenantId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 font-medium">{pt.tenantName}</td>
                    <td className="py-3 text-right">{pt.shipments.total}</td>
                    <td className="py-3 text-right"><span className="text-amber-600 font-medium">{pt.shipments.inTransit}</span></td>
                    <td className="py-3 text-right text-green-600 font-medium">{pt.shipments.deliveredToday}</td>
                    <td className="py-3 text-right">{formatCurrency(pt.invoices.revenueTotal)}</td>
                    <td className="py-3 text-right">{pt.branches.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      {stats.perDay && stats.perDay.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title className="text-base">Shipments per Day — All Tenants</Card.Title>
          </Card.Header>
          <Card.Content>
            <BarChart
              data={stats.perDay.map((d) => ({ date: d.date, shipments: d.count }))}
              index="date"
              categories={['shipments']}
              colors={['blue']}
              valueFormatter={(n) => n.toString()}
              className="h-64"
            />
          </Card.Content>
        </Card>
      )}

      {renderAlerts(stats.alerts)}
    </div>
  );
}

function OperationalDashboard({
  stats, loading, error, live, role, isTenantAdmin, isStaff, userName, branchName,
  branches, branchFilter, onBranchChange, onRetry, router,
}: {
  stats: Stats | null; loading: boolean; error: string | null; live: boolean;
  role: string; isTenantAdmin: boolean; isStaff: boolean; userName: string; branchName?: string;
  branches: Branch[]; branchFilter: string; onBranchChange: (v: string) => void;
  onRetry: () => void; router: ReturnType<typeof useRouter>;
}) {
  if (error) {
    return (
      <div className="w-full space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <Button variant="secondary" onPress={() => onRetry()}>Retry</Button>
        </div>
        <div className="rounded-2xl bg-surface p-8 text-center">
          <AlertTriangle size={32} className="mx-auto text-danger mb-3" />
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="w-full space-y-8">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-surface p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-surface p-5 h-64 animate-pulse" />
          <div className="rounded-2xl bg-surface p-5 h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  const s = stats.shipments;
  const cards = [
    { icon: <Truck size={20} />, label: 'In Transit', value: s.inTransit, color: 'bg-amber-500/10 text-amber-600', href: '/shipments?status=in_transit' },
    { icon: <Package size={20} />, label: 'Out for Delivery', value: s.outForDelivery, color: 'bg-blue-500/10 text-blue-600', href: '/shipments?status=out_for_delivery' },
    { icon: <CheckCircle size={20} />, label: 'Delivered Today', value: s.deliveredToday, color: 'bg-green-500/10 text-green-600', href: '/shipments?status=delivered' },
    { icon: <AlertTriangle size={20} />, label: 'Exceptions', value: s.exceptions, color: 'bg-red-500/10 text-red-600', href: '/shipments?status=exception' },
    { icon: <IndianRupee size={20} />, label: 'Revenue This Month', value: formatCurrency(stats.invoices.revenueThisMonth), color: 'bg-emerald-500/10 text-emerald-600' },
    { icon: <TrendingUp size={20} />, label: 'Quote Conversion', value: `${stats.quotations.conversionRate}%`, color: 'bg-violet-500/10 text-violet-600' },
  ];

  const donutData = Object.entries(s.byStatus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: statusLabel(k), value: v }));

  const barData = (s.perDay ?? []).map((d) => ({ date: d.date, shipments: d.count }));

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{timeGreeting()}, {userName}</h1>
          <p className="text-sm text-muted flex items-center gap-2">
            <LiveDot online={live} />
            {isStaff && branchName && <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800">Branch: {branchName}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isTenantAdmin && branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => onBranchChange(e.target.value)}
              className="h-10 w-44 rounded-xl border border-default-200 bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
            >
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <Button isIconOnly variant="ghost" onPress={() => onRetry()}><RefreshCw size={16} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <KpiCard key={c.label} icon={c.icon} label={c.label} value={c.value} href={c.href} color={c.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {donutData.length > 0 && (
          <Card>
            <Card.Header>
              <Card.Title className="text-base">Status Distribution</Card.Title>
            </Card.Header>
            <Card.Content>
              <DonutChart
                data={donutData}
                index="name"
                category="value"
                valueFormatter={(n) => n.toString()}
                className="h-64"
              />
            </Card.Content>
          </Card>
        )}
        {barData.length > 0 && (
          <Card>
            <Card.Header>
              <Card.Title className="text-base">Shipments per Day (Last 14 Days)</Card.Title>
            </Card.Header>
            <Card.Content>
              <BarChart
                data={barData}
                index="date"
                categories={['shipments']}
                colors={['blue']}
                valueFormatter={(n) => n.toString()}
                className="h-64"
              />
            </Card.Content>
          </Card>
        )}
      </div>

      {renderAlerts(stats.alerts)}

      <Card>
        <Card.Header>
          <Card.Title className="text-base">Quick Actions</Card.Title>
          <Card.Description className="text-sm text-muted">Common tasks</Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-wrap gap-3 pt-2">
          <Button onPress={() => router.push('/shipments?status=pending')}>New Shipment</Button>
          <Button variant="secondary" onPress={() => router.push('/customers')}>New Customer</Button>
          <Button variant="secondary" onPress={() => router.push('/quotations')}>New Quotation</Button>
        </Card.Content>
      </Card>
    </div>
  );
}

function renderAlerts(alerts: Alert[]) {
  const iconMap: Record<string, React.ReactNode> = {
    stale: <Clock size={16} />,
    overdue: <CalendarClock size={16} />,
    exception: <AlertTriangle size={16} />,
  };
  const colorMap: Record<string, string> = {
    stale: 'text-amber-600 bg-amber-500/10',
    overdue: 'text-orange-600 bg-orange-500/10',
    exception: 'text-red-600 bg-red-500/10',
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-base">Alerts — Shipments Needing Attention</Card.Title>
      </Card.Header>
      <Card.Content>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600 text-sm py-4">
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
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${colorMap[a.type] ?? 'text-gray-600 bg-gray-500/10'} hover:opacity-80 transition-opacity`}
                >
                  {iconMap[a.type] ?? <AlertTriangle size={16} />}
                  <span className="font-mono font-medium">{a.trackingNo}</span>
                  <span className="text-current/70">— {desc}</span>
                </a>
              );
            })}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
