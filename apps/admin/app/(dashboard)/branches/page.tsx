'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Eye, Pencil, Trash2, MoreVertical, Phone } from 'lucide-react';
import { Button, Dropdown, Form, Input, Label, ListBox, Modal, Pagination, Select, Spinner, Table, cn, type Key, type SortDescriptor } from '@heroui/react';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import { useBranches, useCreateBranch, useDeleteBranch, useTenants, type ApiBranch } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';
import { getCountryCode, stripDialCode } from '@/lib/country-codes';
import { Flag } from '@/components/copy-button';

interface Branch {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

const ROWS_PER_PAGE = 10;

const branchSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\+?[\d\s-]{6,20}$/, 'Invalid phone number').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
});

function SortableHeader({ children, sortDirection }: { children: React.ReactNode; sortDirection?: 'ascending' | 'descending' }) {
  return (
    <span className="flex items-center gap-1 select-none">
      {children}
      {sortDirection && <ChevronDown size={12} className={cn('transition-transform duration-100', sortDirection === 'descending' ? 'rotate-180' : '')} />}
    </span>
  );
}

function EyeIcon() { return <Eye size={16} />; }
function EditIcon() { return <Pencil size={16} />; }
function TrashIcon() { return <Trash2 size={16} />; }
function DotsIcon() { return <MoreVertical size={16} />; }

