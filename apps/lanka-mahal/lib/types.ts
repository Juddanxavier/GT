export interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
}

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  branchId?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  tenantId?: string;
  createdAt?: Date;
  image?: string | null;
}
