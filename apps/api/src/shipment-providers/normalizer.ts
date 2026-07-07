import { INTERNAL_STATUSES, type InternalStatus, type NormalizedEvent } from './types';

const INTERNAL_SET = new Set<string>(INTERNAL_STATUSES);

// ponytail: if 17TRACK adds new statuses, this map needs extension
const STATUS_MAP: Record<string, InternalStatus> = {
  NotFound: 'pending',
  InfoReceived: 'info_received',
  InTransit: 'in_transit',
  Expired: 'expired',
  AvailableForPickup: 'available_for_pickup',
  OutForDelivery: 'out_for_delivery',
  DeliveryFailure: 'failed_attempt',
  Delivered: 'delivered',
  Exception: 'exception',
  PENDING: 'pending',
  INFO_RECEIVED: 'info_received',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  DELIVERY_ATTEMPT_FAILED: 'failed_attempt',
  EXCEPTION: 'exception',
  AVAILABLE_FOR_PICKUP: 'available_for_pickup',
  EXPIRED: 'expired',
};

export function normalizeStatus(status: string): InternalStatus {
  if (INTERNAL_SET.has(status)) return status as InternalStatus;
  return STATUS_MAP[status] ?? 'exception';
}

export function parseDate(input: string | Date | undefined | null): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) return parsed;
  const formats = [
    /^(\d{2})-(\w{3})-(\d{4})$/,
    /^(\d{4})-(\d{2})-(\d{2})/,
    /^(\d{2})\/(\d{2})\/(\d{4})/,
  ];
  for (const fmt of formats) {
    const m = input.match(fmt);
    if (m) {
      if (fmt === formats[0]) {
        const months: Record<string, number> = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
        };
        const d = new Date(Number(m[3]), months[m[2]!] ?? 0, Number(m[1]));
        if (!isNaN(d.getTime())) return d;
      }
      const d = new Date(input);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}

export function normalizeEvent(raw: {
  status?: string;
  subStatus?: string;
  description?: string;
  location?: string;
  carrier?: string;
  carrierCode?: string;
  time?: Date | string;
  timeUtc?: Date | string;
  stage?: string;
  sub_status?: string;
  time_utc?: Date | string;
  activityDescription?: string;
  ActionDate?: string;
  ActionTime?: string;
  ActionLocation?: string;
  ActivityDescription?: string;
}): NormalizedEvent {
  const stage = raw.stage ?? raw.status ?? 'pending';
  const subStatus = raw.subStatus ?? raw.sub_status ?? stage;
  const description = raw.description ?? raw.activityDescription ?? raw.ActivityDescription ?? '';
  const location = raw.location ?? raw.ActionLocation ?? '';
  const parsedTime = parseDate(raw.time ?? raw.timeUtc ?? raw.time_utc ?? raw.ActionDate);
  if (raw.ActionTime && parsedTime instanceof Date && !isNaN(parsedTime.getTime())) {
    const parts = raw.ActionTime.match(/(\d{2}):(\d{2})/);
    if (parts) {
      parsedTime.setHours(Number(parts[1]), Number(parts[2]));
    }
  }

  return {
    status: normalizeStatus(stage),
    subStatus,
    description,
    location,
    carrier: raw.carrier ?? '',
    carrierCode: raw.carrierCode ?? '',
    eventTime: parsedTime,
    raw,
  };
}

export function normalizeTrackResponse(
  carrierCode: string,
  events: NormalizedEvent[],
): { carrierCode: string; currentStatus: string; events: NormalizedEvent[] } {
  const sorted = [...events].sort((a, b) => b.eventTime.getTime() - a.eventTime.getTime());
  const currentStatus = sorted[0]?.status ?? 'pending';
  return { carrierCode, currentStatus, events: sorted };
}