export default function BranchesPage() {
  usePageTitle('Branches');
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'name', direction: 'ascending' });
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [newTenantId, setNewTenantId] = useState('');
  const [newPhoneLocal, setNewPhoneLocal] = useState('');
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userRole = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;
  const isSuperAdmin = userRole === 'superadmin';

  if (!sessionPending && (!userRole || userRole === 'staff')) { router.push('/unauthorized'); return null; }

  const { tenantFilter } = useTenantFilter();
  const { data: branches = [], isPending: branchesLoading } = useBranches();
  const { data: tenants = [] } = useTenants();
  const createBranch = useCreateBranch();
  const deleteBranch = useDeleteBranch();

  const activeTenantId = isSuperAdmin ? (newTenantId || tenantFilter) : tenantFilter;
  const selectedTenantCountry = useMemo(() => {
    const t = tenants.find((t) => t.id === activeTenantId);
    return t?.country ?? null;
  }, [activeTenantId, tenants]);
  const phoneDialCode = useMemo(() => getCountryCode(selectedTenantCountry).dialCode, [selectedTenantCountry]);
  const phoneFlag = useMemo(() => getCountryCode(selectedTenantCountry).flag, [selectedTenantCountry]);

  const filtered = useMemo(() => {
    let items = branches;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((b) => b.name.toLowerCase().includes(q) || b.email?.toLowerCase().includes(q) || b.address?.toLowerCase().includes(q));
    }
    const col = sortDescriptor.column as keyof Branch;
    const dir = sortDescriptor.direction;
    items = [...items].sort((a, b) => {
      const cmp = String(a[col]).localeCompare(String(b[col]));
      return dir === 'descending' ? -cmp : cmp;
    });
    return items;
  }, [search, sortDescriptor, branches]);

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const start = (page - 1) * ROWS_PER_PAGE + 1;
  const end = Math.min(page * ROWS_PER_PAGE, filtered.length);
  const paginated = useMemo(() => {
    const s = (page - 1) * ROWS_PER_PAGE;
    return filtered.slice(s, s + ROWS_PER_PAGE);
  }, [page, filtered]);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  function handleContextAction(key: Key, branch: Branch) {
    if (key === 'view') router.push(`/branches/${branch.id}`);
    else if (key === 'edit') router.push(`/branches/${branch.id}`);
    else if (key === 'delete') setDeleteTarget(branch);
  }

  return (
    <div className="space-y-6">
      {branchesLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner />
        </div>
      ) : (
      <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Branches</h1>
          <p className="text-sm text-muted">Manage organization branches</p>
        </div>
        <Button onPress={() => { setNewName(''); setNewPhoneLocal(''); setNewEmail(''); setNewAddress(''); setNewTenantId(''); setFormErrors({}); setCreateOpen(true); }}>New Branch</Button>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <Input placeholder="Search branches..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} fullWidth />
        </div>
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Branches" className="min-w-[650px]" sortDescriptor={sortDescriptor} onSortChange={(d) => { setSortDescriptor(d); setPage(1); }}>
              <Table.Header>
                <Table.Column id="#" width={48}>
                  {() => <span className="text-muted text-xs">#</span>}
                </Table.Column>
                <Table.Column allowsSorting id="name" isRowHeader>
                  {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Name</SortableHeader>}
                </Table.Column>
                <Table.Column allowsSorting id="phone">
                  {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Phone</SortableHeader>}
                </Table.Column>
                <Table.Column allowsSorting id="email">
                  {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Email</SortableHeader>}
                </Table.Column>
                <Table.Column allowsSorting id="address">
                  {({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Address</SortableHeader>}
                </Table.Column>
                <Table.Column id="actions" width={48}>
                  {() => null}
                </Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => (
                  <div className="flex items-center justify-center py-16 text-muted text-sm">No branches found</div>
                )}
              >
                {paginated.map((branch, i) => (
                  <Table.Row key={branch.id} id={branch.id}>
                    <Table.Cell><span className="text-xs text-muted">{start + i}</span></Table.Cell>
                    <Table.Cell className="font-medium">{branch.name}</Table.Cell>
                    <Table.Cell>{branch.phone}</Table.Cell>
                    <Table.Cell>{branch.email}</Table.Cell>
                    <Table.Cell className="max-w-40 truncate">{branch.address}</Table.Cell>
                    <Table.Cell>
                      <Dropdown.Root>
                        <Dropdown.Trigger className="inline-flex items-center justify-center rounded-md min-w-0 px-1 h-7 text-muted hover:text-foreground hover:bg-muted transition-colors outline-none text-sm">
                          <DotsIcon />
                        </Dropdown.Trigger>
                        <Dropdown.Popover placement="bottom end">
                          <Dropdown.Menu onAction={(key) => handleContextAction(key, branch)}>
                            <Dropdown.Item id="view" textValue="View"><span className="flex items-center gap-2"><EyeIcon /> View</span></Dropdown.Item>
                            <Dropdown.Item id="edit" textValue="Edit"><span className="flex items-center gap-2"><EditIcon /> Edit</span></Dropdown.Item>
                            <Dropdown.Item id="delete" textValue="Delete"><span className="flex items-center gap-2"><TrashIcon /> Delete</span></Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown.Root>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          <Table.Footer>
              <Pagination size="sm">
                <Pagination.Summary>{start} to {end} of {filtered.length} results</Pagination.Summary>
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
      </div>

      <Modal.Backdrop isOpen={createOpen} onOpenChange={(v: boolean) => { if (!v) setCreateOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>New Branch</Modal.Header>
            <Modal.Body>
              <Form.Root id="create-form" onSubmit={async (e) => {
                e.preventDefault();
                setFormErrors({});
                const parsed = branchSchema.safeParse({
                  name: newName,
                  email: newEmail,
                  address: newAddress,
                });
                if (!parsed.success) {
                  const fieldErrors: Record<string, string> = {};
                  for (const issue of parsed.error.issues) {
                    const field = issue.path[0] as string;
                    if (!fieldErrors[field]) fieldErrors[field] = issue.message;
                  }
                  setFormErrors(fieldErrors);
                  return;
                }
                setCreateOpen(false);
                const fullPhone = newPhoneLocal ? `${phoneDialCode} ${newPhoneLocal}` : '';
                createBranch.mutate({
                  name: parsed.data.name,
                  phone: fullPhone || undefined,
                  email: parsed.data.email || undefined,
                  address: parsed.data.address || undefined,
                  ...(isSuperAdmin && newTenantId ? { tenantId: newTenantId } : {}),
                });
              }} className="flex flex-col gap-4">
                {isSuperAdmin && (
                  <div className="flex flex-col gap-1">
                    <Label>Tenant</Label>
                    <Select.Root
                      selectedKey={newTenantId}
                      onSelectionChange={(k) => setNewTenantId(k as string)}
                      className="w-full"
                    >
                      <Select.Trigger className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground data-[pressed]:bg-muted/40 outline-none transition-colors">
                        <Select.Value />
                        <Select.Indicator>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </Select.Indicator>
                      </Select.Trigger>
                      <Select.Popover className="min-w-[200px] rounded-xl border border-border bg-surface p-1 shadow-lg">
                        <ListBox>
                          {tenants.map((t) => (
                            <ListBox.Item key={t.id} id={t.id} className="flex items-center px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer data-[focused]:bg-muted/40 data-[selected]:bg-accent/10 transition-colors">{t.name}</ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select.Root>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <Label htmlFor="new-name">Name</Label>
                  <Input id="new-name" variant="secondary" placeholder="Branch name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="new-phone">Phone</Label>
                  <div className="flex">
                    <div className="flex items-center gap-1.5 px-3 border border-r-0 border-border rounded-l-xl bg-muted/10 text-sm text-muted font-medium shrink-0">
                      {phoneFlag && <Flag country={phoneFlag} size={14} />}
                      {phoneDialCode}
                    </div>
                    <Input id="new-phone" variant="secondary" placeholder="Phone number" value={newPhoneLocal} onChange={(e) => setNewPhoneLocal(e.target.value.replace(/\D/g, ''))} className="rounded-l-none border-l-0 flex-1 min-w-0" />
                  </div>
                  {formErrors.phone && <p className="text-xs text-red-500">{formErrors.phone}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="new-email">Email</Label>
                  <Input id="new-email" variant="secondary" type="email" placeholder="Email address" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  {formErrors.email && <p className="text-xs text-red-500">{formErrors.email}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="new-address">Address</Label>
                  <Input id="new-address" variant="secondary" placeholder="Full street address, city, and postal code" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
                </div>
              </Form.Root>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" form="create-form" isPending={createBranch.isPending}>Create Branch</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop isOpen={!!deleteTarget} onOpenChange={(v: boolean) => { if (!v) setDeleteTarget(null); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Delete Branch</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</p>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" isPending={deleteBranch.isPending} onPress={() => {
                if (deleteTarget) { deleteBranch.mutate(deleteTarget.id); setDeleteTarget(null); }
              }}>{deleteBranch.isPending ? 'Deleting...' : 'Delete'}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      </>)}
    </div>
  );
}
