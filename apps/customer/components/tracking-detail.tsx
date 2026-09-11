'use client';

import { Button } from '@heroui/react';
import { ArrowLeft, CheckCircle2, Link2, PackageSearch } from 'lucide-react';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { TrackShipmentSummary } from '@/components/track/track-shipment-summary';
import { TrackTimeline } from '@/components/track/track-timeline';
import { useClaimShipment, useTrackShipment } from '@/lib/queries';
import { useCustomerSession } from '@/lib/use-customer-session';

export function TrackingDetail({ hideBack }: { hideBack?: boolean }): ReactNode {
  const params = useParams();
  const trackingNo = params.trackingNo as string;
  const { user } = useCustomerSession();

  const [claimSuccess, setClaimSuccess] = useState('');
  const [claimError, setClaimError] = useState('');

  const btnClass = 'bg-brand-accent hover:bg-brand-accent-hover text-white';

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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-accent/20 border-t-brand-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-red-100 bg-red-50">
          <PackageSearch size={28} className="text-red-400" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Shipment not found</h2>
        <p className="mx-auto max-w-sm text-foreground/60">{errorMessage}</p>
        <p className="mt-3 text-sm text-foreground/40">
          Double-check the tracking number or contact support.
        </p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-6">
      {!hideBack && (
        <a
          href={user ? '/my-shipments' : '/track'}
          className="inline-flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} /> {user ? 'Back to my shipments' : 'Track another parcel'}
        </a>
      )}

      <TrackShipmentSummary result={result} />

      {!result.claimed && (
        <div className="rounded-2xl border border-foreground/5 bg-white p-5 shadow-sm">
          {user ? (
            claimSuccess ? (
              <div className="flex items-center gap-2 text-[#B8441A]">
                <CheckCircle2 size={16} /> {claimSuccess}
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Is this your shipment?</h2>
                  <p className="mt-0.5 text-sm text-foreground/60">
                    Link it to your account for email and WhatsApp updates.
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
                  {claimMutation.isPending ? 'Linking...' : 'Link to my account'}
                </Button>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Is this your shipment?</h2>
                <p className="mt-0.5 text-sm text-foreground/60">
                  Claim it to get notified on every status change.
                </p>
              </div>
              <a
                href={`/claim?trackingNo=${trackingNo}`}
                className={`inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${btnClass}`}
              >
                <Link2 size={14} /> Claim shipment
              </a>
            </div>
          )}
          {claimError && <p className="mt-3 text-sm text-red-500">{claimError}</p>}
        </div>
      )}

      <div className="rounded-3xl border border-foreground/5 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="h-px w-6 bg-brand-accent" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Tracking history</h2>
        </div>
        <TrackTimeline events={result.events} />
      </div>
    </div>
  );
}
