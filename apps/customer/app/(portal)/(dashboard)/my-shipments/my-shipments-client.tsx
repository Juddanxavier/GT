'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Package, ExternalLink, Clock, MapPin, Truck, Link2, CheckCircle2, ChevronLeft, ChevronRight, Search, Box } from 'lucide-react';
import { Button, Chip, Input, Pagination, Skeleton, Spinner, TextField } from '@heroui/react';
import { authClient } from '@/lib/auth-client';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { useMyShipments, useTrackShipment, useClaimShipment, type ShipmentRow } from '@/lib/queries';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', info_received: 'Info Received', in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered',
  delivery_failure: 'Delivery Failed', cancelled: 'Cancelled', exception: 'Exception',
};

const STATUS_COLORS: Record<string, 'warning' | 'accent' | 'success' | 'danger' | 'default'> = {
  pending: 'warning', info_received: 'accent', in_transit: 'warning',
  out_for_delivery: 'warning', delivered: 'success', delivery_failure: 'danger',
  cancelled: 'default', exception: 'danger',
};

export function MyShipmentsClient(): ReactNode {
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

  const { data: shipmentsData, isLoading, error, refetch } = useMyShipments(page, limit, statusFilter);
  const shipments = shipmentsData?.data ?? [];
  const total = shipmentsData?.total ?? 0;

  const { data: searchResult, isFetching: searching, error: searchErrorObj } = useTrackShipment(searchQuery || undefined);
  const searchError = searchErrorObj instanceof Error ? searchErrorObj.message : '';

  const claimMutation = useClaimShipment();

  if (sessionPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) return null;

  const sessionUser = session.user as Record<string, unknown>;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  function handleStatusFilter(s: string) { setStatusFilter(s); setPage(1); }

  function handleTrackLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingSearch.trim()) return;
    setSearchQuery('');
    setClaimSuccess('');
    setClaimError('');
    setTimeout(() => setSearchQuery(trackingSearch.trim()), 0);
  }

  function handleClaim(trackingNo: string) {
    const userEmail = sessionUser.email as string;
    setClaimError('');
    setClaimSuccess('');
    claimMutation.mutate(
      { trackingNo, email: userEmail },
      {
        onSuccess: (body) => {
          setClaimSuccess((body?.data as { message?: string } | undefined)?.message || 'Claimed!');
          refetch();
        },
        onError: (err) => { setClaimError(err instanceof Error ? err.message : 'Failed to claim'); },
      },
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#F94735]/10 text-[#F94735] flex items-center justify-center">
          <Box size={24} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Shipments</h1>
          <p className="text-foreground/50 mt-0.5">Track and manage all your shipments.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-foreground/[0.02] p-5 border border-foreground/5">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Search size={14} className="text-foreground/40" /> Track by number
        </h2>
        <form onSubmit={handleTrackLookup} className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <TextField
              value={trackingSearch}
              onChange={(v) => { setTrackingSearch(v); setSearchQuery(''); setClaimSuccess(''); setClaimError(''); }}
              fullWidth
            >
              <Input placeholder="Enter tracking number" />
            </TextField>
          </div>
          <Button type="submit" isDisabled={searching || !trackingSearch.trim()} isPending={searching} className="w-full sm:w-auto bg-[#F94735] text-white">
            {searching ? 'Searching...' : 'Track'}
          </Button>
        </form>
        {searchError && <p className="mt-2 text-danger">{searchError}</p>}

        {searchResult && (
          <div className="mt-4 p-4 rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] border border-foreground/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{searchResult.trackingNo}</p>
                <Chip size="sm" variant="soft" color={STATUS_COLORS[searchResult.status] ?? 'default'} className="mt-1">
                  {STATUS_LABELS[searchResult.status] || searchResult.status}
                </Chip>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" isDisabled={claimMutation.isPending && claimMutation.variables?.trackingNo === searchResult.trackingNo} isPending={claimMutation.isPending && claimMutation.variables?.trackingNo === searchResult.trackingNo} onPress={() => handleClaim(searchResult.trackingNo)}>
                  <Link2 size={12} /> Claim
                </Button>
                <a href={`/my-shipments/${searchResult.trackingNo}`} className="font-medium text-[#F94735] hover:underline inline-flex items-center gap-1">
                  Details <ExternalLink size={14} />
                </a>
              </div>
            </div>
            {(searchResult.origin || searchResult.destination) && (
              <div className="mt-2 flex items-center gap-2 text-xs text-foreground/60">
                {searchResult.origin && <span>{searchResult.origin}</span>}
                {searchResult.origin && searchResult.destination && <span>→</span>}
                {searchResult.destination && <span>{searchResult.destination}</span>}
              </div>
            )}
            {claimSuccess && <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle2 size={12} /> {claimSuccess}</div>}
            {claimError && <p className="mt-2 text-xs text-danger">{claimError}</p>}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Your shipments</h2>
          {total > 0 && <span className="text-xs text-foreground/40 bg-foreground/5 px-2.5 py-1 rounded-full tabular-nums">{total} total</span>}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {['', 'pending', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'cancelled'].map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? 'primary' : 'ghost'} onPress={() => handleStatusFilter(s)}
              className={statusFilter === s && isEmerald ? 'bg-emerald-600 text-white' : statusFilter === s && !isEmerald ? 'bg-[#F94735] text-white' : ''}>
              {s ? (STATUS_LABELS[s] || s) : 'All'}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-foreground/[0.02] p-5"><Skeleton className="h-4 w-1/3 rounded mb-3" /><Skeleton className="h-3 w-1/2 rounded mb-2" /><Skeleton className="h-3 w-2/3 rounded" /></div>
            ))}
          </div>
        ) : error && error.message !== 'unauthorized' ? (
          <div className="rounded-2xl bg-red-50 p-6 text-center border border-red-200/50">
            <p className="text-danger">{error instanceof Error ? error.message : 'Failed to load shipments'}</p>
            <Button variant="ghost" size="sm" onPress={() => refetch()} className="mt-3 text-danger">Try again</Button>
          </div>
        ) : shipments.length === 0 ? (
          <div className="rounded-2xl bg-foreground/[0.02] p-12 text-center border border-foreground/5">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F94735]/5 mb-4">
              <Package size={28} className="text-[#F94735]/40" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">No shipments yet</h2>
            <p className="text-foreground/50 max-w-sm mx-auto">Enter a tracking number above to look up a shipment and it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shipments.map((shipment) => (
              <a key={shipment.id} href={`/my-shipments/${shipment.trackingNo}`}
                className="block rounded-2xl bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_0_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 border border-foreground/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-foreground">{shipment.trackingNo}</span>
                      {shipment.labelCode && <span className="text-xs text-foreground/30 font-mono bg-foreground/5 px-2 py-0.5 rounded">{shipment.labelCode}</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-foreground/50 flex-wrap">
                      {shipment.carrier && <span className="inline-flex items-center gap-1"><Truck size={12} /> {shipment.carrier}</span>}
                      {(shipment.origin || shipment.destination) && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {shipment.origin || '?'} → {shipment.destination || '?'}</span>}
                      <span className="inline-flex items-center gap-1"><Clock size={12} /> {new Date(shipment.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Chip size="sm" variant="soft" color={STATUS_COLORS[shipment.status] ?? 'default'}>{STATUS_LABELS[shipment.status] || shipment.status}</Chip>
                    <ExternalLink size={14} className="text-foreground/20" />
                  </div>
                </div>
              </a>
            ))}

            {totalPages > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-foreground/5">
                <p className="text-xs text-foreground/40 tabular-nums">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
                <div className={totalPages <= 1 ? 'opacity-40 pointer-events-none' : ''}>
                  <Pagination size="sm">
                    <Pagination.Content>
                      <Pagination.Item>
                        <Pagination.Previous isDisabled={page === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={18} /></Pagination.Previous>
                      </Pagination.Item>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Pagination.Item key={p}><Pagination.Link isActive={p === page} onPress={() => setPage(p)}>{p}</Pagination.Link></Pagination.Item>
                      ))}
                      <Pagination.Item>
                        <Pagination.Next isDisabled={page === totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight size={18} /></Pagination.Next>
                      </Pagination.Item>
                    </Pagination.Content>
                  </Pagination>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
