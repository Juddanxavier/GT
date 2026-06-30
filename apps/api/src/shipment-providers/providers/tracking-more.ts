import type { ShipmentProvider, TrackResult, DetectResult, NormalizedEvent, WebhookResult } from '../types';
import { normalizeEvent, normalizeTrackResponse } from '../normalizer';

const BASE = 'https://api.trackingmore.com/v4';

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Tracking-Api-Key': process.env.TRACKINGMORE_API_KEY || '',
  };
}

export class TrackingMoreProvider implements ShipmentProvider {
  readonly name = 'trackingmore';

  async detectCarrier(trackingNo: string): Promise<DetectResult | null> {
    try {
      const res = await fetch(`${BASE}/couriers/detect`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ tracking_number: trackingNo }),
      });
      const body = (await res.json()) as {
        meta?: { code?: number };
        data?: Array<{ courier_name?: string; courier_code?: string }>;
      };
      if (body.meta?.code === 200 && body.data?.length) {
        const c = body.data[0]!;
        if (c.courier_code) return { key: c.courier_code, name: c.courier_name ?? c.courier_code };
      }
      return null;
    } catch (err) {
      console.error('[trackingmore] detect error:', err);
      return null;
    }
  }

  async registerShipment(data: {
    trackingNo: string;
    orderNo?: string;
    courierCode?: string;
    customerName?: string;
    email?: string;
    phone?: string;
  }): Promise<boolean> {
    if (!data.courierCode) return false;

    try {
      const res = await fetch(`${BASE}/trackings/create`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify([{
          tracking_number: data.trackingNo,
          courier_code: data.courierCode,
        }]),
      });

      const body = (await res.json()) as {
        meta?: { code?: number };
        data?: { error?: Array<{ errorCode?: string }> };
      };

      if (body.meta?.code === 200) return true;

      const errCodes = body.data?.error?.map((e) => e.errorCode) ?? [];
      if (errCodes.includes('4101')) return true;

      console.error(`[trackingmore] create failed (${res.status}):`, JSON.stringify(body).slice(0, 500));
      return false;
    } catch (err) {
      console.error('[trackingmore] create error:', err);
      return false;
    }
  }

  async track(trackingNo: string, _carrier?: string): Promise<TrackResult> {
    try {
      const url = `${BASE}/trackings/get?tracking_numbers=${encodeURIComponent(trackingNo)}`;
      const res = await fetch(url, { method: 'GET', headers: headers() });

      if (!res.ok) {
        console.error(`[trackingmore] track failed (${res.status})`);
        return { carrierCode: 'trackingmore', currentStatus: 'exception', events: [] };
      }

      const body = (await res.json()) as {
        meta?: { code?: number };
        data?: Array<{
          delivery_status?: string;
          substatus?: string;
          courier_code?: string;
          origin_info?: {
            trackinfo?: Array<{
              checkpoint_date?: string;
              checkpoint_delivery_status?: string;
              checkpoint_delivery_substatus?: string;
              tracking_detail?: string;
              location?: string;
              country_iso2?: string;
              state?: string;
              city?: string;
            }>;
          };
          destination_info?: {
            trackinfo?: Array<{
              checkpoint_date?: string;
              checkpoint_delivery_status?: string;
              checkpoint_delivery_substatus?: string;
              tracking_detail?: string;
              location?: string;
              country_iso2?: string;
              state?: string;
              city?: string;
            }>;
          };
        }>;
      };

      if (body.meta?.code !== 200 || !body.data?.length) {
        return { carrierCode: 'trackingmore', currentStatus: 'pending', events: [] };
      }

      const item = body.data[0]!;
      const courierCode = item.courier_code ?? 'trackingmore';

      const originEvents = item.origin_info?.trackinfo ?? [];
      const destEvents = item.destination_info?.trackinfo ?? [];
      const allRaw = [...originEvents, ...destEvents];

      if (allRaw.length === 0) {
        return {
          carrierCode: courierCode,
          currentStatus: item.delivery_status ?? 'pending',
          events: [],
        };
      }

      const events: NormalizedEvent[] = allRaw.map((e) =>
        normalizeEvent({
          status: e.checkpoint_delivery_status,
          subStatus: e.checkpoint_delivery_substatus ?? item.substatus ?? '',
          description: e.tracking_detail ?? '',
          location: e.location ?? [e.city, e.state, e.country_iso2].filter(Boolean).join(', '),
          time: e.checkpoint_date,
          carrier: courierCode,
          carrierCode: courierCode,
        }),
      );

      return normalizeTrackResponse(courierCode, events);
    } catch (err) {
      console.error('[trackingmore] track error:', err);
      return { carrierCode: 'trackingmore', currentStatus: 'exception', events: [] };
    }
  }

  verifyWebhook(_body: string, signature: string | null): boolean {
    const secret = process.env.TRACKINGMORE_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    return signature === secret;
  }

  async processWebhook(body: unknown): Promise<WebhookResult | null> {
    try {
      const data = body as Record<string, unknown>;
      const trackingNo = data.tracking_number as string | undefined;
      if (!trackingNo) return null;

      const courierCode = (data.courier_code as string | undefined) ?? 'trackingmore';

      const originInfo = data.origin_info as Record<string, unknown> | undefined;
      const destInfo = data.destination_info as Record<string, unknown> | undefined;
      const originEvents = (originInfo?.trackinfo as Array<Record<string, unknown>> | undefined) ?? [];
      const destEvents = (destInfo?.trackinfo as Array<Record<string, unknown>> | undefined) ?? [];
      const allRaw = [...originEvents, ...destEvents];

      const events: NormalizedEvent[] = allRaw.map((e) =>
        normalizeEvent({
          status: e.checkpoint_delivery_status as string | undefined,
          subStatus: (e.checkpoint_delivery_substatus as string | undefined) ?? (data.substatus as string | undefined) ?? '',
          description: (e.tracking_detail as string | undefined) ?? '',
          location: (e.location as string | undefined) ?? [e.city, e.state, e.country_iso2].filter(Boolean).join(', '),
          time: e.checkpoint_date as string | undefined,
          carrier: courierCode,
          carrierCode: courierCode,
        }),
      );

      const result = normalizeTrackResponse(courierCode, events);
      return { trackingNo, events: result.events, currentStatus: result.currentStatus };
    } catch (err) {
      console.error('[trackingmore] processWebhook error:', err);
      return null;
    }
  }
}
