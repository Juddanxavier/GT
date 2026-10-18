'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTableHeaderScope } from '@/components/use-table-header-scope';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers, useBranches, useDeleteUser, type UserRecord, type PaginatedResult } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';
import { Button, Chip, Input, ListBox, Modal, Pagination, Select, Table, Tabs, type SortDescriptor } from '@heroui/react';
import { TablePreferences, useTablePreferences, densityClassName, type ColumnDef } from '@/components/table-preferences';
import { PageHeader } from '@/components/page-header';
import { getUser } from '@/types/auth';
import { authClient } from '@/lib/auth-client';
import { Pencil, Trash2, Ban, ShieldOff, CircleX, Check, Users } from 'lucide-react';
import { useToast } from '@/components/toast';

type Branch = { id: string; name: string; tenantId: string };

const ROLE_COLORS: Record<string, 'accent' | 'success' | 'warning' | 'default'> = {
  superadmin: 'accent',
  admin: 'accent',
  'tenant-admin': 'success',
  staff: 'warning',
  customer: 'default',
};

const DEFAULT_ROWS = 10;

const USER_COLUMNS: ColumnDef[] = [
  { id: 'name', label: 'Name', always: true },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'role', label: 'Role' },
  { id: 'branchId', label: 'Branch' },
  { id: 'banned', label: 'Status', always: true },
];




