'use client';

import { Button, Chip, Spinner } from '@heroui/react';
import { ArrowLeft, CheckCircle2, Clock, Copy, Link2, MapPin, PackageSearch } from 'lucide-react';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useClaimShipment, useTrackShipment } from '@/lib/queries';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/status';
import { useCustomerSession } from '@/lib/use-customer-session';

const cardClass =
  'rounded-2xl bg-white border border-foreground/5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] p-6';

export function TrackingDetail({ hideBack }: { hideBack?: boolean }): ReactNode {
  const params = useParams();
  const trackingNo = params.trackingNo as string;
  const { user } = useCustomerSession();

  const [claimSuccess, setClaimSuccess] = useState('');
  const [claimError, setClaimError] = useState('');

  const btnClass = 'bg-[#E8621A] hover:bg-[#C45016] text-white';

  const { data: result, isLoading: loading, error } = useTrackShipment(trackingNo);
  const claimMutation = useClaimShipment();
  const errorMessage = error instanceof Error ? error.message : '';

  function handleClaim() {
    if (!user?.email) return;
    setClaimError('');
    setClaimSuccess('');
    claimMutation.mutate(
      { trackingNo, email: user.email },
      {
        onSuccess: (body) => {
          setClaimSuccess(
            (body?.data as { message?: string } | undefined)?.message || 'Shipment linked!',
          );
        },
        onError: (err) => {
          setClaimError(err instanceof Error ? err.message : 'Failed to claim');
        },
      },
    );
  }

  return (
    <div className="space-y-5">
      {!hideBack && (
        <a
          href={user ? '/my-shipments' : '/'}
          className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> {user ? 'Back to my shipments' : 'Back to home'}
        </a>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 border border-red-100 mb-4">
            <PackageSearch size={24} className="text-red-400" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">Shipment not found</h2>
          <p className="text-foreground/60">{errorMessage}</p>
        </div>
      ) : result ? (
        <>
          <div className={cardClass}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8621A]/10 text-[#E8621A] flex items-center justify-center">
                  <PackageSearch size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-base font-bold text-foreground">
                      {result.trackingNo}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(result.trackingNo)}
                      className="p-1 rounded-lg hover:bg-foreground/5 text-foreground/30 hover:text-foreground/60 transition-colors"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={STATUS_COLORS[result.status] ?? 'default'}
                    className="mt-1.5"
                  >
                    {STATUS_LABELS[result.status] || result.status}
                  </Chip>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(result.origin || result.destination) && (
                <div className="flex items-center gap-2 text-foreground/60">
                  <MapPin size={14} className="text-[#E8621A]/60 shrink-0" />
                  <span>
                    {result.origin || '?'} → {result.destination || '?'}
                  </span>
                </div>
              )}
              {result.lastTrackedAt && (
                <div className="flex items-center gap-2 text-foreground/60">
                  <Clock size={14} className="text-[#E8621A]/60 shrink-0" />
                  <span>Last updated {new Date(result.lastTrackedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {result.estimatedDelivery && (
              <div className="mt-4 p-3 rounded-xl bg-foreground/[0.02] border border-foreground/5">
                <p className="font-medium text-foreground">
                  Estimated delivery: {new Date(result.estimatedDelivery).toLocaleDateString()}
                </p>
              </div>
            )}
            {result.actualDelivery && (
              <div className="mt-2 p-3 rounded-xl bg-green-50 border border-green-100">
                <p className="font-medium text-green-700">
                  Delivered on: {new Date(result.actualDelivery).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {!result.claimed && (
            <div className={cardClass}>
              {user ? (
                claimSuccess ? (
                  <div className="flex items-center gap-2 text-[#B8441A]">
                    <CheckCircle2 size={16} /> {claimSuccess}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        Is this your shipment?
                      </h2>
                      <p className="text-foreground/60 mt-0.5">
                        Link to receive updates on status changes.
                      </p>
                    </div>
                    <Button
                      isDisabled={claimMutation.isPending}
                      isPending={claimMutation.isPending}
                      onPress={handleClaim}
                      size="sm"
                      className={btnClass}
                    >
                      <Link2 size={14} />
                      {claimMutation.isPending ? 'Linking...' : 'Link'}
                    </Button>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Is this your shipment?
                    </h2>
                    <p className="text-foreground/60 mt-0.5">
                      Claim to get notified on status changes.
                    </p>
                  </div>
                  <a
                    href={`/claim?trackingNo=${trackingNo}`}
                    className={`inline-flex items-center gap-1.5 ${btnClass} px-4 py-2 rounded-xl text-sm font-semibold transition-colors`}
                  >
                    <Link2 size={14} /> Claim
                  </a>
                </div>
              )}
              {claimError && <p className="mt-3 text-red-500">{claimError}</p>}
            </div>
          )}

          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-6">
              <span className="w-6 h-px bg-[#E8621A]" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Tracking History
              </h2>
            </div>
            {result.events.length === 0 ? (
              <p className="text-foreground/60 text-center py-8">No tracking events yet.</p>
            ) : (
              <div className="relative">
                {result.events.map((event, i) => (
                  <div
                    key={`${event.eventTime}-${event.description ?? ''}`}
                    className="flex gap-4 pb-6 relative last:pb-0"
                  >
                    {i < result.events.length - 1 && (
                      <div className="absolute left-[9px] top-5 bottom-0 w-0.5 bg-foreground/5" />
                    )}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                          i === 0
                            ? 'border-[#E8621A] bg-[#E8621A]'
                            : 'border-foreground/10 bg-white'
                        }`}
                      >
                        {i === 0 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 -mt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">
                          {STATUS_LABELS[event.status] || event.status}
                        </p>
                        <span className="text-sm text-foreground/50">
                          {new Date(event.eventTime).toLocaleString()}
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-foreground/70 mt-1">{event.description}</p>
                      )}
                      {event.location && (
                        <p className="text-foreground/50 mt-0.5">{event.location}</p>
                      )}
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
