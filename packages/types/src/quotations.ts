export interface Quotation {
  id: string;
  quotationNo: string;
  status: string;
  customerId: string | null;
  totalAmount: string | null;
  tenantId: string;
  branchId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotationLineItem {
  id: string;
  quotationId: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}
