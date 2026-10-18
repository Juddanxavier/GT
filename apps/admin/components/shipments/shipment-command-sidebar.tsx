'use client';

import type { ReactNode } from 'react';
import { Ban, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { Button, cn } from '@heroui/react';
import { AssignedTo } from '@/components/assigned-to';
import { ShipmentInvoicePanel, type ShipmentInvoiceData } from '@/components/shipments/shipment-invoice-panel';
import { StatusBadge } from '@repo/ui/status-badge';
import type { ShipmentDetail } from '@/lib/queries';

interface ShipmentCommandSidebarProps {
  shipment: ShipmentDetail;
  shipmentId: string;
  invoice: ShipmentInvoiceData | null | undefined;
  invoiceLoading?: boolean;
  tenantCurrency?: string;
  onTrack: () => void;
  trackPending?: boolean;
  onStopTracking: () => void;
  stopPending?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

/** One section of the command rail. The rail is a single panel divided by
 * hairlines, not a stack of bordered boxes. */
function RailSection({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <section className="border-b border-border last:border-b-0">
      <h2 className="ops-label px-4 pt-4">{title}</h2>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

export function ShipmentCommandSidebar({
  shipment,
  shipmentId,
  invoice,
  invoiceLoading,
  tenantCurrency,
  onTrack,
  trackPending,
  onStopTracking,
  stopPending,
  onEdit,
  onDelete,
  className,
}: ShipmentCommandSidebarProps): ReactNode {
  const daysSinceUpdate = shipment.lastTrackedAt
    ? Math.floor((Date.now() - new Date(shipment.lastTrackedAt).getTime()) / 86400000)
    : null;

  return (
    <aside className={cn('xl:sticky-sidebar', className)}>
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <RailSection title="Tracking">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={shipment.status} />
              {shipment.trackingRegistered && (
                <span className="text-xs font-medium text-success-soft-foreground">Live tracking</span>
              )}
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-muted">Last update</span>
              <span className="font-medium tabular-nums">
                {daysSinceUpdate === null
                  ? '—'
                  : daysSinceUpdate === 0
                    ? 'Today'
                    : `${daysSinceUpdate}d ago`}
              </span>
            </div>
            <Button variant="secondary" size="sm" fullWidth onPress={onTrack} isPending={trackPending}>
              <RefreshCw size={14} /> Track Now
            </Button>
          </div>
        </RailSection>

        <RailSection title="Invoice">
          <ShipmentInvoicePanel
            shipmentId={shipmentId}
            invoice={invoice}
            loading={invoiceLoading}
            tenantCurrency={tenantCurrency}
            showHeader={false}
          />
        </RailSection>

        <RailSection title="Actions">
          <div className="space-y-2">
            <Button variant="secondary" size="sm" fullWidth onPress={onEdit}>
              <Pencil size={14} /> Edit
            </Button>
            {shipment.trackingRegistered && (
              <Button variant="ghost" size="sm" fullWidth onPress={onStopTracking} isPending={stopPending}>
                <Ban size={14} /> Stop Tracking
              </Button>
            )}
            <Button variant="danger" size="sm" fullWidth onPress={onDelete}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        </RailSection>

        <RailSection title="Customer">
          <AssignedTo
            shipmentId={shipmentId}
            customerId={shipment.customerId}
            customerName={shipment.customerName}
            customerEmail={shipment.contactEmail}
            customerPhone={shipment.contactPhone}
          />
        </RailSection>
      </div>
    </aside>
  );
}
