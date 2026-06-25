'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers, useTenants, useBranches, useBranchesForTenant, useUpdateUser, useDeleteUser, type UserRecord, type ApiBranch } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';
import { Button, Chip, Description, Input, Label, ListBox, Modal, Pagination, Select, Table, Tabs, cn, type SortDescriptor } from '@heroui/react';
import { authClient } from '@/lib/auth-client';
import { Pencil, Trash2, Ban, ShieldOff, ChevronDown, CircleX, Check } from 'lucide-react';

type Tenant = { id: string; name: string };
type Branch = { id: string; name: string; tenantId: string };

const SUPERADMIN_CREATE_ROLES = ['superadmin', 'tenant-admin', 'staff'];
const TENANT_ADMIN_CREATE_ROLES = ['staff'];
const EDIT_ROLES = ['tenant-admin', 'staff', 'customer'];

const ROLE_COLORS: Record<string, 'accent' | 'success' | 'warning' | 'default'> = {
  superadmin: 'accent',
  admin: 'accent',
  'tenant-admin': 'success',
  staff: 'warning',
  customer: 'default',
};

const ROWS_PER_PAGE = 10;

function SortableHeader({ children, sortDirection }: { children: React.ReactNode; sortDirection?: 'ascending' | 'descending' }) {
  return (
    <span className="flex items-center gap-1 select-none">
      {children}
      {sortDirection && (
        <ChevronDown size={12} className={cn('transition-transform duration-100', sortDirection === 'descending' ? 'rotate-180' : '')} />
      )}
    </span>
  );
}

