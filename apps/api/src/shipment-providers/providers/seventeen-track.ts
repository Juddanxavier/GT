import type { ShipmentProvider, TrackResult, DetectResult, NormalizedEvent, WebhookResult } from '../types';
import { normalizeEvent, normalizeTrackResponse } from '../normalizer';
import type { Logger } from '../../logger';
import { createHmac } from 'node:crypto';

const BASE = 'https://api.17track.net/track/v2.4';

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    '17token': process.env.TRACK_API_KEY || '',
  };
}

interface AcceptedItem {
  number?: string;
  carrier?: number;
  track_info?: {
    latest_status?: {
      status?: string;
      sub_status?: string;
      sub_status_descr?: string | null;
    };
    shipping_info?: {
      shipper_address?: { country?: string; state?: string; city?: string };
      recipient_address?: { country?: string; state?: string; city?: string };
    };
    time_metrics?: {
      estimated_delivery_date?: {
        from?: string | null;
        to?: string | null;
      };
    };
    tracking?: {
      providers?: Array<{
        provider?: { key?: number; name?: string };
        events?: Array<{
          time_iso?: string | null;
          time_utc?: string | null;
          description?: string;
          location?: string;
          stage?: string;
          sub_status?: string;
        }>;
      }>;
    };
  };
}

function parseAccepted(body: { code?: number; data?: { accepted?: AcceptedItem[] } }): {
  item: AcceptedItem | null;
  error: string | null;
} {
  if (body.code !== 0) {
    return { item: null, error: `17TRACK error code ${body.code}` };
  }
  const items = body.data?.accepted;
  if (!items?.length) {
    return { item: null, error: 'No accepted data' };
  }
  return { item: items[0]!, error: null };
}

export class SeventeenTrackProvider implements ShipmentProvider {
  readonly name = '17track';

  async detectCarrier(_trackingNo: string, _log: Logger): Promise<DetectResult | null> {
    return null;
  }

