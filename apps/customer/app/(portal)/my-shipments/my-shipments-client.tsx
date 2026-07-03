'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, LogOut, ExternalLink, Clock, MapPin, Truck, Link2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Chip, Input, Pagination, Skeleton, Spinner, TextField } from '@heroui/react';
import { authClient } from '@/lib/auth-client';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { useMyShipments, useTrackShipment, useClaimShipment, type ShipmentRow } from '@/lib/queries';

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

export function MyShipmentsClient(): ReactNode {
  const router = useRouter();
  const config = useTenantConfig();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isEmerald = config.theme === 'emerald';

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [trackingSearch, setTrackingSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');
  const [claimError, setClaimError] = useState('');
  const limit = 10;

  // Shipments query
  const { data: shipmentsData, isLoading, error, refetch } = useMyShipments(page, limit, statusFilter);
  const shipments = shipmentsData?.data ?? [];
  const total = shipmentsData?.total ?? 0;

  // Track search query
  const {
    data: searchResult,
    isFetching: searching,
    error: searchErrorObj,
  } = useTrackShipment(searchQuery || undefined);
  const searchError = searchErrorObj instanceof Error ? searchErrorObj.message : '';

  // Claim mutation
  const claimMutation = useClaimShipment();

  if (sessionPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  const sessionUser = session.user as Record<string, unknown>;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  function handleStatusFilter(s: string) {
    setStatusFilter(s);
    setPage(1);
  }

  function handleTrackLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingSearch.trim()) return;
    setSearchQuery('');
    setClaimSuccess('');
    setClaimError('');
    // Small delay to reset then trigger the query
    setTimeout(() => setSearchQuery(trackingSearch.trim()), 0);
  }

  function handleClaim(trackingNo: string) {
    const userEmail = (session.user as Record<string, unknown>).email as string;
    setClaimError('');
    setClaimSuccess('');
    claimMutation.mutate(
      { trackingNo, email: userEmail },
      {
        onSuccess: (body) => {
          setClaimSuccess((body?.data as { message?: string } | undefined)?.message || 'Claimed!');
          refetch();
        },
        onError: (err) => {
          setClaimError(err instanceof Error ? err.message : 'Failed to claim');
        },
      },
    );
  }

  // If user is unauthorized (401), redirect to login
  if (error instanceof Error && error.message === 'unauthorized') {
    router.push('/login');
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Shipments</h1>
          <p className="text-sm text-muted mt-1">Welcome back, {sessionUser.name as string}</p>
        </div>
        <Button variant="ghost" size="sm" onPress={async () => { await authClient.signOut(); router.push('/login'); }}>
          <LogOut size={16} /> Sign out
        </Button>
      </div>

      {/* Quick tracking lookup */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Look up a shipment</h2>
        <form onSubmit={handleTrackLookup} className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <TextField
              value={trackingSearch}
              onChange={(v) => { setTrackingSearch(v); setSearchQuery(''); setClaimSuccess(''); setClaimError(''); }}
              placeholder="Enter tracking number"
              fullWidth
            >
              <Input />
            </TextField>
          </div>
          <Button type="submit" isDisabled={searching || !trackingSearch.trim()} isPending={searching} className="w-full sm:w-auto">
            {searching ? 'Searching...' : 'Track'}
          </Button>
        </form>
        {searchError && <p className="mt-2 text-sm text-danger">{searchError}</p>}

        {searchResult && (
          <div className={`mt-3 p-3 rounded-lg border ${isEmerald ? 'border-emerald-200 bg-emerald-50' : 'border-violet-200 bg-violet-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isEmerald ? 'text-emerald-900' : 'text-violet-900'}`}>{searchResult.trackingNo}</p>
                <Chip size="sm" variant="soft" color={STATUS_COLORS[searchResult.status] ?? 'default'} className="mt-1">
                  {STATUS_LABELS[searchResult.status] || searchResult.status}
                </Chip>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  isDisabled={claimMutation.isPending && claimMutation.variables?.trackingNo === searchResult.trackingNo}
                  isPending={claimMutation.isPending && claimMutation.variables?.trackingNo === searchResult.trackingNo}
                  onPress={() => handleClaim(searchResult.trackingNo)}
                >
                  <Link2 size={12} /> Claim
                </Button>
                <a href={`/track/${searchResult.trackingNo}`} className={`text-sm ${isEmerald ? 'text-emerald-700 hover:text-emerald-800' : 'text-violet-700 hover:text-violet-800'} inline-flex items-center gap-1`}>
                  Details <ExternalLink size={14} />
                </a>
              </div>
            </div>
            {(searchResult.origin || searchResult.destination) && (
              <div className={`mt-2 flex items-center gap-2 text-xs ${isEmerald ? 'text-emerald-700' : 'text-violet-700'}`}>
                {searchResult.origin && <span>{searchResult.origin}</span>}
                {searchResult.origin && searchResult.destination && <span>→</span>}
                {searchResult.destination && <span>{searchResult.destination}</span>}
              </div>
            )}
            {claimSuccess && (
              <div className={`mt-2 flex items-center gap-1.5 text-xs ${isEmerald ? 'text-emerald-700' : 'text-violet-700'}`}>
                <CheckCircle2 size={12} /> {claimSuccess}
              </div>
            )}
            {claimError && <p className="mt-2 text-xs text-danger">{claimError}</p>}
          </div>
        )}
      </div>

      {/* Shipments list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Your shipments</h2>
          {total > 0 && <span className="text-xs text-muted">{total} total</span>}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {['', 'pending', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'cancelled'].map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? 'solid' : 'ghost'} onPress={() => handleStatusFilter(s)}
              className={statusFilter === s && isEmerald ? 'bg-emerald-600 text-white' : statusFilter === s && !isEmerald ? 'bg-violet-600 text-white' : ''}>
              {s ? (STATUS_LABELS[s] || s) : 'All'}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                <Skeleton className="h-4 w-1/3 rounded mb-3" />
                <Skeleton className="h-3 w-1/2 rounded mb-2" />
                <Skeleton className="h-3 w-2/3 rounded" />
              </div>
            ))}
          </div>
        ) : error && error.message !== 'unauthorized' ? (
          <div className="rounded-xl border border-danger/20 bg-danger/10 p-6 text-center">
            <p className="text-sm text-danger">{error instanceof Error ? error.message : 'Failed to load shipments'}</p>
            <Button variant="ghost" size="sm" onPress={() => refetch()} className="mt-3 text-danger">
              Try again
            </Button>
          </div>
        ) : shipments.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-secondary border border-border mb-4">
              <Package size={28} className="text-muted/60" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">No shipments yet</h2>
            <p className="text-sm text-muted max-w-sm mx-auto">
              Enter a tracking number above to look up a shipment and it will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {shipments.map((shipment) => (
                <a
                  key={shipment.id}
                  href={`/track/${shipment.trackingNo}`}
                  className="block rounded-xl border border-border bg-surface p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-foreground">{shipment.trackingNo}</span>
                        {shipment.labelCode && (
                          <span className="text-xs text-muted/60 font-mono">{shipment.labelCode}</span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted flex-wrap">
                        {shipment.carrier && (
                          <span className="inline-flex items-center gap-1"><Truck size={12} /> {shipment.carrier}</span>
                        )}
                        {(shipment.origin || shipment.destination) && (
                          <span className="inline-flex items-center gap-1"><MapPin size={12} /> {shipment.origin || '?'} → {shipment.destination || '?'}</span>
                        )}
                        <span className="inline-flex items-center gap-1"><Clock size={12} /> {new Date(shipment.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Chip size="sm" variant="soft" color={STATUS_COLORS[shipment.status] ?? 'default'}>
                        {STATUS_LABELS[shipment.status] || shipment.status}
                      </Chip>
                      <ExternalLink size={14} className="text-muted/40" />
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-separator">
                <p className="text-xs text-muted">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </p>
                <Pagination size="sm">
                  <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous isDisabled={page === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
                        <ChevronLeft size={18} />
                      </Pagination.Previous>
                    </Pagination.Item>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Pagination.Item key={p}>
                        <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>{p}</Pagination.Link>
                      </Pagination.Item>
                    ))}
                    <Pagination.Item>
                      <Pagination.Next isDisabled={page === totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}>
                        <ChevronRight size={18} />
                      </Pagination.Next>
                    </Pagination.Item>
                  </Pagination.Content>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
