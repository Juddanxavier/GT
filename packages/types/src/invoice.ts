export interface Invoice {
  id: string;
  invoiceNo: string;
  amount: string;
  status: 'unpaid' | 'paid' | 'cancelled';
  shipmentId: string;
  customerId: string | null;
  notes: string | null;
  tenantId: string;
  branchId: string | null;
  paidAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}
