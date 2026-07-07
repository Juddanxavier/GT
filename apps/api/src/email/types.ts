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
  companyName: string;
  logoUrl?: string;
  supportEmail?: string;
  primaryColor?: string;
};
