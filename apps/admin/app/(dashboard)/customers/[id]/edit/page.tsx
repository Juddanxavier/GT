'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUpdateUser, useUsers, useTenants, useBranches, type UserRecord } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';
import { Button, Input, Label, ListBox, Select, Spinner } from '@heroui/react';
import { PageHeader } from '@/components/page-header';
import { DetailBack, DetailSection, DetailShell } from '@/components/detail-layout';
import { AddressForm, type AddressData } from '@/components/address-form';
import { useToast } from '@/components/toast';
import { getUser } from '@/types/auth';
import { authClient } from '@/lib/auth-client';
import { UserCog } from 'lucide-react';

type Tenant = { id: string; name: string };
type Branch = { id: string; name: string; tenantId: string };

const EDIT_ROLES = ['tenant-admin', 'staff', 'customer'];

export default function EditUserPage() {
  usePageTitle('Edit User');
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: users, isLoading } = useUsers();
  const { data: tenants = [] } = useTenants();
  const { data: branches = [] } = useBranches();
  const { mutateAsync: updateUser } = useUpdateUser();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const session = authClient.useSession();

  useEffect(() => {
    authClient.getSession().then((res) => {
      const role = (res.data?.user as { role?: string } | undefined)?.role;
      setUserRole(role ?? null);
    });
  }, []);

  const user = users?.find((u) => u.id === id);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [address, setAddress] = useState<AddressData>({});

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setTenantId(user.tenantId ?? '');
    setBranchId(user.branchId ?? '');
    setAddress((user.address ?? {}) as AddressData);
  }, [user]);

  const filteredBranches = useMemo(
    () => branches.filter((b) => !tenantId || b.tenantId === tenantId),
    [branches, tenantId],
  );

  if (isLoading) {
    return (
      <DetailShell>
        <DetailBack onClick={() => router.push('/customers')} label="Back to Users" />
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      </DetailShell>
    );
  }

  if (!user) {
    return (
      <DetailShell>
        <DetailBack onClick={() => router.push('/customers')} label="Back to Users" />
        <DetailSection title="User not found">
          <div className="p-8 text-center text-sm text-muted">This user no longer exists.</div>
        </DetailSection>
      </DetailShell>
    );
  }

  const u = user;

  async function handleSave() {
    setSaving(true);
    try {
      const data: Record<string, unknown> = { name, email };
      if (userRole === 'superadmin' || userRole === 'tenant-admin') data.role = role;
      if (userRole === 'superadmin') data.tenantId = tenantId;
      data.branchId = branchId;
      data.address = address;
      await updateUser({ id: u.id, ...data });
      if (password) {
        await authClient.admin.setUserPassword({ userId: u.id, newPassword: password });
      }
      toast('success', 'User updated', `${u.name} saved`);
      router.push('/customers');
    } catch (e) {
      toast('error', 'Failed to update user', e instanceof Error ? e.message : undefined);
      setSaving(false);
    }
  }

  const sessionUser = getUser(session.data);
  const isSelf = sessionUser?.id === u.id;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Edit ${user.name}`}
        subtitle="Manage user account details and permissions"
        icon={<UserCog size={18} />}
        action={<Button onPress={() => router.push('/customers')}>Back to Users</Button>}
      />

      <DetailShell>
        <DetailBack onClick={() => router.push('/customers')} label="Back to Users" />
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          <DetailSection title="Account">
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input id="edit-name" variant="secondary" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input id="edit-email" type="email" variant="secondary" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                <Input id="edit-password" type="password" variant="secondary" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
              </div>
            </div>
          </DetailSection>

          {(userRole === 'superadmin' || userRole === 'tenant-admin') && (
            <DetailSection title="Role">
              <div className="p-5">
                <Select
                  selectedKey={role}
                  onSelectionChange={(k) => setRole(k as string)}
                  variant="secondary"
                  isDisabled={userRole === 'tenant-admin' && (user.role === 'superadmin' || isSelf)}
                  aria-label="Select role"
                  className="max-w-sm"
                >
                  <Select.Trigger className="h-10 text-sm">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {EDIT_ROLES.filter((r) => userRole === 'superadmin' ? true : !['superadmin'].includes(r)).map((r) => (
                        <ListBox.Item key={r} id={r} textValue={r}>{r}</ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            </DetailSection>
          )}

          {userRole === 'superadmin' && (
            <DetailSection title="Tenant">
              <div className="p-5">
                <Select
                  selectedKey={tenantId}
                  onSelectionChange={(k) => { setTenantId(k as string); setBranchId(''); }}
                  variant="secondary"
                  aria-label="Select tenant"
                  className="max-w-sm"
                >
                  <Select.Trigger className="h-10 text-sm">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item key="" id="" textValue="None">None</ListBox.Item>
                      {tenants.map((t: Tenant) => (
                        <ListBox.Item key={t.id} id={t.id} textValue={t.name}>{t.name}</ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            </DetailSection>
          )}

          <DetailSection title="Branch">
            <div className="p-5">
              <Select
                selectedKey={branchId || undefined}
                onSelectionChange={(k) => setBranchId((k as string) ?? '')}
                variant="secondary"
                aria-label="Select branch"
                className="max-w-sm"
              >
                <Select.Trigger className="h-10 text-sm">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item key="" id="" textValue="None">None</ListBox.Item>
                    {filteredBranches.map((b: Branch) => (
                      <ListBox.Item key={b.id} id={b.id} textValue={b.name}>{b.name}</ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </DetailSection>

          <DetailSection title="Address">
            <div className="p-5">
              <AddressForm prefix="user" value={address} onChange={setAddress} showContact />
            </div>
          </DetailSection>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onPress={() => router.push('/customers')}>Cancel</Button>
            <Button type="submit" isPending={saving}>Save</Button>
          </div>
        </form>
      </DetailShell>
    </div>
  );
}