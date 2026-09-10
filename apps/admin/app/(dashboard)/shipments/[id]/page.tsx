'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, Skeleton, Spinner, cn } from '@heroui/react';
import {
  useDeleteShipment,
  useShipment,
  useShipmentInvoice,
  useShipmentTracking,
  useStopTracking,
  useTenants,
  useTrackShipment,
} from '@/lib/queries';
import { TrackingTimeline } from './tracking-timeline';
import { CopyButton, Flag, countryFromString } from '@/components/copy-button';
import { addressDisplay } from '@/components/address-form';
import { formatCurrency } from '@/lib/currency';
import { usePageTitle } from '@/lib/use-page-title';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import { ArrowLeft, ChevronDown, MapPin, Package } from 'lucide-react';
import { useToast } from '@/components/toast';
import { DetailShell } from '@/components/detail-layout';
import { RouteJourneyStepper } from '@/components/shipments/route-journey-stepper';
import { ShipmentCommandSidebar } from '@/components/shipments/shipment-command-sidebar';
import { ShipmentStatusBadge } from '@/components/shipment-status-badge';

export default function ShipmentDetailPage(): ReactNode {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { tenantFilter } = useTenantFilter();
  const { data: tenants = [] } = useTenants();
  const tenantCurrency = useMemo(() => {
    const t = tenants.find((t) => t.id === tenantFilter);
    return t?.currency ?? undefined;
  }, [tenantFilter, tenants]);

  const { data: shipment, isLoading, error, refetch } = useShipment(id);
  const { data: trackingData, isLoading: trackingLoading } = useShipmentTracking(id);
  const { data: invoice, isLoading: invoiceLoading } = useShipmentInvoice(id);

  const trackMutation = useTrackShipment();
  const stopMutation = useStopTracking();
  const deleteMutation = useDeleteShipment();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const sortedEvents = useMemo(() => {
    const events = trackingData?.events ?? [];
    return [...events].sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());
  }, [trackingData?.events]);

  usePageTitle(shipment ? `Shipment ${shipment.trackingNo}` : 'Shipment');

  if (isLoading) return <DetailLoadingSkeleton />;

  if (error || !shipment) {
    return (
      <DetailShell>
        <Button variant="ghost" size="sm" onPress={() => router.push('/shipments')} className="mb-4 -ml-2">
          <ArrowLeft size={14} /> Back to Shipments
        </Button>
        <Card className="ops-panel p-12 text-center">
          <p className="text-danger text-sm mb-3">{error?.message ?? 'Failed to load shipment'}</p>
          <Button variant="secondary" size="sm" onPress={() => refetch()}>Retry</Button>
        </Card>
      </DetailShell>
    );
  }

  const originCountry = shipment.origin ? countryFromString(shipment.origin) : null;
  const destCountry = shipment.destination ? countryFromString(shipment.destination) : null;

  return (
    <div className="shipments-ops">
      <DetailShell>
        <Button variant="ghost" size="sm" onPress={() => router.push('/shipments')} className="mb-4 -ml-2">
          <ArrowLeft size={14} /> Operations Board
        </Button>

        <header className="ops-header-bar ops-grid-bg sticky-below-header sticky-surface px-5 py-4 mb-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <ShipmentStatusBadge status={shipment.status} />
                <span className="text-xs text-muted">{shipment.carrier || 'Unknown carrier'}</span>
              </div>
              <h1 className="ops-mono text-xl font-bold flex items-center gap-2">
                {shipment.trackingNo}
                <CopyButton text={shipment.trackingNo} />
              </h1>
              {shipment.labelCode && (
                <p className="text-xs text-muted ops-mono">Label: {shipment.labelCode}</p>
              )}
            </div>
            <div className="text-right text-sm">
              {shipment.billAmount && (
                <p className="font-semibold">{formatCurrency(shipment.billAmount, tenantCurrency)}</p>
              )}
              <p className="text-xs text-muted">
                Created {new Date(shipment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <RouteJourneyStepper
            status={shipment.status}
            origin={shipment.origin}
            destination={shipment.destination}
          />
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
          <div className="space-y-5 min-w-0">
            <section className="ops-panel-raised overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--ops-border)] flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Package size={14} className="text-[var(--ops-accent)]" />
                  Tracking Timeline
                </h2>
                {sortedEvents.length > 0 && (
                  <span className="text-xs text-muted bg-[var(--ops-surface)] px-2 py-0.5 rounded-full border border-[var(--ops-border)]">
                    {sortedEvents.length} events
                  </span>
                )}
              </div>
              <div className="p-5">
                {trackingLoading ? (
                  <div className="flex justify-center py-12"><Spinner /></div>
                ) : (
                  <TrackingTimeline events={sortedEvents} />
                )}
              </div>
            </section>

            <section className="ops-panel overflow-hidden">
              <button
                type="button"
                className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-[var(--ops-surface-raised)] transition-colors"
                onClick={() => setDetailsOpen((v) => !v)}
              >
                <span className="text-sm font-semibold">Shipment Details</span>
                <ChevronDown size={16} className={cn('text-muted transition-transform', detailsOpen && 'rotate-180')} />
              </button>
              {detailsOpen && (
                <div className="px-5 pb-5 pt-2 border-t border-[var(--ops-border)] space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <InfoRow label="Provider" value={shipment.trackingProvider || '—'} />
                    <InfoRow label="Last Tracked" value={shipment.lastTrackedAt ? new Date(shipment.lastTrackedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'} />
                    <InfoRow label="Est. Delivery" value={shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                    <InfoRow label="Actual Delivery" value={shipment.actualDelivery ? new Date(shipment.actualDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="ops-label flex items-center gap-1"><MapPin size={12} /> Sender</p>
                      <p className="text-sm flex items-start gap-1.5">
                        {originCountry && <Flag country={originCountry} />}
                        {addressDisplay(shipment.senderAddress) || shipment.origin || '—'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="ops-label flex items-center gap-1"><MapPin size={12} /> Recipient</p>
                      <p className="text-sm flex items-start gap-1.5">
                        {destCountry && <Flag country={destCountry} />}
                        {addressDisplay(shipment.recipientAddress) || shipment.destination || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          <ShipmentCommandSidebar
            shipment={shipment}
            shipmentId={id}
            invoice={invoice}
            invoiceLoading={invoiceLoading}
            tenantCurrency={tenantCurrency}
            onTrack={() => trackMutation.mutate(id)}
            trackPending={trackMutation.isPending}
            onStopTracking={async () => {
              if (!window.confirm(`Stop tracking ${shipment.trackingNo}?`)) return;
              await stopMutation.mutateAsync(id);
            }}
            stopPending={stopMutation.isPending}
            onEdit={() => toast('info', 'Edit coming soon')}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>

        {deleteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="ops-panel w-full max-w-sm mx-4 p-6 space-y-4">
              <p className="text-sm">
                Delete <strong className="ops-mono">{shipment.trackingNo}</strong>? This cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onPress={() => setDeleteOpen(false)}>Cancel</Button>
                <Button
                  variant="danger"
                  size="sm"
                  isPending={deleteMutation.isPending}
                  onPress={async () => {
                    await deleteMutation.mutateAsync(id);
                    router.push('/shipments');
                  }}
                >
                  Delete
                </Button>
              </div>
            </Card>
          </div>
        )}
      </DetailShell>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="flex justify-between gap-3 py-1">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  );
}

function DetailLoadingSkeleton(): ReactNode {
  return (
    <div className="shipments-ops max-w-6xl mx-auto space-y-5">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-32 w-full rounded-md" />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <Skeleton className="h-96 w-full rounded-md" />
        <Skeleton className="h-80 w-full rounded-md" />
      </div>
    </div>
  );
}
