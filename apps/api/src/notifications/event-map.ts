import type { InternalStatus } from '../shipment-providers/types';
import type { EventType } from '../email/templates';

const MAJOR_EVENTS: InternalStatus[] = [
  'info_received',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'exception',
  'failed_attempt',
];

const STATUS_TO_EVENT: Record<string, EventType> = {
  info_received: 'InfoReceived',
  in_transit: 'InTransit',
  out_for_delivery: 'OutForDelivery',
  delivered: 'Delivered',
  exception: 'Exception',
  failed_attempt: 'Exception',
};

export function isMajorEvent(status: InternalStatus): boolean {
  return MAJOR_EVENTS.includes(status);
}

export function statusToEventType(status: InternalStatus): EventType | null {
  return STATUS_TO_EVENT[status] ?? null;
}
