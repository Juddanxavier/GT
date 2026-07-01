'use client';

import { useEffect, useState } from 'react';
import { Button, Chip, Description, Input, Label, ListBox, Modal, Select, Table, Tabs, cn, type SortDescriptor } from '@heroui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { api } from '@/lib/api';
import { useTenants, useBranches, type ApiBranch } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import { Mail, MailX, Plus, LoaderCircle } from 'lucide-react';

const SUPERADMIN_INVITE_ROLES = ['superadmin', 'tenant-admin', 'staff'];
const TENANT_ADMIN_INVITE_ROLES = ['staff'];

type Invitation = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string | null;
  branchId: string | null;
  token: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export default function InvitationsPage() {
  usePageTitle('Invitations');
  const queryClient = useQueryClient();
  const { tenantFilter } = useTenantFilter();
  const { data: tenants = [] } = useTenants();
  const { data: branches = [] } = useBranches();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [sessionTenantId, setSessionTenantId] = useState('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [inviteTenantId, setInviteTenantId] = useState('');
  const [inviteBranchId, setInviteBranchId] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    authClient.getSession().then((res) => {
      const u = res.data?.user as Record<string, unknown> | undefined;
      setUserRole((u?.role as string) ?? null);
      setSessionTenantId((u?.tenantId as string) ?? '');
    });
  }, []);

  const { data: invitations = [], isLoading, refetch } = useQuery<Invitation[]>({
    queryKey: ['invitations', tenantFilter],
    queryFn: () => api.get<Invitation[]>('/api/invitations'),
    refetchOnMount: 'always',
  });

  const isTenantAdmin = userRole === 'tenant-admin';
  const effectiveTenantId = inviteTenantId || (isTenantAdmin ? sessionTenantId : '');

  const { data: inviteBranches = [] } = useQuery<ApiBranch[]>({
    queryKey: ['branches', 'tenant', effectiveTenantId],
    queryFn: () => api.get<ApiBranch[]>('/api/branches', { headers: { 'X-Tenant-ID': effectiveTenantId } as Record<string, string> }),
    enabled: !!effectiveTenantId,
  });

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    if (!inviteEmail.trim()) { setInviteError('Email is required'); return; }
    setInviteSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/invitations/invite`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: inviteEmail.trim(),
            name: inviteName.trim() || undefined,
            role: inviteRole,
            tenantId: inviteTenantId || undefined,
            branchId: inviteBranchId || undefined,
          }),
        },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to send invitation');
      setInviteOpen(false);
      setInviteEmail(''); setInviteName(''); setInviteRole('staff'); setInviteTenantId(''); setInviteBranchId('');
      refetch();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation');
    }
    setInviteSaving(false);
  }

  async function cancelInvitation(id: string) {
    setCancellingId(id);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/invitations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      refetch();
    } catch { /* ignore */ }
    setCancellingId(null);
  }

  const pendingInvitations = invitations.filter((i) => i.status === 'pending');
  const otherInvitations = invitations.filter((i) => i.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Invitations</h1>
          <p className="text-sm text-muted">Invite users to join your organization</p>
        </div>
        {userRole !== 'staff' && (
          <Button onPress={() => {
            setInviteEmail(''); setInviteName(''); setInviteRole('staff'); setInviteError('');
            setInviteTenantId(isTenantAdmin ? sessionTenantId : '');
            setInviteBranchId('');
            setInviteOpen(true);
          }}>
            <Plus size={16} />
            Invite User
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-2xl bg-surface shadow-sm p-5">
          <p className="text-4xl font-bold tracking-tight text-foreground">{invitations.length}</p>
          <p className="text-sm text-muted mt-1">Total Invitations</p>
        </div>
        <div className="rounded-2xl bg-surface shadow-sm p-5">
          <p className="text-4xl font-bold tracking-tight text-success">{pendingInvitations.length}</p>
          <p className="text-sm text-muted mt-1">Pending</p>
        </div>
        <div className="rounded-2xl bg-surface shadow-sm p-5">
          <p className="text-4xl font-bold tracking-tight text-muted">{otherInvitations.length}</p>
          <p className="text-sm text-muted mt-1">Accepted / Cancelled</p>
        </div>
      </div>

      {/* Pending Invitations */}
      <div className="rounded-xl border border-border bg-surface shadow-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-base font-semibold tracking-tight">Pending Invitations</h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoaderCircle size={20} className="animate-spin text-muted" />
          </div>
        ) : pendingInvitations.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted">No pending invitations</div>
        ) : (
          <div className="divide-y divide-border">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                    {(inv.name || inv.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{inv.name || inv.email}</p>
                    <p className="text-xs text-muted">
                      {inv.email}
                      {inv.role && <span> · {inv.role}</span>}
                      {inv.tenantId && <span> · {tenants.find((t: Record<string, unknown>) => t.id === inv.tenantId)?.name as string || ''}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    isDisabled={cancellingId === inv.id}
                    onPress={() => cancelInvitation(inv.id)}
                  >
                    <MailX size={14} />
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {otherInvitations.length > 0 && (
        <div className="rounded-xl border border-border bg-surface shadow-surface overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-base font-semibold tracking-tight">History</h2>
          </div>
          <div className="divide-y divide-border">
            {otherInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                    {(inv.name || inv.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{inv.name || inv.email}</p>
                    <p className="text-xs text-muted">{inv.email}</p>
                  </div>
                </div>
                <Chip size="sm" variant="soft" color={inv.status === 'accepted' ? 'success' : 'default'}>
                  {inv.status}
                </Chip>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <Modal.Backdrop isOpen={inviteOpen} onOpenChange={(v) => { if (!v) setInviteOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Invite User</Modal.Header>
            <Modal.Body>
              <form id="invite-form" onSubmit={handleInvite} className="space-y-4">
                {inviteError && <p className="text-sm text-danger">{inviteError}</p>}
                <div className="space-y-1">
                  <Label htmlFor="invite-email">Email *</Label>
                  <Input id="invite-email" type="email" variant="secondary" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required fullWidth />
                  <Description>An invitation email will be sent to this address</Description>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="invite-name">Name</Label>
                  <Input id="invite-name" variant="secondary" value={inviteName} onChange={(e) => setInviteName(e.target.value)} fullWidth />
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select
                    selectedKey={inviteRole}
                    onSelectionChange={(k) => { setInviteRole(k as string); if (k === 'tenant-admin') setInviteBranchId(''); }}
                    variant="secondary"
                    aria-label="Select role"
                  >
                    <Select.Trigger className="h-10 text-sm">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {(userRole === 'superadmin' ? SUPERADMIN_INVITE_ROLES : TENANT_ADMIN_INVITE_ROLES).map((r) => (
                          <ListBox.Item key={r} id={r} textValue={r}>{r}</ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
                {userRole === 'superadmin' && inviteRole !== 'superadmin' && (
                  <div className="space-y-1">
                    <Label>Tenant</Label>
                    <Select
                      selectedKey={inviteTenantId}
                      onSelectionChange={(k) => { setInviteTenantId(k as string); setInviteBranchId(''); }}
                      variant="secondary"
                      aria-label="Select tenant"
                    >
                      <Select.Trigger className="h-10 text-sm">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {tenants.map((t: Record<string, unknown>) => (
                            <ListBox.Item key={t.id as string} id={t.id as string} textValue={t.name as string}>{t.name as string}</ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                )}
                {inviteRole !== 'tenant-admin' && inviteRole !== 'superadmin' && (
                  <div className="space-y-1">
                    <Label>Branch</Label>
                    <Select
                      selectedKey={inviteBranchId || undefined}
                      onSelectionChange={(k) => setInviteBranchId((k as string) ?? '')}
                      variant="secondary"
                      aria-label="Select branch"
                    >
                      <Select.Trigger className="h-10 text-sm">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item key="" id="" textValue="None">None</ListBox.Item>
                          {inviteBranches.map((b: ApiBranch) => (
                            <ListBox.Item key={b.id} id={b.id} textValue={b.name}>{b.name}</ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                )}
              </form>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" form="invite-form" isPending={inviteSaving}>Send Invitation</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
