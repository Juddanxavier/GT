import { KPI_COLORS } from './kpi-colors';

/**
 * Parcel illustration per KPI card, paired with the ramp colour it is built from.
 *
 * `accent` is the same hex the card's value, trend, and sparkline are stroked with,
 * so the artwork and the data cannot drift apart. The badge inside each WebP is
 * generated from that hex; regenerating the art means regenerating from
 * `KPI_COLORS`, not picking a colour by eye.
 */
export const KPI_ICONS = {
  inTransit: { src: '/images/kpi/in-transit.webp', accent: KPI_COLORS.inTransit },
  outForDelivery: { src: '/images/kpi/out-for-delivery.webp', accent: KPI_COLORS.outForDelivery },
  delivered: { src: '/images/kpi/delivered.webp', accent: KPI_COLORS.delivered },
  exceptions: { src: '/images/kpi/exceptions.webp', accent: KPI_COLORS.exceptions },
  overdue: { src: '/images/kpi/overdue.webp', accent: KPI_COLORS.overdue },
  notTracked: { src: '/images/kpi/not-tracked.webp', accent: KPI_COLORS.notTracked },
  total: { src: '/images/kpi/total-parcels.webp', accent: KPI_COLORS.total },
} as const;

export type KpiIconKey = keyof typeof KPI_ICONS;
