import type { InternalStatus } from '@repo/types/status';

export type ShipmentData = {
  trackingNo: string;
  labelCode?: string;
  carrier?: string;
  origin?: string;
  destination?: string;
  estimatedDelivery?: string;
  customerName?: string;
  status: string;
};

export type Branding = {
  name: string;
  logo?: string;
  logoUrl?: string;
  color?: string;
  primaryColor?: string;
  companyName?: string;
};
