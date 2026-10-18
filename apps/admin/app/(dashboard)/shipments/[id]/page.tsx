'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, Skeleton, Spinner } from '@heroui/react';
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
import { Flag, countryFromString } from '@/components/copy-button';
import { addressDisplay } from '@/components/address-form';
import { usePageTitle } from '@/lib/use-page-title';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import { shortDate, shortDateTime } from '@/lib/format-date';
import { ArrowLeft, CalendarCheck, CalendarClock, Clock, MapPin, Package, Radar } from 'lucide-react';
import { useToast } from '@/components/toast';
import { ConfirmDialog } from '@repo/ui/confirm-dialog';
import { DetailShell } from '@/components/detail-layout';
import { ShipmentCommandSidebar } from '@/components/shipments/shipment-command-sidebar';
import { ShipmentTicket } from '@/components/shipments/shipment-ticket';

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
  const [stopOpen, setStopOpen] = useState(false);

  const sortedEvents = useMemo(() => {
    const events = trackingData?.events ?? [];
    return [...events].sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());
  }, [trackingData?.events]);

  usePageTitle(shipment ? `Shipment ${shipment.trackingNo}` : 'Shipment');

  if (isLoading) return <DetailLoadingSkeleton />;

  if (error || !shipment) {
    return (
      <DetailShell>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => router.push('/shipments')}
          className="reveal -ml-2"
        >
          <ArrowLeft size={14} /> Back to Shipments
        </Button>
        <Card className="reveal [--reveal-delay:60ms] ops-panel p-12 text-center">
          <p className="text-danger-soft-foreground text-sm mb-3">{error?.message ?? 'Failed to load shipment'}</p>
          <Button variant="secondary" size="sm" onPress={() => refetch()}>Retry</Button>
        </Card>
      </DetailShell>
    );
  }

  const originCountry = shipment.origin ? countryFromString(shipment.origin) : null;
  const destCountry = shipment.destination ? countryFromString(shipment.destination) : null;

  const stats = [
    { icon: Radar, label: 'Provider', value: shipment.trackingProvider || '—' },
    {
      icon: Clock,
      label: 'Last tracked',
      value: shipment.lastTrackedAt ? shortDateTime(shipment.lastTrackedAt) : '—',
    },
    {
      icon: CalendarClock,
      label: 'Est. delivery',
      value: shipment.estimatedDelivery ? shortDate(shipment.estimatedDelivery) : '—',
    },
    {
      icon: CalendarCheck,
      label: 'Actual delivery',
      value: shipment.actualDelivery ? shortDate(shipment.actualDelivery) : '—',
    },
  ];

  return (
    <div className="shipments-ops">
      <DetailShell>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => router.push('/shipments')}
          className="reveal -ml-2"
        >
          <ArrowLeft size={14} /> Operations Board
        </Button>

        {/* The waybill — identity on the body, identifiers on the stub. */}
        <ShipmentTicket
          shipment={shipment}
          tenantCurrency={tenantCurrency}
          className="reveal [--reveal-delay:60ms]"
        />

        {/* At a glance — the four facts an operator checks first. */}
        <section className="reveal [--reveal-delay:120ms] grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-md border border-border bg-border">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface px-4 py-3 space-y-1">
              <p className="ops-label flex items-center gap-1.5">
                <stat.icon size={12} aria-hidden="true" />
                {stat.label}
              </p>
              <p className="text-sm font-medium truncate" title={stat.value}>
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        {/* Route — the two addresses the journey connects. */}
        <section className="reveal [--reveal-delay:180ms] grid grid-cols-1 sm:grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border">
          <AddressCell
            label="Sender"
            flag={originCountry}
            address={addressDisplay(shipment.senderAddress) || shipment.origin}
          />
          <AddressCell
            label="Recipient"
            flag={destCountry}
            address={addressDisplay(shipment.recipientAddress) || shipment.destination}
          />
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
          <section className="overflow-hidden min-w-0 rounded-md border border-border bg-surface">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Package size={14} className="text-accent" />
                Tracking Timeline
              </h2>
              {sortedEvents.length > 0 && (
                <span className="text-xs text-muted px-2 py-0.5 rounded-full border border-border">
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

          <ShipmentCommandSidebar
            shipment={shipment}
            shipmentId={id}
            invoice={invoice}
            invoiceLoading={invoiceLoading}
            tenantCurrency={tenantCurrency}
            onTrack={() => trackMutation.mutate(id)}
            trackPending={trackMutation.isPending}
            onStopTracking={() => setStopOpen(true)}
            stopPending={stopMutation.isPending}
            onEdit={() => toast('info', 'Edit coming soon')}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>

        <ConfirmDialog
          open={deleteOpen}
          title="Delete Shipment"
          description={
            <>
              Delete <strong className="ops-mono">{shipment.trackingNo}</strong>? This cannot be
              undone.
            </>
          }
          confirmLabel="Delete"
          tone="danger"
          isPending={deleteMutation.isPending}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={async () => {
            await deleteMutation.mutateAsync(id);
            router.push('/shipments');
          }}
        />

        <ConfirmDialog
          open={stopOpen}
          title="Stop Tracking"
          description={
            <>
              Stop tracking <strong className="ops-mono">{shipment.trackingNo}</strong>? Status
              updates from the carrier will stop until you start tracking again.
            </>
          }
          confirmLabel="Stop Tracking"
          tone="danger"
          isPending={stopMutation.isPending}
          onCancel={() => setStopOpen(false)}
          onConfirm={async () => {
            await stopMutation.mutateAsync(id);
            setStopOpen(false);
          }}
        />
      </DetailShell>
    </div>
  );
}

function AddressCell({
  label,
  flag,
  address,
}: {
  label: string;
  flag: string | null;
  address: string | null | undefined;
}): ReactNode {
  return (
    <div className="bg-surface px-4 py-3 space-y-1.5">
      <p className="ops-label flex items-center gap-1">
        <MapPin size={12} /> {label}
      </p>
      <p className="text-sm flex items-start gap-1.5">
        {flag && <Flag country={flag} />}
        <span className="min-w-0">{address || '—'}</span>
      </p>
    </div>
  );
}

function DetailLoadingSkeleton(): ReactNode {
  return (
    <div className="shipments-ops max-w-6xl mx-auto space-y-8">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-52 w-full rounded-md" />
      <Skeleton className="h-16 w-full rounded-md" />
      <Skeleton className="h-20 w-full rounded-md" />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <Skeleton className="h-96 w-full rounded-md" />
        <Skeleton className="h-80 w-full rounded-md" />
      </div>
    </div>
  );
}
