'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { ArrowRight, ExternalLink, MapPin, Clock, Truck, PackageSearch, CheckCircle2, Package, TrendingUp, CheckCircle, RefreshCw } from 'lucide-react';
import { Button, Chip, Input, TextField } from '@heroui/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { authClient } from '@/lib/auth-client';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { useCustomerDashboard, useTrackShipment, useClaimShipment } from '@/lib/queries';
import { KpiCard } from '@/components/kpi-card';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  info_received: 'Info Received',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delivery_failure: 'Delivery Failed',
  cancelled: 'Cancelled',
  exception: 'Exception',
};

const STATUS_COLORS: Record<string, 'warning' | 'primary' | 'secondary' | 'success' | 'danger' | 'default'> = {
  pending: 'warning',
  info_received: 'primary',
  in_transit: 'secondary',
  out_for_delivery: 'secondary',
  delivered: 'success',
  delivery_failure: 'danger',
  cancelled: 'default',
  exception: 'danger',
};

function DashboardSkeleton(): ReactNode {
  return (
    <section className="space-y-5 animate-pulse">
      <div className="h-5 w-44 bg-surface-secondary rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-surface-secondary shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-14 bg-surface-secondary rounded" />
              <div className="h-4 w-10 bg-surface-tertiary rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <div className="h-3.5 w-28 bg-surface-secondary rounded" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-5 py-3.5 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-3.5 w-32 bg-surface-secondary rounded" />
              <div className="h-2.5 w-20 bg-background rounded" />
            </div>
            <div className="h-5 w-14 bg-surface-secondary rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardSection(): ReactNode {
  const config = useTenantConfig();
  const { data: dash, isLoading, error, refetch } = useCustomerDashboard(true);
  const accent = config.theme === 'emerald' ? 'text-emerald-600' : 'text-violet-600';

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50/50 p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
          <PackageSearch size={24} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">Failed to load dashboard</h2>
          <p className="text-sm text-muted">Could not load your shipment data. Please try again.</p>
        </div>
        <Button variant="light" size="sm" onPress={() => refetch()} className="mx-auto">
          <RefreshCw size={14} /> Try again
        </Button>
      </div>
    );
  }

  if (!dash) return null;

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard
          icon={<Package size={15} />}
          label="Total Shipments"
          value={dash.kpis.total}
          accent="bg-gray-900"
        />
        <KpiCard
          icon={<TrendingUp size={15} />}
          label="In Transit"
          value={dash.kpis.inTransit}
          accent={config.theme === 'emerald' ? 'bg-emerald-500' : 'bg-violet-500'}
        />
        <KpiCard
          icon={<CheckCircle size={15} />}
          label="Delivered"
          value={dash.kpis.delivered}
          accent="bg-green-500"
        />
        {dash.kpis.exception > 0 && (
          <KpiCard
            icon={<Package size={15} />}
            label="Exceptions"
            value={dash.kpis.exception}
            accent="bg-red-500"
          />
        )}
      </div>

      {dash.recent.length > 0 && (
        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Recent Shipments</h2>
          </div>
          <div className="divide-y divide-background">
            {dash.recent.map((s) => (
              <a key={s.id} href={`/track/${s.trackingNo}`} className="flex items-center justify-between px-5 py-3 hover:bg-background transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-mono font-medium text-foreground truncate">{s.trackingNo}</p>
                  <p className="text-xs text-muted">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <Chip size="sm" variant="flat" color={STATUS_COLORS[s.status] ?? 'default'}>
                  {STATUS_LABELS[s.status] || s.status}
                </Chip>
              </a>
            ))}
          </div>
        </div>
      )}

      {dash.alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-5 py-3 text-sm text-amber-800 space-y-1">
          <p className="font-semibold text-xs uppercase tracking-wider">Alerts</p>
          {dash.alerts.map((a, i) => <p key={i} className="text-sm">{a.trackingNo} — {a.message}</p>)}
        </div>
      )}
    </section>
  );
}

