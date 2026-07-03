'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { ArrowRight, ExternalLink, MapPin, Clock, Truck, PackageSearch, Link2, CheckCircle2, Package, TrendingUp, CheckCircle, RefreshCw } from 'lucide-react';
import { Button, Chip, Input, Skeleton, TextField } from '@heroui/react';
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
    <section className="space-y-6 animate-pulse">
      <div className="h-6 w-48 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="h-5 w-12 bg-gray-300 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-3 border-b border-separator">
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-5 py-4 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-36 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardSection(): ReactNode {
  const config = useTenantConfig();
  const { data: dash, isLoading, error, refetch } = useCustomerDashboard(true);
  const isEmerald = config.theme === 'emerald';

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger/10 p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-danger/10">
          <PackageSearch size={28} className="text-danger" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Failed to load dashboard</h2>
          <p className="text-sm text-muted">Could not load your shipment data. Please try again.</p>
        </div>
        <Button variant="ghost" size="sm" onPress={() => refetch()} className="mx-auto">
          <RefreshCw size={14} /> Try again
        </Button>
      </div>
    );
  }

  if (!dash) return null;

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard
          icon={<Package size={18} />}
          label="Total Shipments"
          value={dash.kpis.total}
          accent={isEmerald ? 'bg-emerald-500' : 'bg-violet-500'}
        />
        <KpiCard
          icon={<TrendingUp size={18} />}
          label="In Transit"
          value={dash.kpis.inTransit}
          accent={isEmerald ? 'bg-amber-500' : 'bg-purple-500'}
        />
        <KpiCard
          icon={<CheckCircle size={18} />}
          label="Delivered"
          value={dash.kpis.delivered}
          accent={isEmerald ? 'bg-emerald-600' : 'bg-violet-600'}
        />
        {dash.kpis.exception > 0 && (
          <KpiCard
            icon={<Package size={18} />}
            label="Exceptions"
            value={dash.kpis.exception}
            accent="bg-red-500"
          />
        )}
      </div>

      {dash.recent.length > 0 && (
        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-separator">
            <h2 className="text-sm font-semibold text-foreground">Recent Shipments</h2>
          </div>
          <div className="divide-y divide-separator">
            {dash.recent.map((s) => (
              <a key={s.id} href={`/track/${s.trackingNo}`} className="flex items-center justify-between px-5 py-3 hover:bg-surface-secondary transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-mono font-medium text-foreground truncate">{s.trackingNo}</p>
                  <p className="text-xs text-muted">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <Chip size="sm" variant="soft" color={STATUS_COLORS[s.status] ?? 'default'}>
                  {STATUS_LABELS[s.status] || s.status}
                </Chip>
              </a>
            ))}
          </div>
        </div>
      )}

      {dash.alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 space-y-1">
          <p className="font-semibold">Alerts</p>
          {dash.alerts.map((a, i) => <p key={i}>{a.trackingNo} — {a.message}</p>)}
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

  const isEmerald = config.theme === 'emerald';
  const btnClass = isEmerald ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white';

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
    <div className="space-y-8">
      {/* Logged-in: Welcome + Dashboard */}
      {session && (
        <section className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {(session.user as Record<string, unknown>).name as string}
            </h1>
            <p className="text-sm text-muted mt-1">Here&apos;s an overview of your shipments.</p>
          </div>
          <DashboardSection />
        </section>
      )}

      {/* Hero (shown to all users, below dashboard when logged in) */}
      <section className="text-center space-y-4 pt-8">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${isEmerald ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-violet-500 to-violet-700'} text-white shadow-lg mb-2`}>
          <PackageSearch size={32} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{config.title}</h1>
        <p className="text-muted max-w-md mx-auto">
          Enter your tracking number below to see the latest status of your shipment.
        </p>
      </section>

      {/* Tracking form */}
      <section className="max-w-lg mx-auto w-full">
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
          <Button type="submit" isDisabled={loading || !trackingNo.trim()} isPending={loading} className={btnClass}>
            <ArrowRight size={16} /> Track
          </Button>
        </form>
        {searchError && (
          <p className="mt-3 text-sm text-danger text-center">{searchError}</p>
        )}
      </section>

      {/* Search result */}
      {result && (
        <section className="max-w-lg mx-auto w-full">
          <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-separator">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold text-foreground">{result.trackingNo}</p>
                  <Chip size="sm" variant="soft" color={STATUS_COLORS[result.status] ?? 'default'} className="mt-1.5">
                    {STATUS_LABELS[result.status] || result.status}
                  </Chip>
                </div>
                {session && (
                  <a href={`/track/${result.trackingNo}`} className={`text-sm ${isEmerald ? 'text-emerald-600 hover:text-emerald-700' : 'text-violet-600 hover:text-violet-700'} inline-flex items-center gap-1`}>
                    Full details <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
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

            {/* Latest events */}
            {result.events.length > 0 && (
              <div className="p-5 space-y-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tracking History</h3>
                <div className="space-y-0">
                  {result.events.slice(0, 5).map((event, i) => (
                    <div key={i} className="flex gap-3 pb-4 relative">
                      {i < result.events.length - 1 && i < 4 && (
                        <div className="absolute left-[7px] top-4 bottom-0 w-px bg-gray-200" />
                      )}
                      <div className="flex flex-col items-center">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 ${i === 0 ? 'border-emerald-500 bg-emerald-100' : 'border-gray-300 bg-white'}`} />
                      </div>
                      <div className="flex-1 min-w-0 -mt-0.5">
                        <p className="text-xs font-medium text-foreground">
                          {STATUS_LABELS[event.status] || event.status}
                        </p>
                        {event.description && (
                          <p className="text-xs text-muted mt-0.5">{event.description}</p>
                        )}
                        <p className="text-xs text-muted/60 mt-0.5">
                          {event.location && `${event.location} — `}
                          {new Date(event.eventTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {result.events.length > 5 && (
                  <p className="text-xs text-muted/60 text-center">
                    +{result.events.length - 5} more events
                  </p>
                )}
              </div>
            )}

            {/* Claim section for logged-in users */}
            {session && (
              <div className="border-t border-separator p-5">
                {claimSuccess ? (
                  <div className={`flex items-center gap-2 text-sm ${isEmerald ? 'text-emerald-700' : 'text-violet-700'}`}>
                    <CheckCircle2 size={16} /> {claimSuccess}
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      isDisabled={claimMutation.isPending}
                      isPending={claimMutation.isPending}
                      onPress={handleClaim}
                      className={isEmerald ? 'text-emerald-700' : 'text-violet-700'}
                    >
                      <Link2 size={16} />
                      {claimMutation.isPending ? 'Claiming...' : 'Link this shipment to my account'}
                    </Button>
                    {claimError && (
                      <p className="mt-2 text-xs text-danger">{claimError}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Quick links for logged-in users */}
      {session && (
        <section className="text-center">
          <a href="/my-shipments" className={`inline-flex items-center gap-2 text-sm font-medium ${isEmerald ? 'text-emerald-600 hover:text-emerald-700' : 'text-violet-600 hover:text-violet-700'} transition-colors`}>
            View all my shipments <ArrowRight size={14} />
          </a>
        </section>
      )}

      {/* CTA for non-logged-in users */}
      {!session && (
        <section className="text-center space-y-3 pt-4">
          <p className="text-sm text-muted">
            Sign in to track all your shipments in one place and get notified on status changes.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href="/login" className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-surface-secondary transition-colors">Sign in</a>
            <a href="/register" className={`rounded-lg ${isEmerald ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-violet-600 hover:bg-violet-700'} px-5 py-2 text-sm font-medium text-white transition-all`}>Create account</a>
          </div>
        </section>
      )}
    </div>
  );
}

export default function HomePage(): ReactNode {
  return <ErrorBoundary><HomePageContent /></ErrorBoundary>;
}
