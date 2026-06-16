export const INTERNAL_STATUSES = [
  'pending', 'info_received', 'in_transit', 'out_for_delivery',
  'failed_attempt', 'delivered', 'exception', 'expired',
] as const;

export type InternalStatus = (typeof INTERNAL_STATUSES)[number];

export type NormalizedEvent = {
  status: InternalStatus;
  subStatus: string;
  description: string;
  location: string;
  carrier: string;
  carrierCode: string;
  eventTime: Date;
  raw: unknown;
};

export type TrackResult = {
  carrierCode: string;
  currentStatus: string;
  events: NormalizedEvent[];
  estimatedDelivery?: string;
  actualDelivery?: string;
  origin?: string;
  destination?: string;
  payload?: unknown;
};

export type DetectResult = {
  key: string;
  name: string;
};

export interface ShipmentProvider {
  readonly name: string;
  detectCarrier(trackingNo: string): Promise<DetectResult | null>;
  track(trackingNo: string, carrier?: string): Promise<TrackResult>;
  registerShipment?(data: {
    trackingNo: string;
    orderNo?: string;
    courierCode?: string;
    customerName?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    countryName?: string;
  }): Promise<boolean>;
  stopTracking?(data: {
    trackingNo: string;
    carrierCode?: string;
    carrier?: string;
  }): Promise<boolean>;
  verifyWebhook(body: string, signature: string | null): boolean;
}
