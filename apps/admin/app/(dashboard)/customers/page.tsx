'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers, useTenants, useBranches, useUpdateUser, useDeleteUser, type UserRecord, type PaginatedResult } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';
import { Button, Chip, Description, Input, Label, ListBox, Modal, Pagination, Select, Table, Tabs, type SortDescriptor } from '@heroui/react';
import { authClient } from '@/lib/auth-client';
import { Pencil, Trash2, Ban, ShieldOff, CircleX, Check } from 'lucide-react';

type Tenant = { id: string; name: string };
type Branch = { id: string; name: string; tenantId: string };

const EDIT_ROLES = ['tenant-admin', 'staff', 'customer'];

const ROLE_COLORS: Record<string, 'accent' | 'success' | 'warning' | 'default'> = {
  superadmin: 'accent',
  admin: 'accent',
  'tenant-admin': 'success',
  staff: 'warning',
  customer: 'default',
};

const ROWS_PER_PAGE = 10;




export default function UsersPage() {
  usePageTitle('Users');
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();
  const { data: branches = [] } = useBranches();
  const { mutateAsync: updateUser } = useUpdateUser();
  const { mutateAsync: deleteUser } = useDeleteUser();
  const [search, setSearch] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'name', direction: 'ascending' });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');

  // Server-side pagination
  const usersQuery = useUsers(page, ROWS_PER_PAGE, search, undefined, statusFilter);
  const usersResp = usersQuery.data as PaginatedResult<UserRecord> | undefined;
  const users = Array.isArray(usersResp) ? usersResp : (usersResp?.data ?? []);
  const totalCount = Array.isArray(usersResp) ? users.length : (usersResp?.total ?? 0);
  const counts = !Array.isArray(usersResp) ? usersResp?.counts : undefined;
  const isLoading = usersQuery.isPending;


  const { data: session } = authClient.useSession();
  const sessionUser = session?.user as Record<string, unknown> | undefined;


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

  // Client-side: sort the current page only (search/status are server-side)
  const filtered = useMemo(() => {
    const col = sortDescriptor.column as keyof UserRecord;
    const dir = sortDescriptor.direction;
    const items = [...users].sort((a, b) => {
      const valA = String(a[col] ?? '');
      const valB = String(b[col] ?? '');
      const cmp = valA.localeCompare(valB);
      return dir === 'descending' ? -cmp : cmp;
    });
    return items;
  }, [users, sortDescriptor]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ROWS_PER_PAGE));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = (page - 1) * ROWS_PER_PAGE + 1;
  const end = Math.min(page * ROWS_PER_PAGE, totalCount);

  const editFilteredBranches = branches.filter((b) => !editTenantId || b.tenantId === editTenantId);

  const activeCount = counts?.active ?? 0;
  const bannedCount = counts?.banned ?? 0;

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
          {userRole !== 'staff' && userRole !== 'customer' && (
            <Button onPress={() => router.push('/invitations')}>Invite User</Button>
          )}
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <a className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all block p-5">
          <p className="text-4xl font-bold tracking-tight text-foreground">{totalCount}</p>
          <p className="text-sm text-muted mt-1">Total Users</p>
        </a>
        <a className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all block p-5">
          <p className="text-4xl font-bold tracking-tight text-success">{activeCount}</p>
          <p className="text-sm text-muted mt-1">Active</p>
        </a>
        <a className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all block p-5">
          <p className="text-4xl font-bold tracking-tight text-danger">{bannedCount}</p>
          <p className="text-sm text-muted mt-1">Banned</p>
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
                    {({ sortDirection }) => <span className="flex items-center gap-1 select-none">{sortDirection === 'ascending' && '↑'}Name</span>}
                  </Table.Column>
                  <Table.Column allowsSorting id="email">Email</Table.Column>
                  <Table.Column id="role">Role</Table.Column>
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
                  {filtered.map((user) => (
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
                              <Pencil size={16} />
                            </Button>
                            <Button size="sm" variant="ghost" className={user.banned ? 'text-default-500' : 'text-danger'} onPress={() => openBan(user)}>
                              {user.banned ? <ShieldOff size={16} /> : <Ban size={16} />}
                            </Button>
                            {canDeleteTarget(user) && (
                              <Button size="sm" variant="ghost" className="text-danger" onPress={() => openDelete(user)}>
                                <Trash2 size={16} />
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
            {totalCount > ROWS_PER_PAGE && (
              <Table.Footer>
                  <Pagination size="sm">
                    <Pagination.Summary>{start} to {end} of {totalCount} users</Pagination.Summary>
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
            )}
        </Table>
        )}
      </div>

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
