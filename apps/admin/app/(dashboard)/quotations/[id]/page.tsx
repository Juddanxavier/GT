'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card, Chip, Input, Label, Modal } from '@heroui/react';
import { api } from '@/lib/api';

type Customer = { id: string; name: string };
type LineItem = { id: string; description: string; quantity: number; unitPrice: number; total: number };

type Quotation = {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string | null;
  status: string;
  validUntil: string | null;
  notes: string | null;
  totalAmount: number;
  items: LineItem[];
  createdAt: string;
  updatedAt: string;
};

const STATUS_COLORS: Record<string, 'default' | 'accent' | 'success' | 'danger' | 'warning'> = { draft: 'default', sent: 'accent', accepted: 'success', rejected: 'danger', converted: 'warning' };

export default function QuotationDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [data, custs] = await Promise.all([
        api.get<Quotation>(`/api/quotations/${id}`),
        api.get<Customer[]>('/api/customers'),
      ]);
      setQuotation(data);
      setCustomers(custs);
      setCustomerId(data.customerId);
      setStatus(data.status);
      setValidUntil(data.validUntil ? data.validUntil.split('T')[0] ?? '' : '');
      setNotes(data.notes ?? '');
      setItems(data.items);
    } catch { router.push('/quotations'); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.patch<Quotation>(`/api/quotations/${id}`, {
        customerId, status, validUntil: validUntil || undefined, notes: notes || undefined, items,
      });
      setQuotation(data);
      setEditOpen(false);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!quotation) return;
    setDeleting(true);
    try {
      await api.delete(`/api/quotations/${id}`);
      router.push('/quotations');
    } finally { setDeleting(false); }
  }

  function openEdit() {
    if (!quotation) return;
    setCustomerId(quotation.customerId);
    setStatus(quotation.status);
    setValidUntil(quotation.validUntil ? quotation.validUntil.split('T')[0] ?? '' : '');
    setNotes(quotation.notes ?? '');
    setItems(quotation.items);
    setEditOpen(true);
  }

  async function handleAction(action: string) {
    setActionLoading(action);
    try {
      let data: Quotation;
      if (action === 'convert') {
        data = await api.post<Quotation>(`/api/quotations/${id}/convert`);
      } else {
        data = await api.patch(`/api/quotations/${id}/status`, { status: action });
      }
      setQuotation(data);
      setStatus(data.status);
    } finally { setActionLoading(null); }
  }

  function updateItem(index: number, field: keyof Omit<LineItem, 'id' | 'total'>, value: string | number) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as LineItem;
      next[index].total = next[index].quantity * next[index].unitPrice;
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { id: `new_${Date.now()}`, description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  }

  function removeItem(index: number) { setItems((prev) => prev.filter((_, i) => i !== index)); }

  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  const canSend = status === 'draft';
  const canAccept = status === 'sent';
  const canReject = status === 'draft' || status === 'sent';
  const canConvert = status === 'accepted';

  const sel = 'w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary';
  const ta = 'w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]';

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted">Loading...</p></div>;
  if (!quotation) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Quotation {quotation.quoteNumber}</h1>
          <p className="text-muted text-sm">Quotation details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onPress={openEdit}>Edit</Button>
          <Button variant="ghost" onPress={() => setDeleteOpen(true)}>Delete</Button>
          <Button variant="ghost" onPress={() => router.push('/quotations')}>Back</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip size="sm" variant="soft" color={STATUS_COLORS[quotation.status] ?? 'default'}>{quotation.status}</Chip>
        {canSend && <Button size="sm" variant="primary" isDisabled={actionLoading !== null} onPress={() => handleAction('sent')}>{actionLoading === 'sent' ? 'Sending...' : 'Send'}</Button>}
        {canAccept && <Button size="sm" variant="primary" isDisabled={actionLoading !== null} onPress={() => handleAction('accepted')}>{actionLoading === 'accepted' ? 'Accepting...' : 'Accept'}</Button>}
        {canReject && <Button size="sm" variant="ghost" isDisabled={actionLoading !== null} onPress={() => handleAction('rejected')}>{actionLoading === 'rejected' ? 'Rejecting...' : 'Reject'}</Button>}
        {canConvert && <Button size="sm" variant="primary" isDisabled={actionLoading !== null} onPress={() => handleAction('convert')}>{actionLoading === 'convert' ? 'Converting...' : 'Convert to Shipment'}</Button>}
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Quotation Information</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between"><span className="text-muted">Quote #:</span> <span className="font-mono">{quotation.quoteNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted">Customer:</span> <span>{quotation.customerName || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted">Status:</span> <span>{quotation.status}</span></div>
            <div className="flex justify-between"><span className="text-muted">Valid Until:</span> <span>{quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted">Notes:</span> <span className="text-right max-w-60">{quotation.notes || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted">Created:</span> <span>{new Date(quotation.createdAt).toLocaleDateString()}</span></div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium mb-3">Line Items</h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-xs text-muted">{item.quantity} × ${Number(item.unitPrice).toFixed(2)}</p>
                    </div>
                    <p className="font-medium">${item.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <p className="text-lg font-bold">Total: ${Number(quotation.totalAmount).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>

      <Modal.Backdrop isOpen={editOpen} onOpenChange={(v: boolean) => { if (!v) setEditOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Edit Quotation</Modal.Header>
            <Modal.Body>
              <form id="edit-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="customerId">Customer</Label>
                  <select id="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={sel}>
                    <option value="">Select customer...</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="status">Status</Label>
                    <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className={sel}>
                      {['draft', 'sent', 'accepted', 'rejected', 'converted'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="validUntil">Valid Until</Label>
                    <Input id="validUntil" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} fullWidth />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={ta} />
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium">Line Items</h3>
                    <Button size="sm" variant="secondary" type="button" onPress={addItem}>Add Item</Button>
                  </div>
                  {items.map((item, i) => (
                    <div key={item.id} className="flex items-end gap-3 p-3 border border-border rounded-lg mb-2">
                      <div className="flex-1 space-y-1">
                        <Label>Description</Label>
                        <Input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} fullWidth />
                      </div>
                      <div className="w-20 space-y-1">
                        <Label>Qty</Label>
                        <Input type="number" value={String(item.quantity)} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value) || 0)} />
                      </div>
                      <div className="w-28 space-y-1">
                        <Label>Unit Price</Label>
                        <Input type="number" value={String(item.unitPrice)} onChange={(e) => updateItem(i, 'unitPrice', Number(e.target.value) || 0)} />
                      </div>
                      <div className="w-24 space-y-1">
                        <Label>Total</Label>
                        <p className="py-2 text-sm font-medium">${item.total.toFixed(2)}</p>
                      </div>
                      {items.length > 1 && <Button size="sm" variant="ghost" type="button" onPress={() => removeItem(i)}>×</Button>}
                    </div>
                  ))}
                  <div className="flex justify-end pt-2">
                    <p className="font-bold text-lg">Total: ${grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </form>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" form="edit-form" isDisabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop isOpen={deleteOpen} onOpenChange={(v: boolean) => { if (!v) setDeleteOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Delete Quotation</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">Are you sure you want to delete quotation <strong>{quotation.quoteNumber}</strong>? This action cannot be undone.</p>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="danger" isPending={deleting} onPress={handleDelete}>{deleting ? 'Deleting...' : 'Delete'}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