  async stopTracking(
    data: { trackingNo: string; carrierCode?: string },
    log: Logger,
  ): Promise<boolean> {
    try {
      const payload: Record<string, unknown> = { number: data.trackingNo };
      if (data.carrierCode) payload.carrier = Number(data.carrierCode);

      const res = await fetch(`${BASE}/stoptrack`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify([payload]),
      });

      const json = (await res.json()) as { code?: number };
      if (json.code === 0) return true;

      log.error({ trackingNo: data.trackingNo, body: JSON.stringify(json).slice(0, 500) }, 'stoptrack failed');
      return false;
    } catch (err) {
      log.error({ err, trackingNo: data.trackingNo }, 'stoptrack request failed');
      return false;
    }
  }

  async registerShipment(
    data: {
      trackingNo: string;
      orderNo?: string;
      courierCode?: string;
      email?: string;
    },
    log: Logger,
  ): Promise<boolean> {
    try {
      const body: Record<string, unknown> = { number: data.trackingNo };
      if (data.orderNo) body.order_no = data.orderNo;
      if (data.email) body.email = data.email;
      const carrierNum = Number(data.courierCode);
      if (!isNaN(carrierNum)) body.carrier = carrierNum;

      const res = await fetch(`${BASE}/register`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify([body]),
      });

      const json = (await res.json()) as {
        code?: number;
        data?: { accepted?: Array<{ carrier?: number }>; rejected?: Array<{ error?: { code?: number; message?: string } }> };
      };

      if (json.code === 0 && json.data?.accepted?.length) return true;

      const rejected = json.data?.rejected?.[0];
      if (rejected?.error?.code === -18019901) {
        log.warn({ trackingNo: data.trackingNo }, 'already registered');
        return true;
      }

      log.error({ trackingNo: data.trackingNo, body: JSON.stringify(json).slice(0, 500) }, 'register failed');
      return false;
    } catch (err) {
      log.error({ err, trackingNo: data.trackingNo }, 'register request failed');
      return false;
    }
  }

  async track(trackingNo: string, carrier: string | undefined, log: Logger): Promise<TrackResult> {
    try {
      const payload: Record<string, unknown> = { number: trackingNo };
      if (carrier) {
        const code = Number(carrier);
        if (!isNaN(code)) payload.carrier = code;
      }

      const res = await fetch(`${BASE}/gettrackinfo`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify([payload]),
      });

      if (!res.ok) {
        log.error({ status: res.status, trackingNo }, 'track request failed');
        return { carrierCode: '17track', currentStatus: 'exception', events: [] };
      }

      const json = (await res.json()) as {
        code?: number;
        data?: { accepted?: AcceptedItem[] };
      };

      const { item, error } = parseAccepted(json);
      if (!item) {
        log.error({ trackingNo, reason: error }, 'track rejected');
        return { carrierCode: '17track', currentStatus: 'pending', events: [] };
      }

      const carrierCode = String(item.carrier ?? '17track');
      const latestStatus = item.track_info?.latest_status;
      const status = latestStatus?.status ?? 'pending';

      const rawEvents: NormalizedEvent[] = [];
      for (const p of item.track_info?.tracking?.providers ?? []) {
        for (const e of p.events ?? []) {
          const stage = e.stage ?? e.sub_status ?? status;
          rawEvents.push(
            normalizeEvent({
              status: stage,
              subStatus: e.sub_status ?? stage,
              description: e.description ?? '',
              location: e.location ?? '',
              time: e.time_utc ?? e.time_iso ?? undefined,
              carrier: p.provider?.name ?? carrierCode,
              carrierCode,
            }),
          );
        }
      }

      const result = normalizeTrackResponse(carrierCode, rawEvents);

      const si = item.track_info?.shipping_info;
      const origin = [si?.shipper_address?.city, si?.shipper_address?.state, si?.shipper_address?.country]
        .filter(Boolean).join(', ') || undefined;
      const destination = [si?.recipient_address?.city, si?.recipient_address?.state, si?.recipient_address?.country]
        .filter(Boolean).join(', ') || undefined;

      const edd = item.track_info?.time_metrics?.estimated_delivery_date;
      const estimatedDelivery = edd?.from || edd?.to ? (edd.from ?? edd.to) ?? undefined : undefined;

      const delivered = rawEvents.find((e) => e.status === 'delivered');
      const actualDelivery = delivered?.eventTime.toISOString();

      return { ...result, estimatedDelivery, actualDelivery, origin, destination };

    } catch (err) {
      log.error({ err, trackingNo }, 'track failed');
      return { carrierCode: '17track', currentStatus: 'exception', events: [] };
    }
  }

  verifyWebhook(body: string, signature: string | null): boolean {
    const secret = process.env.TRACK_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    const hmac = createHmac('sha256', secret).update(body).digest('hex');
    return hmac === signature;
  }

  async processWebhook(body: unknown, log: Logger): Promise<WebhookResult | null> {
    try {
      // 17TRACK webhooks may wrap the payload in { event: 'tracking', data: { ... } }
      // or send the raw tracking object directly.
      const raw = (body as Record<string, unknown>)?.data as Record<string, unknown> | undefined ?? body as Record<string, unknown>;
      const trackingNo = raw.number as string | undefined;
      if (!trackingNo) return null;

      const carrierCode = String(raw.carrier ?? '17track');
      const trackInfo = raw.track_info as Record<string, unknown> | undefined;

      const rawEvents: NormalizedEvent[] = [];
      const providers = (trackInfo?.tracking as Record<string, unknown> | undefined)?.providers as Array<Record<string, unknown>> | undefined;
      for (const p of providers ?? []) {
        const providerName = (p.provider as Record<string, unknown> | undefined)?.name as string | undefined;
        for (const e of (p.events as Array<Record<string, unknown>> | undefined) ?? []) {
          const stage = (e.stage ?? e.sub_status ?? (trackInfo?.latest_status as Record<string, unknown> | undefined)?.status) as string | undefined;
          rawEvents.push(
            normalizeEvent({
              status: stage,
              subStatus: (e.sub_status as string | undefined) ?? stage,
              description: (e.description as string | undefined) ?? '',
              location: (e.location as string | undefined) ?? '',
              time: (e.time_utc as string | undefined) ?? (e.time_iso as string | undefined),
              carrier: providerName ?? carrierCode,
              carrierCode,
            }),
          );
        }
      }

      const result = normalizeTrackResponse(carrierCode, rawEvents);
      return { trackingNo, events: result.events, currentStatus: result.currentStatus };
    } catch (err) {
      log.error({ err, provider: this.name }, 'webhook processing failed');
      return null;
    }
  }
}
