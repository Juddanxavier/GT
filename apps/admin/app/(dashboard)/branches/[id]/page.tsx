'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card, Input, Label, Modal } from '@heroui/react';
import { api } from '@/lib/api';

type Branch = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export default function BranchDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await api.get<Branch>(`/api/branches/${id}`);
      setBranch(data);
      setName(data.name);
      setPhone(data.phone ?? '');
      setEmail(data.email ?? '');
      setAddress(data.address ?? '');
    } catch { router.push('/branches'); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.patch<Branch>(`/api/branches/${id}`, {
        name, phone: phone || undefined, email: email || undefined, address: address || undefined,
      });
      setBranch(data);
      setEditOpen(false);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!branch) return;
    setDeleting(true);
    try {
      await api.delete(`/api/branches/${id}`);
      router.push('/branches');
    } finally { setDeleting(false); }
  }

  function openEdit() {
    if (!branch) return;
    setName(branch.name);
    setPhone(branch.phone ?? '');
    setEmail(branch.email ?? '');
    setAddress(branch.address ?? '');
    setEditOpen(true);
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted">Loading...</p></div>;
  if (!branch) return null;

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{branch.name}</h1>
          <p className="text-muted text-sm">Branch details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onPress={openEdit}>Edit</Button>
          <Button variant="ghost" onPress={() => setDeleteOpen(true)}>Delete</Button>
          <Button variant="ghost" onPress={() => router.push('/branches')}>Back</Button>
        </div>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Branch Information</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Phone:</span> <span>{branch.phone || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted">Email:</span> <span>{branch.email || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted">Address:</span> <span className="text-right max-w-60">{branch.address || '—'}</span></div>
          </div>
        </Card.Content>
      </Card>

      <Modal.Backdrop isOpen={editOpen} onOpenChange={(v: boolean) => { if (!v) setEditOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Edit Branch</Modal.Header>
            <Modal.Body>
              <form id="edit-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} fullWidth />
                </div>
              </form>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" form="edit-form" isPending={saving}>Save</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop isOpen={deleteOpen} onOpenChange={(v: boolean) => { if (!v) setDeleteOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Delete Branch</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">Are you sure you want to delete <strong>{branch.name}</strong>? This action cannot be undone.</p>
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
