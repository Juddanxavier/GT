import { type InternalStatus, INTERNAL_STATUSES } from '@repo/types/status';
import type { Logger } from '../logger';

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
  detectCarrier(trackingNo: string, log: Logger): Promise<DetectResult | null>;
  track(trackingNo: string, carrier: string | undefined, log: Logger): Promise<TrackResult>;
  registerShipment?(
    data: {
      trackingNo: string;
      orderNo?: string;
      courierCode?: string;
      customerName?: string;
      email?: string;
      phone?: string;
      companyName?: string;
      countryName?: string;
    },
    log: Logger,
  ): Promise<boolean>;
  stopTracking?(
    data: {
      trackingNo: string;
      carrierCode?: string;
      carrier?: string;
    },
    log: Logger,
  ): Promise<boolean>;
  verifyWebhook(body: string, signature: string | null): boolean;
  /**
   * Parse tracking events directly from a webhook payload instead of
   * making an API call. Returns null if the payload can't be parsed.
   */
  processWebhook(body: unknown, log: Logger): Promise<WebhookResult | null>;
}
