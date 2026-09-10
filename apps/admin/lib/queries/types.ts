export interface Branch {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiBranch extends Branch {
  tenantId: string;
}

export interface Shipment {
  id: string;
  trackingNo: string;
  status: string;
  customerId: string | null;
  customerName: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  carrier: string | null;
  origin: string | null;
  destination: string | null;
  senderAddress: Record<string, string> | null;
  recipientAddress: Record<string, string> | null;
  billAmount: string | null;
  labelCode: string | null;
  trackingRegistered: boolean;
  lastTrackedAt: string | null;
  createdAt: string;
}

export interface ShipmentDetail extends Shipment {
  trackingProvider: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  updatedAt: string;
}

export interface TrackingEvent {
  id: string;
  status: string;
  subStatus: string | null;
  description: string | null;
  location: string | null;
  carrier: string | null;
  eventTime: string;
}

export interface CreateShipmentInput {
  trackingNo: string;
  customerId?: string | null;
  customerName?: string;
  courierCode?: string;
  contactEmail?: string;
  contactPhone?: string;
  carrier?: string;
  estimatedDelivery?: string;
  origin?: string;
  destination?: string;
  senderAddress?: {
    name?: string;
    phone?: string;
    email?: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  recipientAddress?: {
    name?: string;
    phone?: string;
    email?: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  labelCode?: string;
  billAmount?: number;
  branchId?: string;
  tenantId?: string;
  status?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  counts?: Record<string, number>;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  image: string | null;
  role: string;
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
  tenantId: string | null;
  branchId: string | null;
  address: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  amount: string;
  status: string;
  emailCount: number;
  trackingNo: string;
  customerId: string;
  customerName: string | null;
  paidAt: string;
  createdAt: string;
}

export interface InvoiceDetail extends Invoice {
  shipmentId: string;
  carrier: string | null;
  origin: string | null;
  destination: string | null;
  senderAddress: Record<string, string> | null;
  recipientAddress: Record<string, string> | null;
  companyName: string;
  currency?: string | null;
}

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export interface NotificationPrefs {
  deliveryEmail: boolean;
  deliveryWhatsapp: boolean;
  exceptionEmail: boolean;
  exceptionWhatsapp: boolean;
  generalEmail: boolean;
  generalWhatsapp: boolean;
}

export interface ShippingRate {
  id: string;
  rateCardId: string;
  serviceType: string;
  weightFrom: string;
  weightTo: string;
  rate: string;
}

export interface RateCard {
  id: string;
  tenantId: string;
  destinationCountry: string;
  currency: string;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  rates?: ShippingRate[];
}