export default function UsersPage() {
  usePageTitle('Users');
  useTableHeaderScope();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: branches = [] } = useBranches();
  const { mutateAsync: deleteUser } = useDeleteUser();
  const [search, setSearch] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'name', direction: 'ascending' });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS);
  const prefs = useTablePreferences('users-table', USER_COLUMNS);

  // Server-side pagination
  const usersQuery = useUsers(page, rowsPerPage, search, undefined, statusFilter);
  const usersResp = usersQuery.data as PaginatedResult<UserRecord> | undefined;
  const users = Array.isArray(usersResp) ? usersResp : (usersResp?.data ?? []);
  const totalCount = Array.isArray(usersResp) ? users.length : (usersResp?.total ?? 0);
  const counts = !Array.isArray(usersResp) ? usersResp?.counts : undefined;
  const isLoading = usersQuery.isPending;


  const { data: session } = authClient.useSession();
  const sessionUser = getUser(session);


  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [banTarget, setBanTarget] = useState<UserRecord | null>(null);
  const [banSaving, setBanSaving] = useState(false);

  useEffect(() => {
    authClient.getSession().then((res) => {
      const role = (res.data?.user as { role?: string } | undefined)?.role;
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

  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, totalCount);

  const activeCount = counts?.active ?? 0;
  const bannedCount = counts?.banned ?? 0;

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
      toast('error', 'Failed to ban user', e instanceof Error ? e.message : undefined);
    }
    setBanSaving(false);
  }

  const sessionUserId = sessionUser?.id ?? '';
  const sessionUserRole = sessionUser?.role ?? '';

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
      toast('error', 'Failed to delete user', e instanceof Error ? e.message : undefined);
    }
    setDeleteSaving(false);
  }

  return (
    <div className="space-y-8">
        <PageHeader
          title="Users"
          subtitle="Manage user accounts and permissions"
          icon={<Users size={18} />}
          action={userRole !== 'staff' && userRole !== 'customer' ? (
            <Button onPress={() => router.push('/invitations')}>Invite User</Button>
          ) : undefined}
        />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="content-panel glass-panel-hover transition-colors duration-300 p-5">
          <p className="text-4xl font-bold tracking-tight text-foreground">{totalCount}</p>
          <p className="text-sm text-muted mt-1">Total Users</p>
        </div>
        <div className="content-panel glass-panel-hover transition-colors duration-300 p-5">
          <p className="text-4xl font-bold tracking-tight text-success-soft-foreground">{activeCount}</p>
          <p className="text-sm text-muted mt-1">Active</p>
        </div>
        <div className="content-panel glass-panel-hover transition-colors duration-300 p-5">
          <p className="text-4xl font-bold tracking-tight text-danger-soft-foreground">{bannedCount}</p>
          <p className="text-sm text-muted mt-1">Banned</p>
        </div>
      </div>

      <div className="content-panel overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="sm:flex-1"><Input id="users-search" variant="secondary" placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} fullWidth /></div>
            <div className="flex items-center gap-2">
              <TablePreferences
                storageKey="users-table"
                columns={USER_COLUMNS}
                hidden={prefs.hidden}
                onHiddenChange={prefs.setHidden}
                density={prefs.density}
                onDensityChange={prefs.setDensity}
              />
            </div>
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
          <Table className={densityClassName(prefs.density)}>
            <Table.ScrollContainer>
              <Table.Content aria-label="Customers table" className="min-w-[950px]"
                sortDescriptor={sortDescriptor}
                onSortChange={(d) => { setSortDescriptor(d); setPage(1); }}>
                <Table.Header>
                  <Table.Column allowsSorting id="name" isRowHeader>
                    {({ sortDirection }) => <span className="flex items-center gap-1 select-none">{sortDirection === 'ascending' && '↑'}Name</span>}
                  </Table.Column>
                  {prefs.isVisible('email') && <Table.Column allowsSorting id="email">Email</Table.Column>}
                  {prefs.isVisible('phone') && <Table.Column allowsSorting id="phone">Phone</Table.Column>}
                  {prefs.isVisible('role') && <Table.Column id="role">Role</Table.Column>}
                  {prefs.isVisible('branchId') && <Table.Column id="branchId">Branch</Table.Column>}
                  {prefs.isVisible('banned') && <Table.Column id="banned">Status</Table.Column>}
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
                          <span className="font-medium text-sm"><a className="hover:text-accent hover:underline transition-colors" href={`/customers/${user.id}`}>{user.name}</a></span>
                        </div>
                      </Table.Cell>
                      {prefs.isVisible('email') && <Table.Cell className="text-sm">{user.email}</Table.Cell>}
                      {prefs.isVisible('phone') && <Table.Cell className="text-sm text-muted">{user.phone || '—'}</Table.Cell>}
                      {prefs.isVisible('role') && (
                        <Table.Cell>
                          <Chip size="sm" variant="soft" color={ROLE_COLORS[user.role] ?? 'default'}>{user.role}</Chip>
                        </Table.Cell>
                      )}
                      {prefs.isVisible('branchId') && (
                        <Table.Cell className="text-sm text-muted">
                          {branches.find((b) => b.id === user.branchId)?.name || '—'}
                        </Table.Cell>
                      )}
                      {prefs.isVisible('banned') && (
                        <Table.Cell>
                          {user.banned ? (
                            <span className="text-xs text-danger-soft-foreground flex items-center gap-1">
                              <CircleX size={10} />
                              Banned
                            </span>
                          ) : (
                            <span className="text-xs text-success-soft-foreground flex items-center gap-1">
                              <Check size={10} />
                              Active
                            </span>
                          )}
                        </Table.Cell>
                      )}
                      {userRole !== 'staff' && (
                        <Table.Cell>
                          <div className="flex items-center gap-0.5">
                            <Button size="sm" variant="ghost" className="text-warning-soft-foreground" onPress={() => router.push(`/customers/${user.id}/edit`)}>
                              <Pencil size={16} />
                            </Button>
                            <Button size="sm" variant="ghost" className={user.banned ? 'text-default-500' : 'text-danger-soft-foreground'} onPress={() => openBan(user)}>
                              {user.banned ? <ShieldOff size={16} /> : <Ban size={16} />}
                            </Button>
                            {canDeleteTarget(user) && (
                              <Button size="sm" variant="ghost" className="text-danger-soft-foreground" onPress={() => openDelete(user)}>
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
            {totalCount > rowsPerPage && (
              <Table.Footer>
                <div className="flex items-center justify-between w-full px-4 py-2 gap-4">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>Rows</span>
                    <Select selectedKey={String(rowsPerPage)} onSelectionChange={(k) => { setRowsPerPage(Number(k)); setPage(1); }} variant="secondary" className="w-20" aria-label="Rows per page">
                      <Select.Trigger className="h-7 text-xs">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {[10, 25, 50, 100].map((n) => <ListBox.Item key={n} id={String(n)} textValue={String(n)}>{n}</ListBox.Item>)}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
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
                </div>
              </Table.Footer>
            )}
        </Table>
        )}
      </div>

      {/* Ban/Unban Modal */}
      <Modal.Backdrop isOpen={!!banTarget} onOpenChange={(v) => { if (!v) setBanTarget(null); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{banTarget?.banned ? 'Unban User' : 'Ban User'}</Modal.Heading>
            </Modal.Header>
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
            <Modal.Header>
              <Modal.Heading>Delete User</Modal.Heading>
            </Modal.Header>
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
