'use client';

import type { ReactNode } from 'react';
import { useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, Truck, PackageSearch, Link2, CheckCircle2 } from 'lucide-react';
import { Button, Chip, Spinner } from '@heroui/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { authClient } from '@/lib/auth-client';
import { useTrackShipment, useClaimShipment } from '@/lib/queries';

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

function TrackDetailInner(): ReactNode {
  const params = useParams();
  const trackingNo = params.trackingNo as string;
  const config = useTenantConfig();
  const { data: session } = authClient.useSession();

  const [claimSuccess, setClaimSuccess] = useState('');
  const [claimError, setClaimError] = useState('');

  const isEmerald = config.theme === 'emerald';
  const btnClass = isEmerald ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white';

  const {
    data: result,
    isLoading: loading,
    error,
  } = useTrackShipment(trackingNo);

  const claimMutation = useClaimShipment();

  const errorMessage = error instanceof Error ? error.message : '';

  function handleClaim() {
    const userEmail = (session?.user as Record<string, unknown> | undefined)?.email as string | undefined;
    if (!userEmail) return;
    setClaimError('');
    setClaimSuccess('');
    claimMutation.mutate(
      { trackingNo, email: userEmail },
      {
        onSuccess: (body) => {
          setClaimSuccess((body?.data as { message?: string } | undefined)?.message || 'Shipment linked!');
        },
        onError: (err) => {
          setClaimError(err instanceof Error ? err.message : 'Failed to claim');
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <a href={session ? '/my-shipments' : '/'} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> {session ? 'Back to my shipments' : 'Back to home'}
      </a>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 border border-red-200 mb-4">
            <PackageSearch size={28} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Shipment not found</h2>
          <p className="text-sm text-muted">{errorMessage}</p>
        </div>
      ) : result ? (
        <>
          {/* Status header */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-lg font-bold text-foreground">{result.trackingNo}</p>
                <Chip size="sm" variant="soft" color={STATUS_COLORS[result.status] ?? 'default'} className="mt-2">
                  {STATUS_LABELS[result.status] || result.status}
                </Chip>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {result.carrier && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Truck size={16} className="text-muted/60 shrink-0" />
                  <span>{result.carrier}</span>
                </div>
              )}
              {(result.origin || result.destination) && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <MapPin size={16} className="text-muted/60 shrink-0" />
                  <span>{result.origin || '?'} → {result.destination || '?'}</span>
                </div>
              )}
              {result.lastTrackedAt && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Clock size={16} className="text-muted/60 shrink-0" />
                  <span>Last updated {new Date(result.lastTrackedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {result.estimatedDelivery && (
              <div className={`mt-4 p-3 rounded-lg ${isEmerald ? 'bg-emerald-50 border border-emerald-200' : 'bg-violet-50 border border-violet-200'}`}>
                <p className={`text-xs font-medium ${isEmerald ? 'text-emerald-700' : 'text-violet-700'}`}>
                  Estimated delivery: {new Date(result.estimatedDelivery).toLocaleDateString()}
                </p>
              </div>
            )}
            {result.actualDelivery && (
              <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-xs font-medium text-green-700">
                  Delivered on: {new Date(result.actualDelivery).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Claim section for logged-in users */}
          {session && (
            <div className="rounded-xl border border-border bg-surface p-6">
              {claimSuccess ? (
                <div className={`flex items-center gap-2 text-sm ${isEmerald ? 'text-emerald-700' : 'text-violet-700'}`}>
                  <CheckCircle2 size={16} /> {claimSuccess}
                </div>
              ) : (
                <>
                  <h2 className="text-sm font-semibold text-foreground mb-2">Link this shipment</h2>
                  <p className="text-xs text-muted mb-4">
                    Link this shipment to your account to receive updates on status changes.
                  </p>
                  <Button
                    isDisabled={claimMutation.isPending}
                    isPending={claimMutation.isPending}
                    onPress={handleClaim}
                    className={btnClass}
                  >
                    <Link2 size={16} />
                    {claimMutation.isPending ? 'Linking...' : 'Link to my account'}
                  </Button>
                  {claimError && <p className="mt-3 text-xs text-danger">{claimError}</p>}
                </>
              )}
            </div>
          )}

          {/* Tracking timeline */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-foreground mb-6">Tracking History</h2>
            {result.events.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No tracking events yet.</p>
            ) : (
              <div className="relative">
                {result.events.map((event, i) => (
                  <div key={i} className="flex gap-4 pb-6 relative last:pb-0">
                    {i < result.events.length - 1 && (
                      <div className="absolute left-[11px] top-5 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        i === 0 ? 'border-emerald-500 bg-emerald-100' : 'border-gray-300 bg-white'
                      }`}>
                        {i === 0 && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 -mt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">
                          {STATUS_LABELS[event.status] || event.status}
                        </p>
                        <span className="text-xs text-muted/60">
                          {new Date(event.eventTime).toLocaleString()}
                        </span>
                      </div>
                      {event.description && <p className="text-sm text-muted mt-1">{event.description}</p>}
                      {event.location && <p className="text-xs text-muted/60 mt-0.5">{event.location}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function TrackDetailPage(): ReactNode {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><Spinner size="lg" /></div>}>
        <TrackDetailInner />
      </Suspense>
    </ErrorBoundary>
  );
}
