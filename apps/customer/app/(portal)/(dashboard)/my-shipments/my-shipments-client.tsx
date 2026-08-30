'use client';

import { Button, Chip, Pagination, Skeleton, Spinner } from '@heroui/react';
import {
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Link2,
  MapPin,
  Package,
  Truck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useClaimShipment, useMyShipments, useTrackShipment } from '@/lib/queries';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/status';
import { useCustomerSession } from '@/lib/use-customer-session';

const STATUS_HEX: Record<string, string> = {
  pending: '#E8621A',
  info_received: '#3B82F6',
  in_transit: '#E8621A',
  out_for_delivery: '#E8621A',
  delivered: '#10B981',
  delivery_failure: '#EF4444',
  cancelled: '#6B7280',
  exception: '#EF4444',
};

export function MyShipmentsClient(): ReactNode {
  const { user, isPending: sessionPending } = useCustomerSession();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [trackingSearch, setTrackingSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');
  const [claimError, setClaimError] = useState('');
  const limit = 10;

  const {
    data: shipmentsData,
    isLoading,
    error,
    refetch,
  } = useMyShipments(page, limit, statusFilter);
  const shipments = shipmentsData?.data ?? [];
  const total = shipmentsData?.total ?? 0;

  const {
    data: searchResult,
    isFetching: searching,
    error: searchErrorObj,
  } = useTrackShipment(searchQuery || undefined);
  const searchError = searchErrorObj instanceof Error ? searchErrorObj.message : '';

  const claimMutation = useClaimShipment();

  if (sessionPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

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
    setTimeout(() => setSearchQuery(trackingSearch.trim()), 0);
  }

  function handleClaim(trackingNo: string) {
    const userEmail = user?.email;
    if (!userEmail) return;
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

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#E8621A]/10 text-[#E8621A] flex items-center justify-center">
          <Box size={24} />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-foreground">My Shipments</h1>
          <p className="text-foreground/50 mt-0.5">Track and manage all your shipments.</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-[#1a1a2e] p-6 sm:p-8 border border-foreground/5">
        <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[#E8621A]/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 w-56 h-56 rounded-full bg-[#E8621A]/10 blur-3xl" />
        <div className="relative">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
            <span className="w-6 h-px bg-[#E8621A]" /> Track by number
          </h2>
          <p className="text-sm text-white/60 mb-4">
            Enter a tracking number to look up a shipment instantly.
          </p>
          <form onSubmit={handleTrackLookup} className="flex flex-col sm:flex-row gap-2">
            <input
              value={trackingSearch}
              onChange={(e) => {
                setTrackingSearch(e.target.value);
                setSearchQuery('');
                setClaimSuccess('');
                setClaimError('');
              }}
              placeholder="Enter tracking number"
              className="flex-1 px-4 py-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm text-white text-base placeholder:text-white/60 outline-none focus:ring-2 focus:ring-[#E8621A]/40 focus:border-[#E8621A] transition-all"
            />
            <Button
              type="submit"
              isDisabled={searching || !trackingSearch.trim()}
              isPending={searching}
              className="w-full sm:w-auto bg-[#E8621A] text-white"
            >
              {searching ? 'Searching...' : 'Track'}
            </Button>
          </form>
          {searchError && <p className="mt-3 text-[#FCA5A5]">{searchError}</p>}

          {searchResult && (
            <div className="mt-5 p-5 rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] border border-foreground/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">{searchResult.trackingNo}</p>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={STATUS_COLORS[searchResult.status] ?? 'default'}
                    className="mt-1"
                  >
                    {STATUS_LABELS[searchResult.status] || searchResult.status}
                  </Chip>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    isDisabled={
                      claimMutation.isPending &&
                      claimMutation.variables?.trackingNo === searchResult.trackingNo
                    }
                    isPending={
                      claimMutation.isPending &&
                      claimMutation.variables?.trackingNo === searchResult.trackingNo
                    }
                    onPress={() => handleClaim(searchResult.trackingNo)}
                  >
                    <Link2 size={12} /> Claim
                  </Button>
                  <a
                    href={`/my-shipments/${searchResult.trackingNo}`}
                    className="font-medium text-[#E8621A] hover:underline inline-flex items-center gap-1"
                  >
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
              {claimSuccess && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600">
                  <CheckCircle2 size={12} /> {claimSuccess}
                </div>
              )}
              {claimError && <p className="mt-2 text-xs text-danger">{claimError}</p>}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Your shipments</h2>
          {total > 0 && (
            <span className="text-xs text-foreground/40 bg-foreground/5 px-2.5 py-1 rounded-full tabular-nums">
              {total} total
            </span>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {[
            '',
            'pending',
            'in_transit',
            'out_for_delivery',
            'delivered',
            'exception',
            'cancelled',
          ].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? 'primary' : 'ghost'}
              onPress={() => handleStatusFilter(s)}
              className={statusFilter === s ? 'bg-[#E8621A] text-white' : ''}
            >
              {s ? STATUS_LABELS[s] || s : 'All'}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
              <div key={i} className="rounded-2xl bg-foreground/[0.02] p-5">
                <Skeleton className="h-4 w-1/3 rounded mb-3" />
                <Skeleton className="h-3 w-1/2 rounded mb-2" />
                <Skeleton className="h-3 w-2/3 rounded" />
              </div>
            ))}
          </div>
        ) : error && error.message !== 'unauthorized' ? (
          <div className="rounded-2xl bg-red-50 p-6 text-center border border-red-200/50">
            <p className="text-danger">
              {error instanceof Error ? error.message : 'Failed to load shipments'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => refetch()}
              className="mt-3 text-danger"
            >
              Try again
            </Button>
          </div>
        ) : shipments.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center border border-foreground/5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#E8621A]/5 mb-4">
              <Package size={28} className="text-[#E8621A]/40" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">No shipments yet</h2>
            <p className="text-foreground/50 max-w-sm mx-auto">
              Enter a tracking number above to look up a shipment and it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shipments.map((shipment) => (
              <a
                key={shipment.id}
                href={`/my-shipments/${shipment.trackingNo}`}
                className="block rounded-2xl bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_0_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 border border-foreground/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${STATUS_HEX[shipment.status] ?? '#E8621A'}15`,
                        color: STATUS_HEX[shipment.status] ?? '#E8621A',
                      }}
                    >
                      <Package size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {shipment.trackingNo}
                        </span>
                        {shipment.labelCode && (
                          <span className="text-xs text-foreground/30 font-mono bg-foreground/5 px-2 py-0.5 rounded">
                            {shipment.labelCode}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-foreground/50 flex-wrap">
                        {shipment.carrier && (
                          <span className="inline-flex items-center gap-1">
                            <Truck size={12} /> {shipment.carrier}
                          </span>
                        )}
                        {(shipment.origin || shipment.destination) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} /> {shipment.origin || '?'} →{' '}
                            {shipment.destination || '?'}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} /> {new Date(shipment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Chip
                      size="sm"
                      variant="soft"
                      color={STATUS_COLORS[shipment.status] ?? 'default'}
                    >
                      {STATUS_LABELS[shipment.status] || shipment.status}
                    </Chip>
                    <ExternalLink size={14} className="text-foreground/20" />
                  </div>
                </div>
              </a>
            ))}

            {totalPages > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-foreground/5">
                <p className="text-xs text-foreground/40 tabular-nums">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </p>
                <div className={totalPages <= 1 ? 'opacity-40 pointer-events-none' : ''}>
                  <Pagination size="sm">
                    <Pagination.Content>
                      <Pagination.Item>
                        <Pagination.Previous
                          isDisabled={page === 1}
                          onPress={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft size={18} />
                        </Pagination.Previous>
                      </Pagination.Item>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Pagination.Item key={p}>
                          <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>
                            {p}
                          </Pagination.Link>
                        </Pagination.Item>
                      ))}
                      <Pagination.Item>
                        <Pagination.Next
                          isDisabled={page === totalPages}
                          onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                          <ChevronRight size={18} />
                        </Pagination.Next>
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
