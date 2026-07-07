export const INTERNAL_STATUSES = [
  'pending', 'info_received', 'in_transit', 'out_for_delivery',
  'failed_attempt', 'delivered', 'exception', 'expired',
  'available_for_pickup',
] as const;

export type InternalStatus = (typeof INTERNAL_STATUSES)[number];

export const STATUS_LABELS: Record<InternalStatus, string> = {
  pending: 'Pending',
  info_received: 'Info Received',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  failed_attempt: 'Failed Attempt',
  delivered: 'Delivered',
  exception: 'Exception',
  expired: 'Expired',
  available_for_pickup: 'Available for Pickup',
};
