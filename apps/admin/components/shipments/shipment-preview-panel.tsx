'use client';

import type { ReactNode } from 'react';
import { ArrowRight, ExternalLink, RefreshCw, X } from 'lucide-react';
import { Button, Spinner } from '@heroui/react';
import { CopyButton } from '@/components/copy-button';
import { ShipmentStatusBadge } from '@/components/shipment-status-badge';
import { RouteJourneyStepper } from '@/components/shipments/route-journey-stepper';
import { ShipmentInvoicePanel } from '@/components/shipments/shipment-invoice-panel';
import { formatCurrency } from '@/lib/currency';
import {
  useShipment,
  useShipmentInvoice,
  useShipmentTracking,
  useTrackShipment,
} from '@/lib/queries';
import { TrackingTimeline } from '@/app/(dashboard)/shipments/[id]/tracking-timeline';

interface ShipmentPreviewPanelProps {
  trackingId: string;
  tenantCurrency?: string;
  onClose: () => void;
  onOpenFull: () => void;
}

export function ShipmentPreviewPanel({
  trackingId,
  tenantCurrency,
  onClose,
  onOpenFull,
}: ShipmentPreviewPanelProps): ReactNode {
  const { data: shipment, isLoading, error } = useShipment(trackingId);
  const { data: trackingData, isLoading: trackingLoading } = useShipmentTracking(trackingId);
  const { data: invoice, isLoading: invoiceLoading } = useShipmentInvoice(trackingId);
  const trackMutation = useTrackShipment();

  const events = trackingData?.events ?? [];

  return (
    <aside className="ops-panel-raised sticky-surface w-full xl:w-[380px] shrink-0 flex flex-col max-h-[calc(100vh-var(--sticky-sidebar-top)-1rem)] xl:sticky-sidebar overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ops-border)] bg-[var(--ops-surface)]">
        <span className="ops-label">Shipment Preview</span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onPress={onOpenFull} aria-label="Open full detail">
            <ExternalLink size={14} />
          </Button>
          <Button size="sm" variant="ghost" onPress={onClose} aria-label="Close preview">
            <X size={14} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 ops-grid-bg">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : error || !shipment ? (
          <p className="text-sm text-danger-soft-foreground text-center py-8">{error?.message ?? 'Failed to load'}</p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <ShipmentStatusBadge status={shipment.status} />
                <span className="text-xs text-muted">{shipment.carrier || 'Unknown carrier'}</span>
              </div>
              <h3 className="ops-mono font-semibold text-base flex items-center gap-1.5">
                {shipment.trackingNo}
                <CopyButton text={shipment.trackingNo} />
              </h3>
              {shipment.billAmount && (
                <p className="text-sm text-muted">
                  Bill: <span className="text-foreground font-medium">{formatCurrency(shipment.billAmount, tenantCurrency)}</span>
                </p>
              )}
            </div>

            <div className="ops-panel p-3">
              <RouteJourneyStepper
                status={shipment.status}
                origin={shipment.origin}
                destination={shipment.destination}
                compact
              />
            </div>

            <Button
              size="sm"
              variant="secondary"
              fullWidth
              isPending={trackMutation.isPending}
              onPress={() => trackMutation.mutate(trackingId)}
            >
              <RefreshCw size={14} /> Track Now
            </Button>

            <div className="ops-panel p-3">
              <ShipmentInvoicePanel
                shipmentId={trackingId}
                invoice={invoice}
                loading={invoiceLoading}
                tenantCurrency={tenantCurrency}
                compact
              />
            </div>

            <div className="ops-panel p-3">
              <p className="ops-label mb-2">Latest Events</p>
              {trackingLoading ? (
                <div className="flex justify-center py-4"><Spinner size="sm" /></div>
              ) : (
                <div className="max-h-[200px] overflow-y-auto">
                  <TrackingTimeline events={events.slice(0, 5)} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {shipment && (
        <div className="p-3 border-t border-[var(--ops-border)] bg-[var(--ops-surface)]">
          <Button variant="primary" fullWidth onPress={onOpenFull}>
            Open Full Detail <ArrowRight size={14} />
          </Button>
        </div>
      )}
    </aside>
  );
}
