export type Branding = {
  logoUrl?: string;
  primaryColor?: string;
  companyName?: string;
};

export type ShipmentData = {
  trackingNo: string;
  carrier?: string;
  origin?: string;
  destination?: string;
  estimatedDelivery?: string;
  customerName?: string;
  status: string;
};