function HomePageContent(): ReactNode {
  const config = useTenantConfig();
  const { data: session } = authClient.useSession();
  const [trackingNo, setTrackingNo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const accent = config.theme === 'emerald' ? 'text-emerald-600' : 'text-violet-600';
  const btnClass = config.theme === 'emerald'
    ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
    : 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800';

  const {
    data: result,
    isFetching: loading,
    error: searchErrorObj,
  } = useTrackShipment(searchQuery || undefined);
  const searchError = searchErrorObj instanceof Error ? searchErrorObj.message : '';

  const claimMutation = useClaimShipment();
  const [claimSuccess, setClaimSuccess] = useState('');
  const [claimError, setClaimError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNo.trim()) return;
    setSearchQuery('');
    setClaimSuccess('');
    setClaimError('');
    setTimeout(() => setSearchQuery(trackingNo.trim()), 0);
  }

  function handleClaim() {
    if (!result || !session) return;
    const userEmail = (session.user as Record<string, unknown>).email as string;
    setClaimError('');
    setClaimSuccess('');
    claimMutation.mutate(
      { trackingNo: result.trackingNo, email: userEmail },
      {
        onSuccess: (body) => {
          setClaimSuccess((body?.data as { message?: string } | undefined)?.message || 'Shipment claimed!');
        },
        onError: (err) => {
          setClaimError(err instanceof Error ? err.message : 'Failed to claim');
        },
      },
    );
  }

  return (
    <div className="space-y-10">
      {/* Logged-in: Welcome + Dashboard */}
      {session && (
        <section className="space-y-5">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Welcome back, {(session.user as Record<string, unknown>).name as string}
            </h1>
            <p className="text-sm text-muted mt-0.5">Here&apos;s an overview of your shipments.</p>
          </div>
          <DashboardSection />
        </section>
      )}

      {/* Hero */}
      <section className={`text-center space-y-5 ${session ? '' : 'pt-6'}`}>
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-secondary text-muted">
          <PackageSearch size={20} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{config.title}</h1>
          <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
            Enter your tracking number below to see the latest status of your shipment.
          </p>
        </div>
      </section>

      {/* Tracking form */}
      <section className="max-w-md mx-auto w-full">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1">
            <TextField
              value={trackingNo}
              onChange={(v) => { setTrackingNo(v); setSearchQuery(''); setClaimSuccess(''); setClaimError(''); }}
              placeholder="Enter tracking number"
              fullWidth
            >
              <Input />
            </TextField>
          </div>
          <Button
            type="submit"
            isDisabled={loading || !trackingNo.trim()}
            isPending={loading}
            className={`text-white font-medium shadow-sm ${btnClass}`}
          >
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            <span className="hidden sm:inline ml-1">Track</span>
          </Button>
        </form>
        {searchError && (
          <p className="mt-3 text-xs text-red-500 text-center">{searchError}</p>
        )}
      </section>

      {/* Search result */}
      {result && (
        <section className="max-w-xl mx-auto w-full">
          <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${config.theme === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'} flex items-center justify-center`}>
                    <PackageSearch size={16} />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-semibold text-foreground">{result.trackingNo}</p>
                    <Chip size="sm" variant="flat" color={STATUS_COLORS[result.status] ?? 'default'} className="mt-1">
                      {STATUS_LABELS[result.status] || result.status}
                    </Chip>
                  </div>
                </div>
                {session && (
                  <a href={`/track/${result.trackingNo}`} className={`text-xs font-medium ${accent} inline-flex items-center gap-1 hover:underline`}>
                    Full details <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                {result.carrier && (
                  <span className="inline-flex items-center gap-1"><Truck size={12} /> {result.carrier}</span>
                )}
                {(result.origin || result.destination) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {result.origin || '?'} → {result.destination || '?'}
                  </span>
                )}
                {result.lastTrackedAt && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> Updated {new Date(result.lastTrackedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {result.events.length > 0 && (
              <div className="px-6 pb-6 space-y-4">
                <div className="border-t border-border pt-4">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Tracking History</h3>
                </div>
                <div className="space-y-0">
                  {result.events.slice(0, 5).map((event, i) => (
                    <div key={i} className="flex gap-3 pb-4 relative">
                      {i < result.events.length - 1 && i < 4 && (
                        <div className="absolute left-[7px] top-4 bottom-0 w-px bg-surface-secondary" />
                      )}
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full border-2 ${i === 0 ? 'border-foreground bg-foreground' : 'border-border bg-surface'}`} />
                      </div>
                      <div className="flex-1 min-w-0 -mt-0.5">
                        <p className="text-xs font-medium text-foreground">
                          {STATUS_LABELS[event.status] || event.status}
                        </p>
                        {event.description && (
                          <p className="text-xs text-muted mt-0.5">{event.description}</p>
                        )}
                        <p className="text-xs text-muted mt-0.5">
                          {event.location && `${event.location} — `}
                          {new Date(event.eventTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {result.events.length > 5 && (
                  <p className="text-xs text-muted text-center">
                    +{result.events.length - 5} more events
                  </p>
                )}
              </div>
            )}

            {session && (
              <div className="border-t border-border px-6 py-4">
                {claimSuccess ? (
                  <div className={`flex items-center gap-2 text-sm ${config.theme === 'emerald' ? 'text-emerald-600' : 'text-violet-600'}`}>
                    <CheckCircle2 size={16} /> {claimSuccess}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">Is this your shipment?</p>
                    <Button
                      variant="light"
                      size="sm"
                      isDisabled={claimMutation.isPending}
                      isPending={claimMutation.isPending}
                      onPress={handleClaim}
                      className={`text-xs ${accent}`}
                    >
                      <Link2 size={13} />
                      {claimMutation.isPending ? 'Claiming...' : 'Link to my account'}
                    </Button>
                    {claimError && (
                      <p className="mt-2 text-xs text-red-500">{claimError}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Quick links for logged-in users */}
      {session && (
        <section className="text-center">
          <a href="/my-shipments" className={`inline-flex items-center gap-1.5 text-sm font-medium ${accent} hover:underline`}>
            View all my shipments <ArrowRight size={14} />
          </a>
        </section>
      )}

      {/* CTA for non-logged-in users */}
      {!session && (
        <section className="text-center space-y-4">
          <p className="text-sm text-muted max-w-xs mx-auto leading-relaxed">
            Sign in to track all your shipments in one place and get notified on status changes.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href="/login" className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors">Sign in</a>
            <a href="/register" className={`rounded-lg px-5 py-2 text-sm font-medium text-white shadow-sm transition-all ${config.theme === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-violet-600 hover:bg-violet-700'}`}>Create account</a>
          </div>
        </section>
      )}
    </div>
  );
}

export default function HomePage(): ReactNode {
  return <ErrorBoundary><HomePageContent /></ErrorBoundary>;
}
