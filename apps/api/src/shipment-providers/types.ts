import { type InternalStatus, INTERNAL_STATUSES } from '@repo/types/status';

export type { InternalStatus };
export { INTERNAL_STATUSES };

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

export type WebhookResult = {
  trackingNo: string;
  events: NormalizedEvent[];
  currentStatus: string;
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
  /**
   * Parse tracking events directly from a webhook payload instead of
   * making an API call. Returns null if the payload can't be parsed.
   */
  processWebhook(body: unknown): Promise<WebhookResult | null>;
}
