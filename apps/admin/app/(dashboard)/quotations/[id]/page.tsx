'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button, Chip, Input, Label, Modal, Skeleton } from '@heroui/react';
import { useQuotation, useCustomers, useUpdateQuotation, useDeleteQuotation, useUpdateQuotationStatus, useConvertQuotation, type LineItem } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';

const STATUS_COLORS: Record<string, 'default' | 'accent' | 'success' | 'danger' | 'warning'> = { draft: 'default', sent: 'accent', accepted: 'success', rejected: 'danger', converted: 'warning' };

const STATUS_ACTIONS: { from: string[]; action: string; label: string }[] = [
  { from: ['draft'], action: 'sent', label: 'Send' },
  { from: ['sent'], action: 'accepted', label: 'Accept' },
  { from: ['draft', 'sent'], action: 'rejected', label: 'Reject' },
  { from: ['accepted'], action: 'convert', label: 'Convert to Shipment' },
];

export default function QuotationDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  usePageTitle(`Quotation #${typeof id === 'string' ? id.slice(0, 8) : ''}`);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertTrackingNo, setConvertTrackingNo] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [editCustomerId, setEditCustomerId] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editValidUntil, setEditValidUntil] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<LineItem[]>([]);

  const { data: quotation, isPending: loading, isError } = useQuotation(id as string);
  const { data: customers = [] } = useCustomers();
  const updateQuotation = useUpdateQuotation();
  const deleteQuotation = useDeleteQuotation();
  const updateStatus = useUpdateQuotationStatus();
  const convertQuotation = useConvertQuotation();

  useEffect(() => { if (isError) setError('Quotation not found'); }, [isError]);

  function openEdit() {
    if (!quotation) return;
    setEditCustomerId(quotation.customerId);
    setEditStatus(quotation.status);
    setEditValidUntil(quotation.validUntil?.split('T')[0] ?? '');
    setEditNotes(quotation.notes ?? '');
    setEditItems(quotation.items.map((i: LineItem) => ({ ...i })));
    setEditOpen(true);
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    updateQuotation.mutate(
      { id: id as string, customerId: editCustomerId, status: editStatus, validUntil: editValidUntil || undefined, notes: editNotes || undefined, items: editItems.map((i) => ({ description: i.description, quantity: i.quantity, rate: i.unitPrice, amount: i.total })) },
      { onSuccess: () => setEditOpen(false), onError: (e2) => setError(e2?.message || 'Failed') },
    );
  }

  function updateEditItem(index: number, field: string, value: string | number) {
    setEditItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value } as unknown as LineItem;
      updated.total = updated.quantity * updated.unitPrice;
      return updated;
    }));
  }

  function addEditItem() { setEditItems((prev) => [...prev, { id: `new_${Date.now()}`, description: '', quantity: 1, unitPrice: 0, total: 0 }]); }

  function removeEditItem(index: number) { setEditItems((prev) => prev.filter((_, i) => i !== index)); }

  const editGrandTotal = editItems.reduce((sum, item) => sum + item.total, 0);

  function handleDelete() {
    if (!quotation) return;
    deleteQuotation.mutate(id as string, { onSuccess: () => router.push('/quotations'), onError: (e2) => setError(e2?.message || 'Failed') });
  }

  function handleAction(action: string) {
    setActionLoading(action);
    if (action === 'convert') { setConvertOpen(true); setConvertTrackingNo(''); }
    else { updateStatus.mutate({ id: id as string, status: action }, { onSettled: () => setActionLoading(null) }); }
  }

  function handleConvert() {
    if (!convertTrackingNo.trim()) return;
    convertQuotation.mutate({ id: id as string, trackingNo: convertTrackingNo }, { onSettled: () => { setActionLoading(null); setConvertOpen(false); } });
  }

  const sel = 'w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary';
  const ta = `${sel} min-h-[80px]`;

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48 rounded" />
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>
    </div>
  );
  if (!quotation) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <p className="text-lg font-medium">Quotation not found</p>
      <p className="text-sm text-muted">The quotation you're looking for doesn't exist or has been removed.</p>
      <Button variant="secondary" onPress={() => router.push('/quotations')}>Back to Quotations</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onPress={() => router.push('/quotations')}>
          <ArrowLeft size={16} /> Back
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-muted" />
              <div>
                <h1 className="text-xl font-bold">{quotation.quoteNo}</h1>
                <p className="text-sm text-muted">Quotation Details</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Chip size="sm" variant="soft" color={STATUS_COLORS[quotation.status] ?? 'default'}>{quotation.status}</Chip>
              <Button size="sm" variant="secondary" onPress={openEdit}>Edit</Button>
              <Button size="sm" variant="ghost" onPress={() => setDeleteOpen(true)}>Delete</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Quote No', value: quotation.quoteNo },
              { label: 'Customer', value: quotation.customerName || '—' },
              { label: 'Status', value: quotation.status },
              { label: 'Valid Until', value: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : '—' },
              { label: 'Created', value: new Date(quotation.createdAt).toLocaleDateString() },
              { label: 'Notes', value: quotation.notes || '—', span: true },
            ].map(({ label, value, span }) => (
              <div key={label} className={span ? 'col-span-2 md:col-span-4' : ''}>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm font-medium">{String(value)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-medium mb-4">Line Items</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted uppercase tracking-wider border-b border-border">
                  <th className="text-left pb-2 font-medium">Description</th>
                  <th className="text-right pb-2 font-medium">Qty</th>
                  <th className="text-right pb-2 font-medium">Rate</th>
                  <th className="text-right pb-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item: LineItem) => (
                  <tr key={item.id} className="border-b border-border/50">
                    <td className="py-2.5">{item.description}</td>
                    <td className="py-2.5 text-right">{item.quantity}</td>
                    <td className="py-2.5 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                    <td className="py-2.5 text-right font-medium">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-4 pt-4 border-t border-border">
              <p className="text-lg font-bold">Total: ${Number(quotation.total).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_ACTIONS.filter((a) => a.from.includes(quotation.status)).map((a) => (
          <Button key={a.action} size="sm" variant={a.action === 'rejected' ? 'danger' : 'primary'} isDisabled={actionLoading !== null} onPress={() => handleAction(a.action)}>
            {actionLoading === a.action ? 'Processing...' : a.label}
          </Button>
        ))}
      </div>

      <Modal.Backdrop isOpen={editOpen} onOpenChange={(v) => { if (!v) setEditOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Edit Quotation</Modal.Header>
            <Modal.Body>
              {error && <p className="text-sm text-danger mb-2">{error}</p>}
              <form id="edit-form" onSubmit={submitEdit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="editCustomerId">Customer</Label>
                  <select id="editCustomerId" value={editCustomerId} onChange={(e) => setEditCustomerId(e.target.value)} className={sel}>
                    <option value="">Select customer...</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="editStatus">Status</Label>
                    <select id="editStatus" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={sel}>
                      {['draft', 'sent', 'accepted', 'rejected', 'converted'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="editValidUntil">Valid Until</Label>
                    <Input id="editValidUntil" type="date" value={editValidUntil} onChange={(e) => setEditValidUntil(e.target.value)} fullWidth />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editNotes">Notes</Label>
                  <textarea id="editNotes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className={ta} />
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium">Line Items</h3>
                    <Button size="sm" variant="secondary" type="button" onPress={addEditItem}>Add Item</Button>
                  </div>
                  {editItems.map((item, i) => (
                    <div key={item.id} className="flex items-end gap-3 p-3 border border-border rounded-lg mb-2">
                      <div className="flex-1 space-y-1">
                        <Label>Description</Label>
                        <Input value={item.description} onChange={(e) => updateEditItem(i, 'description', e.target.value)} fullWidth />
                      </div>
                      <div className="w-20 space-y-1">
                        <Label>Qty</Label>
                        <Input type="number" value={String(item.quantity)} onChange={(e) => updateEditItem(i, 'quantity', Number(e.target.value) || 0)} />
                      </div>
                      <div className="w-28 space-y-1">
                        <Label>Rate</Label>
                        <Input type="number" value={String(item.unitPrice)} onChange={(e) => updateEditItem(i, 'unitPrice', Number(e.target.value) || 0)} />
                      </div>
                      <div className="w-24 space-y-1">
                        <Label>Total</Label>
                        <p className="py-2 text-sm font-medium">${item.total.toFixed(2)}</p>
                      </div>
                      {editItems.length > 1 && <Button size="sm" variant="ghost" type="button" onPress={() => removeEditItem(i)}>×</Button>}
                    </div>
                  ))}
                  <div className="flex justify-end pt-2">
                    <p className="font-bold text-lg">Total: ${editGrandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </form>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" form="edit-form" isDisabled={updateQuotation.isPending}>{updateQuotation.isPending ? 'Saving...' : 'Save'}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop isOpen={deleteOpen} onOpenChange={(v) => { if (!v) setDeleteOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Delete Quotation</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">Are you sure you want to delete quotation <strong>{quotation.quoteNo}</strong>? This cannot be undone.</p>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="danger" isPending={deleteQuotation.isPending} onPress={handleDelete}>{deleteQuotation.isPending ? 'Deleting...' : 'Delete'}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop isOpen={convertOpen} onOpenChange={(v) => { if (!v) setConvertOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Convert to Shipment</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted mb-3">Enter tracking number for the new shipment:</p>
              <Input value={convertTrackingNo} onChange={(e) => setConvertTrackingNo(e.target.value)} placeholder="Tracking number" fullWidth required />
              {convertQuotation.isError && <p className="text-sm text-danger mt-2">{convertQuotation.error?.message || 'Conversion failed'}</p>}
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setConvertOpen(false)}>Cancel</Button>
              <Button variant="primary" isDisabled={!convertTrackingNo.trim()} isPending={convertQuotation.isPending} onPress={handleConvert}>
                {convertQuotation.isPending ? 'Converting...' : 'Convert'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
