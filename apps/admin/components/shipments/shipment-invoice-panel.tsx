'use client';

import type { ReactNode } from 'react';
import { FileText, Plus, Send } from 'lucide-react';
import { Button, Spinner } from '@heroui/react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { useGenerateInvoice } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/toast';
import { useTenantFilter } from '@/lib/tenant-filter-context';

export interface ShipmentInvoiceData {
  id: string;
  invoiceNo: string;
  amount: string;
  emailCount: number;
  createdAt: string;
}

interface ShipmentInvoicePanelProps {
  shipmentId: string;
  invoice: ShipmentInvoiceData | null | undefined;
  loading?: boolean;
  tenantCurrency?: string;
  compact?: boolean;
  /** Set false when the caller already renders a section heading for it. */
  showHeader?: boolean;
}

export function ShipmentInvoicePanel({
  shipmentId,
  invoice,
  loading,
  tenantCurrency,
  compact = false,
  showHeader = true,
}: ShipmentInvoicePanelProps): ReactNode {
  const { toast } = useToast();
  const { tenantFilter } = useTenantFilter();
  const queryClient = useQueryClient();
  const generateInvoice = useGenerateInvoice();

  async function viewPdf(invoiceId: string) {
    try {
      const headers: Record<string, string> = {};
      if (tenantFilter) headers['X-Tenant-ID'] = tenantFilter;
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`, { credentials: 'include', headers });
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (e) {
      toast('error', 'Failed to generate PDF', e instanceof Error ? e.message : undefined);
    }
  }

  async function sendInvoice(invoiceId: string) {
    try {
      await api.post(`/api/invoices/${invoiceId}/send`);
      queryClient.invalidateQueries({ queryKey: ['shipment-invoice', shipmentId] });
      toast('success', 'Invoice sent');
    } catch (e) {
      toast('error', 'Failed to send invoice', e instanceof Error ? e.message : undefined);
    }
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {showHeader && (
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-[var(--ops-accent)]" />
          <span className="ops-label">Invoice</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : invoice ? (
        <div className="space-y-2">
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted">Invoice #</span>
            <span className="ops-mono font-medium">{invoice.invoiceNo}</span>
          </div>
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted">Amount</span>
            <span className="font-semibold">{formatCurrency(invoice.amount, tenantCurrency)}</span>
          </div>
          <div className="flex justify-between text-xs gap-2">
            <span className="text-muted">Sent today</span>
            <span>{invoice.emailCount}/2</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="secondary" onPress={() => viewPdf(invoice.id)}>
              <FileText size={14} /> PDF
            </Button>
            <Button size="sm" variant="secondary" onPress={() => sendInvoice(invoice.id)}>
              <Send size={14} /> Send
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-3 space-y-2">
          <p className="text-xs text-muted">No invoice yet</p>
          <Button
            size="sm"
            variant="secondary"
            fullWidth
            isPending={generateInvoice.isPending}
            onPress={async () => {
              try {
                await generateInvoice.mutateAsync(shipmentId);
                toast('success', 'Invoice generated');
              } catch (e) {
                if ((e as { status?: number })?.status === 409) {
                  queryClient.invalidateQueries({ queryKey: ['shipment-invoice', shipmentId] });
                } else {
                  toast('error', 'Failed to generate invoice', e instanceof Error ? e.message : undefined);
                }
              }
            }}
          >
            <Plus size={14} /> Generate Invoice
          </Button>
        </div>
      )}
    </div>
  );
}
