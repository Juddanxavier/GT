'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card, Chip, Form, Input, Label, Modal, Skeleton, cn } from '@heroui/react';
import { api } from '@/lib/api';
import { CopyButton, Flag } from '@/components/copy-button';
import { usePageTitle } from '@/lib/use-page-title';
import { useTenants } from '@/lib/queries';
import { getCountryCode, stripDialCode } from '@/lib/country-codes';
import { ArrowLeft, Building2, Calendar, Clock, Mail, MapPin, Pencil, Phone, Trash2, RefreshCw } from 'lucide-react';
import { DetailShell, DetailBack } from '@/components/detail-layout';

interface BranchDetail {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export default function BranchDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [pageTitle, setPageTitle] = useState('');
  usePageTitle(pageTitle || 'Branch');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhoneLocal, setEditPhoneLocal] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: tenants = [] } = useTenants();
  const branchTenantCountry = useMemo(() => {
    if (!branch) return null;
    const t = tenants.find((t) => t.id === branch.tenantId);
    return t?.country ?? null;
  }, [branch, tenants]);
  const phoneDialCode = useMemo(() => getCountryCode(branchTenantCountry).dialCode, [branchTenantCountry]);
  const phoneFlag = useMemo(() => getCountryCode(branchTenantCountry).flag, [branchTenantCountry]);

  useEffect(() => { if (branch?.name) setPageTitle(`Branch: ${branch.name}`); }, [branch?.name]);

  const isAdmin = userRole === 'superadmin' || userRole === 'tenant-admin';

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [data, me] = await Promise.all([
        api.get<BranchDetail>(`/api/branches/${id}`),
        api.get<{ id: string; role: string }>('/api/me'),
      ]);
      setBranch(data);
      setUserRole(me.role);
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }

  function openEdit() {
    if (!branch) return;
    setEditErrors({});
    setEditName(branch.name);
    setEditPhoneLocal(stripDialCode(branch.phone ?? '', phoneDialCode));
    setEditEmail(branch.email ?? '');
    setEditAddress(branch.address ?? '');
    setEditOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditErrors({});
    setSaving(true);
    const fullPhone = editPhoneLocal ? `${phoneDialCode} ${editPhoneLocal}` : '';
    try {
      const data = await api.patch<BranchDetail>(`/api/branches/${id}`, {
        name: editName,
        phone: fullPhone || undefined,
        email: editEmail || undefined,
        address: editAddress || undefined,
      });
      setBranch(data);
      setEditOpen(false);
    } catch {
      setEditErrors({ form: 'Failed to update branch' });
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!branch) return;
    setDeleting(true);
    try {
      await api.delete(`/api/branches/${id}`);
      router.push('/branches');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  if (!branch || loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-14 h-14 rounded-sm bg-muted/10 flex items-center justify-center">
          <Building2 size={20} className="text-muted" />
        </div>
        <p className="text-lg font-medium">Branch not found</p>
        <p className="text-sm text-muted">The branch you're looking for doesn't exist or has been removed.</p>
        <Button variant="secondary" onPress={() => router.push('/branches')}>Back to Branches</Button>
      </div>
    );
  }

  const daysSinceUpdate = branch.updatedAt
    ? Math.floor((Date.now() - new Date(branch.updatedAt).getTime()) / 86400000)
    : null;

  return (
    <DetailShell>
      {/* Back button */}
      <DetailBack onClick={() => router.push('/branches')} label="Back to Branches" />

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-sm border border-accent/30 bg-gradient-to-br from-accent/[0.08] to-transparent">
        <div className="relative px-8 py-7">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Icon + Name */}
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-sm flex items-center justify-center shrink-0 bg-accent/15 text-accent">
                <Building2 size={24} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <Chip size="sm" variant="secondary" color="accent">Branch</Chip>
                  {branch.email && (
                    <span className="text-xs text-muted bg-muted/10 px-2 py-0.5 rounded-full">Contactable</span>
                  )}
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {branch.name}
                </h1>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <Button variant="secondary" size="sm" onPress={openEdit}>Edit</Button>
                  <Button variant="ghost" size="sm" onPress={() => setDeleteOpen(true)}>Delete</Button>
                </>
              )}
            </div>
          </div>

          {/* Info bar */}
          <div className="mt-6 flex items-center gap-4 text-xs text-muted flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              <span>Created {new Date(branch.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <RefreshCw size={14} />
              <span>Updated {new Date(branch.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            {daysSinceUpdate !== null && (
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>{daysSinceUpdate === 0 ? 'Today' : `${daysSinceUpdate}d ago`}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Phone"
          value={branch.phone || '—'}
          icon={<Phone size={14} />}
          highlighted={!!branch.phone}
        />
        <StatCard
          label="Email"
          value={branch.email || '—'}
          icon={<Mail size={14} />}
          highlighted={!!branch.email}
        />
        <StatCard
          label="Address"
          value={branch.address || '—'}
          icon={<MapPin size={14} />}
          highlighted={!!branch.address}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Contact Details */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-muted" />
            <h2 className="text-sm font-semibold">Contact Information</h2>
          </div>

          <Card>
            <div className="divide-y divide-border">
              {/* Phone */}
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="w-8 h-8 rounded-sm bg-muted/10 flex items-center justify-center shrink-0">
                  <Phone size={14} className="text-muted" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted font-medium uppercase tracking-wider mb-0.5">Phone</p>
                  <p className="text-sm font-medium">{branch.phone || '—'}</p>
                </div>
                {branch.phone && <CopyButton text={branch.phone} />}
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="w-8 h-8 rounded-sm bg-muted/10 flex items-center justify-center shrink-0">
                  <Mail size={14} className="text-muted" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted font-medium uppercase tracking-wider mb-0.5">Email</p>
                  <p className="text-sm font-medium break-all">{branch.email || '—'}</p>
                </div>
                {branch.email && <CopyButton text={branch.email} />}
              </div>

              {/* Address */}
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="w-8 h-8 rounded-sm bg-muted/10 flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-muted" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted font-medium uppercase tracking-wider mb-0.5">Address</p>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{branch.address || '—'}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-5">
          {/* Branch Details */}
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Building2 size={14} className="text-muted" />
                Details
              </Card.Title>
            </Card.Header>
            <div className="border-t border-border" />
            <Card.Content className="p-0 divide-y divide-border">
              <InfoRow label="Name" value={branch.name} />
              <InfoRow label="Phone" value={branch.phone || '—'} />
              <InfoRow label="Email" value={branch.email || '—'} />
              <InfoRow label="Address" value={branch.address || '—'} />
              <InfoRow label="Created" value={new Date(branch.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
              <InfoRow label="Updated" value={new Date(branch.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
            </Card.Content>
          </Card>

          {/* Actions */}
          {isAdmin && (
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /></svg>
                  Actions
                </Card.Title>
              </Card.Header>
              <div className="border-t border-border" />
              <Card.Content className="p-4 space-y-2">
                <Button className="w-full justify-start" variant="secondary" size="sm" onPress={openEdit}>
                  <Pencil size={16} />
                  Edit Branch
                </Button>
                <Button className="w-full justify-start" variant="ghost" size="sm" onPress={() => setDeleteOpen(true)}>
                  <Trash2 size={16} />
                  Delete
                </Button>
              </Card.Content>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal.Backdrop isOpen={editOpen} onOpenChange={(v) => { if (!v) setEditOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Edit Branch</Modal.Header>
            <Modal.Body>
              {editErrors.form && <p className="text-sm text-danger">{editErrors.form}</p>}
              <Form.Root id="edit-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input id="edit-name" variant="secondary" placeholder="Branch name" value={editName} onChange={(e) => setEditName(e.target.value)} required fullWidth />
                  {editErrors.name && <p className="text-xs text-danger">{editErrors.name}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <div className="flex">
                    <div className="flex items-center gap-1.5 px-3 border border-r-0 border-border rounded-l-xl bg-muted/10 text-sm text-muted font-medium shrink-0">
                      {phoneFlag && <Flag country={phoneFlag} size={14} />}
                      {phoneDialCode}
                    </div>
                    <Input id="edit-phone" variant="secondary" placeholder="Phone number" value={editPhoneLocal} onChange={(e) => setEditPhoneLocal(e.target.value.replace(/\D/g, ''))} className="rounded-l-none border-l-0 flex-1 min-w-0" />
                  </div>
                  {editErrors.phone && <p className="text-xs text-danger">{editErrors.phone}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" variant="secondary" type="email" placeholder="branch@example.com" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} fullWidth />
                  {editErrors.email && <p className="text-xs text-danger">{editErrors.email}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input id="edit-address" variant="secondary" placeholder="Full street address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} fullWidth />
                  {editErrors.address && <p className="text-xs text-danger">{editErrors.address}</p>}
                </div>
              </Form.Root>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" form="edit-form" isPending={saving}>Save</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Delete Modal */}
      <Modal.Backdrop isOpen={deleteOpen} onOpenChange={(v) => { if (!v) setDeleteOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Delete Branch</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">Delete <strong>{branch.name}</strong>? This cannot be undone.</p>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="danger" isPending={deleting} onPress={handleDelete}>{deleting ? 'Deleting...' : 'Delete'}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </DetailShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5">
      <span className="text-sm text-muted flex-1">{label}</span>
      <span className="text-sm font-medium text-right max-w-[50%] truncate">{value}</span>
    </div>
  );
}

function StatCard({ label, value, icon, highlighted }: {
  label: string; value: string; icon: ReactNode; highlighted?: boolean;
}) {
  return (
    <Card className={cn(
      'p-4 transition-shadow',
      highlighted && 'border-accent/30 bg-accent/[0.02]',
    )}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-muted">{icon}</span>
        <span className="text-[11px] text-muted font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn(
        'text-sm font-semibold truncate',
        highlighted && 'text-accent',
      )}>{value}</p>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <Skeleton className="h-4 w-36" />

      <div className="rounded-sm border border-border overflow-hidden">
        <div className="p-8">
          <div className="flex items-start gap-5">
            <Skeleton className="w-14 h-14 rounded-sm shrink-0" />
            <div className="flex-1">
              <div className="flex gap-2 mb-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-8 w-64 mb-1" />
            </div>
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-9 w-16 rounded-lg" />
              <Skeleton className="h-9 w-16 rounded-lg" />
            </div>
          </div>
          <div className="mt-6 flex gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-32" />)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-5 w-28" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 space-y-4">
          <Skeleton className="h-5 w-36" />
          <Card className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <Skeleton className="w-8 h-8 rounded-sm shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-12 mb-1" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-6 w-6 rounded-md" />
              </div>
            ))}
          </Card>
        </div>
        <div className="col-span-2 space-y-5">
          <Card>
            <Card.Header><Skeleton className="h-5 w-20" /></Card.Header>
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-3 w-full" />)}
            </div>
          </Card>
          <Card>
            <Card.Header><Skeleton className="h-5 w-16" /></Card.Header>
            <div className="p-5 space-y-2">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
