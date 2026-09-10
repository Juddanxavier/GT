'use client';

import type { ReactNode } from 'react';
import { Ban, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { Button, Chip } from '@heroui/react';
import { AssignedTo } from '@/components/assigned-to';
import { ShipmentInvoicePanel, type ShipmentInvoiceData } from '@/components/shipments/shipment-invoice-panel';
import { STATUS_META } from '@/lib/status-config';
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
}: ShipmentCommandSidebarProps): ReactNode {
  const cfg = STATUS_META[shipment.status as keyof typeof STATUS_META] ?? {
    label: shipment.status.replace(/_/g, ' '),
    color: 'default' as const,
  };

  const daysSinceUpdate = shipment.lastTrackedAt
    ? Math.floor((Date.now() - new Date(shipment.lastTrackedAt).getTime()) / 86400000)
    : null;

  return (
    <aside className="space-y-4 xl:sticky-sidebar xl:sticky-surface">
      <div className="ops-panel-raised p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Chip size="sm" variant="soft" color={cfg.color as 'success' | 'danger' | 'warning' | 'default'}>
            {cfg.label}
          </Chip>
          {shipment.trackingRegistered && (
            <span className="text-xs text-success font-medium">Live tracking</span>
          )}
        </div>
        {shipment.estimatedDelivery && (
          <div className="flex justify-between text-xs">
            <span className="text-muted">Est. delivery</span>
            <span className="font-medium">
              {new Date(shipment.estimatedDelivery).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
        {daysSinceUpdate !== null && (
          <div className="flex justify-between text-xs">
            <span className="text-muted">Last update</span>
            <span className="font-medium">{daysSinceUpdate === 0 ? 'Today' : `${daysSinceUpdate}d ago`}</span>
          </div>
        )}
      </div>

      <div className="ops-panel-raised p-4">
        <ShipmentInvoicePanel
          shipmentId={shipmentId}
          invoice={invoice}
          loading={invoiceLoading}
          tenantCurrency={tenantCurrency}
        />
      </div>

      <div className="ops-panel-raised p-4 space-y-2">
        <p className="ops-label mb-2">Actions</p>
        <Button variant="secondary" size="sm" fullWidth onPress={onTrack} isPending={trackPending}>
          <RefreshCw size={14} /> Track Now
        </Button>
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

      <div className="ops-panel-raised p-4">
        <p className="ops-label mb-3">Customer</p>
        <AssignedTo
          shipmentId={shipmentId}
          customerId={shipment.customerId}
          customerName={shipment.customerName}
          customerEmail={shipment.contactEmail}
          customerPhone={shipment.contactPhone}
        />
      </div>
    </aside>
  );
}