function EditIcon() { return <Pencil size={16} />; }
function TrashIcon() { return <Trash2 size={16} />; }
function BanIcon() { return <Ban size={16} />; }
function UnbanIcon() { return <ShieldOff size={16} />; }
export default function UsersPage() {
  usePageTitle('Users');
  const [userRole, setUserRole] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useUsers();
  const { data: tenants = [] } = useTenants();
  const { data: branches = [] } = useBranches();
  const { mutateAsync: updateUser } = useUpdateUser();
  const { mutateAsync: deleteUser } = useDeleteUser();
  const [search, setSearch] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'name', direction: 'ascending' });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState('staff');
  const [createTenantId, setCreateTenantId] = useState('');
  const [createBranchId, setCreateBranchId] = useState('');

  const { data: session } = authClient.useSession();
  const sessionUser = session?.user as Record<string, unknown> | undefined;
  const sessionTenantId = (sessionUser?.tenantId as string) ?? '';
  const isTenantAdmin = userRole === 'tenant-admin';

  const [editTarget, setEditTarget] = useState<UserRecord | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editTenantId, setEditTenantId] = useState('');
  const [editBranchId, setEditBranchId] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [banTarget, setBanTarget] = useState<UserRecord | null>(null);
  const [banSaving, setBanSaving] = useState(false);

  useEffect(() => {
    authClient.getSession().then((res) => {
      const role = (res.data?.user as Record<string, unknown> | undefined)?.role as string | undefined;
      setUserRole(role ?? null);
    });
  }, []);

  const filtered = useMemo(() => {
    let items = [...users];

    if (statusFilter !== 'all') {
      const isBanned = statusFilter === 'banned';
      items = items.filter((u) => !!u.banned === isBanned);
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
    }

    const col = sortDescriptor.column as keyof UserRecord;
    const dir = sortDescriptor.direction;
    items.sort((a, b) => {
      const valA = String(a[col] ?? '');
      const valB = String(b[col] ?? '');
      const cmp = valA.localeCompare(valB);
      return dir === 'descending' ? -cmp : cmp;
    });

    return items;
  }, [users, search, sortDescriptor, statusFilter]);

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return filtered.slice(start, start + ROWS_PER_PAGE);
  }, [page, filtered]);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = (page - 1) * ROWS_PER_PAGE + 1;
  const end = Math.min(page * ROWS_PER_PAGE, filtered.length);

  const effectiveTenantId = createTenantId || (isTenantAdmin ? sessionTenantId : '');
  const { data: createBranches = [] } = useBranchesForTenant(effectiveTenantId);
  const editFilteredBranches = branches.filter((b) => !editTenantId || b.tenantId === editTenantId);

  const activeCount = users.filter((u) => !u.banned).length;
  const bannedCount = users.filter((u) => u.banned).length;

  function openEdit(user: UserRecord) {
    setEditTarget(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditTenantId(user.tenantId ?? '');
    setEditBranchId(user.branchId ?? '');
    setEditPassword('');
  }

  async function handleEditSave() {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const data: Record<string, string> = { name: editName, email: editEmail };
      if (userRole === 'superadmin' || userRole === 'tenant-admin') data.role = editRole;
      if (userRole === 'superadmin') data.tenantId = editTenantId;
      data.branchId = editBranchId;
      await updateUser({ id: editTarget.id, ...data });
      if (editPassword) {
        await authClient.admin.setUserPassword({ userId: editTarget.id, newPassword: editPassword });
      }
      setEditTarget(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update user');
    }
    setEditSaving(false);
  }

  function openBan(user: UserRecord) {
    setBanTarget(user);
  }

  async function confirmBan() {
    if (!banTarget) return;
    setBanSaving(true);
    try {
      if (banTarget.banned) {
        await authClient.admin.unbanUser({ userId: banTarget.id });
      } else {
        await authClient.admin.banUser({ userId: banTarget.id, banReason: 'Banned by admin' });
      }
      setBanTarget(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
    setBanSaving(false);
  }

  const sessionUserId = (sessionUser?.id as string) ?? '';
  const sessionUserRole = (sessionUser?.role as string) ?? '';

  function canDeleteTarget(target: UserRecord): boolean {
    if (target.id === sessionUserId) return false;
    if (sessionUserRole === 'superadmin') return true;
    if (sessionUserRole === 'tenant-admin') return target.role === 'staff' || target.role === 'customer';
    return false;
  }

  function openDelete(user: UserRecord) {
    setDeleteTarget(user);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete user');
    }
    setDeleteSaving(false);
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-sm text-muted">Manage user accounts and permissions</p>
          </div>
          {userRole !== 'staff' && (
            <Button onPress={() => {
              setCreateEmail(''); setCreateName(''); setCreateRole('staff'); setCreateError('');
              setCreateTenantId(isTenantAdmin ? sessionTenantId : '');
              setCreateBranchId('');
              setCreateOpen(true);
            }}>Create User</Button>
          )}
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <a className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all block">
          <div className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-4xl font-bold tracking-tight text-foreground">{users.length}</p>
                <p className="text-sm text-muted mt-1">Total Users</p>
              </div>
            </div>
          </div>
          <svg className="w-full h-8 text-accent/30" viewBox="0 0 120 24" preserveAspectRatio="none">
            <defs><linearGradient id="g-u-total" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.4" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,18 L10,14 L20,12 L30,8 L40,4 L50,6 L60,4 L70,2 L80,4 L90,2 L100,4 L110,2 L120,2 L120,24 L0,24 Z" fill="url(#g-u-total)" />
            <polyline points="0,18 10,14 20,12 30,8 40,4 50,6 60,4 70,2 80,4 90,2 100,4 110,2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <a className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all block">
          <div className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-4xl font-bold tracking-tight text-success">{activeCount}</p>
                <p className="text-sm text-muted mt-1">Active</p>
              </div>
            </div>
          </div>
          <svg className="w-full h-8 text-success/30" viewBox="0 0 120 24" preserveAspectRatio="none">
            <defs><linearGradient id="g-u-active" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.4" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,20 L10,18 L20,16 L30,14 L40,12 L50,10 L60,8 L70,6 L80,4 L90,6 L100,4 L110,4 L120,4 L120,24 L0,24 Z" fill="url(#g-u-active)" />
            <polyline points="0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6 80,4 90,6 100,4 110,4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <a className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all block">
          <div className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-4xl font-bold tracking-tight text-danger">{bannedCount}</p>
                <p className="text-sm text-muted mt-1">Banned</p>
              </div>
            </div>
          </div>
          <svg className="w-full h-8 text-danger/30" viewBox="0 0 120 24" preserveAspectRatio="none">
            <defs><linearGradient id="g-u-banned" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.4" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,6 L10,8 L20,12 L30,14 L40,18 L50,16 L60,20 L70,18 L80,22 L90,20 L100,22 L110,24 L120,24 L120,24 L0,24 Z" fill="url(#g-u-banned)" />
            <polyline points="0,6 10,8 20,12 30,14 40,18 50,16 60,20 70,18 80,22 90,20 100,22 110,24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="sm:flex-1"><Input variant="secondary" placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} fullWidth /></div>
            <Tabs selectedKey={statusFilter} onSelectionChange={(key) => { setStatusFilter(key as 'all' | 'active' | 'banned'); setPage(1); }} className="sm:flex-1">
              <Tabs.List>
                <Tabs.Tab id="all">All</Tabs.Tab>
                <Tabs.Tab id="active">Active</Tabs.Tab>
                <Tabs.Tab id="banned">Banned</Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4">
                <div className="w-7 h-7 rounded-full bg-accent/10 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-accent/10 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-accent/10 rounded animate-pulse w-1/2" />
                </div>
                <div className="h-6 w-16 bg-accent/10 rounded animate-pulse" />
                <div className="h-6 w-20 bg-accent/10 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Users" className="min-w-[950px]"
                sortDescriptor={sortDescriptor}
                onSortChange={(d) => { setSortDescriptor(d); setPage(1); }}>
                <Table.Header>
                  <Table.Column allowsSorting id="name" isRowHeader>
                    {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Name</SortableHeader>}
                  </Table.Column>
                  <Table.Column allowsSorting id="email">
                    {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Email</SortableHeader>}
                  </Table.Column>
                  <Table.Column id="role">
                    {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Role</SortableHeader>}
                  </Table.Column>
                  <Table.Column id="tenantId">Tenant</Table.Column>
                  <Table.Column id="branchId">Branch</Table.Column>
                  <Table.Column id="banned">Status</Table.Column>
                  {userRole !== 'staff' && <Table.Column id="actions" width={100}>{() => null}</Table.Column>}
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <div className="flex items-center justify-center py-20 text-muted text-sm">No users found</div>
                  )}
                >
                  {paginated.map((user) => (
                    <Table.Row key={user.id}>
                      <Table.Cell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm">{user.name}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="text-sm">{user.email}</Table.Cell>
                      <Table.Cell>
                        <Chip size="sm" variant="soft" color={ROLE_COLORS[user.role] ?? 'default'}>{user.role}</Chip>
                      </Table.Cell>
                      <Table.Cell className="text-sm text-muted">
                        {tenants.find((t) => t.id === user.tenantId)?.name || '—'}
                      </Table.Cell>
                      <Table.Cell className="text-sm text-muted">
                        {branches.find((b) => b.id === user.branchId)?.name || '—'}
                      </Table.Cell>
                      <Table.Cell>
                        {user.banned ? (
                          <span className="text-xs text-danger flex items-center gap-1">
                            <CircleX size={10} />
                            Banned
                          </span>
                        ) : (
                          <span className="text-xs text-success flex items-center gap-1">
                            <Check size={10} />
                            Active
                          </span>
                        )}
                      </Table.Cell>
                      {userRole !== 'staff' && (
                        <Table.Cell>
                          <div className="flex items-center gap-0.5">
                            <Button size="sm" variant="ghost" className="text-warning" onPress={() => openEdit(user)}>
                              <EditIcon />
                            </Button>
                            <Button size="sm" variant="ghost" className={user.banned ? 'text-default-500' : 'text-danger'} onPress={() => openBan(user)}>
                              {user.banned ? <UnbanIcon /> : <BanIcon />}
                            </Button>
                            {canDeleteTarget(user) && (
                              <Button size="sm" variant="ghost" className="text-danger" onPress={() => openDelete(user)}>
                                <TrashIcon />
                              </Button>
                            )}
                          </div>
                        </Table.Cell>
                      )}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
            <Table.Footer>
                <Pagination size="sm">
                  <Pagination.Summary>{start} to {end} of {filtered.length} users</Pagination.Summary>
                  <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous isDisabled={page === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
                        <Pagination.PreviousIcon /> Prev
                      </Pagination.Previous>
                    </Pagination.Item>
                    {pages.map((p) => (
                      <Pagination.Item key={p}>
                        <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>{p}</Pagination.Link>
                      </Pagination.Item>
                    ))}
                    <Pagination.Item>
                      <Pagination.Next isDisabled={page === totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}>
                        Next <Pagination.NextIcon />
                      </Pagination.Next>
                    </Pagination.Item>
                  </Pagination.Content>
            </Pagination>
          </Table.Footer>
        </Table>
        )}
      </div>

      {/* Create User Modal */}
      <Modal.Backdrop isOpen={createOpen} onOpenChange={(v) => { if (!v) setCreateOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Create User</Modal.Header>
            <Modal.Body>
              <form id="create-user-form" onSubmit={async (e) => {
                e.preventDefault();
                setCreateError('');
                if (!createEmail.trim()) { setCreateError('Email is required'); return; }
                setCreateSaving(true);
                try {
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/create`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: createEmail.trim(),
                      name: createName.trim() || undefined,
                      role: createRole,
                      tenantId: createTenantId || undefined,
                      branchId: createBranchId || undefined,
                    }),
                  });
                  const body = await res.json();
                  if (!res.ok) throw new Error(body.error || 'Failed to create user');
                  setCreateOpen(false);
                  setCreateEmail(''); setCreateName(''); setCreateRole('staff'); setCreateTenantId(''); setCreateBranchId('');
                  queryClient.invalidateQueries({ queryKey: ['users'] });
                } catch (err) {
                  setCreateError(err instanceof Error ? err.message : 'Failed to create user');
                }
                setCreateSaving(false);
              }} className="space-y-4">
                {createError && <p className="text-sm text-danger">{createError}</p>}
                <div className="space-y-1">
                  <Label htmlFor="create-email">Email *</Label>
                  <Input id="create-email" type="email" variant="secondary" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} required fullWidth />
                  <Description>An activation email will be sent to this address</Description>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="create-name">Name</Label>
                  <Input id="create-name" variant="secondary" value={createName} onChange={(e) => setCreateName(e.target.value)} fullWidth />
                  <Description>Display name for the user</Description>
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select
                    selectedKey={createRole}
                    onSelectionChange={(k) => { setCreateRole(k as string); if (k === 'tenant-admin') setCreateBranchId(''); }}
                    variant="secondary"
                    aria-label="Select role"
                  >
                    <Select.Trigger className="h-10 text-sm">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {(userRole === 'superadmin' ? SUPERADMIN_CREATE_ROLES : TENANT_ADMIN_CREATE_ROLES).map((r) => (
                          <ListBox.Item key={r} id={r} textValue={r}>{r}</ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <Description>Controls what the user can access</Description>
                </div>
                {userRole === 'superadmin' && createRole !== 'superadmin' && (
                  <div className="space-y-1">
                    <Label>Tenant</Label>
                    <Select
                      selectedKey={createTenantId}
                      onSelectionChange={(k) => { setCreateTenantId(k as string); setCreateBranchId(''); }}
                      variant="secondary"
                      aria-label="Select tenant"
                    >
                      <Select.Trigger className="h-10 text-sm">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {tenants.map((t: Tenant) => (
                            <ListBox.Item key={t.id} id={t.id} textValue={t.name}>{t.name}</ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    <Description>Which organization this user belongs to</Description>
                  </div>
                )}
                {createRole !== 'tenant-admin' && createRole !== 'superadmin' && (
                  <div className="space-y-1">
                    <Label>Branch</Label>
                    <Select
                      selectedKey={createBranchId || undefined}
                      onSelectionChange={(k) => setCreateBranchId((k as string) ?? '')}
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
                          {createBranches.map((b: ApiBranch) => (
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
              <Button variant="secondary" onPress={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" form="create-user-form" isPending={createSaving}>Create User</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Edit Modal */}
      <Modal.Backdrop isOpen={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Edit User</Modal.Header>
            <Modal.Body>
              <form id="edit-user-form" onSubmit={(e) => { e.preventDefault(); handleEditSave(); }} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input id="edit-name" variant="secondary" value={editName} onChange={(e) => setEditName(e.target.value)} required fullWidth />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input id="edit-email" type="email" variant="secondary" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required fullWidth />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                  <Input id="edit-password" type="password" variant="secondary" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} fullWidth />
                </div>
                {(userRole === 'superadmin' || userRole === 'tenant-admin') && (
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Select
                      selectedKey={editRole}
                      onSelectionChange={(k) => setEditRole(k as string)}
                      variant="secondary"
                      aria-label="Select role"
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
                )}
                {userRole === 'superadmin' && (
                  <div className="space-y-1">
                    <Label>Tenant</Label>
                    <Select
                      selectedKey={editTenantId}
                      onSelectionChange={(k) => { setEditTenantId(k as string); setEditBranchId(''); }}
                      variant="secondary"
                      aria-label="Select tenant"
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
                )}
                <div className="space-y-1">
                  <Label>Branch</Label>
                  <Select
                    selectedKey={editBranchId || undefined}
                    onSelectionChange={(k) => setEditBranchId((k as string) ?? '')}
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
                        {editFilteredBranches.map((b) => (
                          <ListBox.Item key={b.id} id={b.id} textValue={b.name}>{b.name}</ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </form>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" form="edit-user-form" isPending={editSaving}>Save</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Ban/Unban Modal */}
      <Modal.Backdrop isOpen={!!banTarget} onOpenChange={(v) => { if (!v) setBanTarget(null); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>{banTarget?.banned ? 'Unban User' : 'Ban User'}</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">
                {banTarget?.banned
                  ? `Unban ${banTarget?.name} (${banTarget?.email})? They will be able to sign in again.`
                  : `Ban ${banTarget?.name} (${banTarget?.email})? They will be prevented from signing in.`}
              </p>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setBanTarget(null)}>Cancel</Button>
              <Button variant={banTarget?.banned ? 'secondary' : 'danger'} isPending={banSaving} onPress={confirmBan}>
                {banTarget?.banned ? 'Unban' : 'Ban'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Delete Modal */}
      <Modal.Backdrop isOpen={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Delete User</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">Are you sure you want to delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})? This will permanently remove their account and all associated data.</p>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" isPending={deleteSaving} onPress={confirmDelete}>
                {deleteSaving ? 'Deleting...' : 'Delete'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
