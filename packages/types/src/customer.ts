export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  tenantId: string;
  branchId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
