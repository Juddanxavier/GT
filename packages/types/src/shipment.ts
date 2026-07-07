import type { InternalStatus } from './status';

export interface TrackingEvent {
  id: string;
  shipmentId: string;
  status: InternalStatus;
  subStatus: string;
  description: string;
  location: string;
  carrier: string;
  carrierCode: string;
  eventTime: Date;
  providerTips?: Record<string, unknown>;
  tenantId: string;
  createdAt: Date;
}

export interface Shipment {
  id: string;
  trackingNo: string;
  status: InternalStatus;
  customerId: string | null;
  carrier: string | null;
  estimatedDelivery: Date | null;
  actualDelivery: Date | null;
  origin: string | null;
  destination: string | null;
  billAmount: string | null;
  customerName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  tenantId: string;
  branchId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShipmentCreateInput {
  trackingNo: string;
  carrier?: string;
  origin?: string;
  destination?: string;
  customerName?: string;
  contactEmail?: string;
  contactPhone?: string;
  branchId?: string;
}
