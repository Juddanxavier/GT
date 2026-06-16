'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Trash2, ChevronDown, MoreVertical } from 'lucide-react';
import { Button, Dropdown, Input, Label, Modal, Pagination, Table, cn, type Key, type SortDescriptor } from '@heroui/react';
import { api } from '@/lib/api';

interface Branch {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

const DUMMY_BRANCHES: Branch[] = [
  { id: 'b1', name: 'Colombo HQ', phone: '+94 11 234 5678', email: 'colombo@gajan.lk', address: '42 Galle Road, Colombo 03' },
  { id: 'b2', name: 'Kandy Branch', phone: '+94 81 345 6789', email: 'kandy@gajan.lk', address: '15 Peradeniya Road, Kandy' },
  { id: 'b3', name: 'Jaffna Office', phone: '+94 21 456 7890', email: 'jaffna@gajan.lk', address: '8 Hospital Road, Jaffna' },
  { id: 'b4', name: 'Chennai Warehouse', phone: '+91 44 5678 9012', email: 'chennai@gajan.in', address: '23 Mount Road, Chennai' },
  { id: 'b5', name: 'Mumbai Office', phone: '+91 22 6789 0123', email: 'mumbai@gajan.in', address: '55 Marine Drive, Mumbai' },
  { id: 'b6', name: 'Delhi Hub', phone: '+91 11 7890 1234', email: 'delhi@gajan.in', address: '12 Connaught Place, New Delhi' },
  { id: 'b7', name: 'Galle Depot', phone: '+94 91 567 8901', email: 'galle@gajan.lk', address: '7 Lighthouse Street, Galle' },
  { id: 'b8', name: 'Bangalore Center', phone: '+91 80 8901 2345', email: 'bangalore@gajan.in', address: '90 MG Road, Bangalore' },
];

const ROWS_PER_PAGE = 4;

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
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'name', direction: 'ascending' });
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const filtered = useMemo(() => {
    let items = DUMMY_BRANCHES;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((b) => b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q) || b.address.toLowerCase().includes(q));
    }
    const col = sortDescriptor.column as keyof Branch;
    const dir = sortDescriptor.direction;
    items = [...items].sort((a, b) => {
      const cmp = String(a[col]).localeCompare(String(b[col]));
      return dir === 'descending' ? -cmp : cmp;
    });
    return items;
  }, [search, sortDescriptor]);

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return filtered.slice(start, start + ROWS_PER_PAGE);
  }, [page, filtered]);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = (page - 1) * ROWS_PER_PAGE + 1;
  const end = Math.min(page * ROWS_PER_PAGE, filtered.length);

  function handleContextAction(key: Key, branch: Branch) {
    if (key === 'view') router.push(`/branches/${branch.id}`);
    else if (key === 'edit') router.push(`/branches/${branch.id}/edit`);
    else if (key === 'delete') setDeleteTarget(branch);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 500));
    setDeleting(false);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Branches</h1>
          <p className="text-sm text-muted">Manage organization branches</p>
        </div>
        <Button onPress={() => { setNewName(''); setNewPhone(''); setNewEmail(''); setNewAddress(''); setCreateOpen(true); }}>New Branch</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
          <div className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <p className="text-4xl font-bold tracking-tight text-foreground">{filtered.length}</p>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-success/10 text-success">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                12.5%
              </span>
            </div>
            <p className="text-sm text-muted mt-1">Total Branches</p>
          </div>
          <svg className="w-full h-8 text-accent/30" viewBox="0 0 120 24" preserveAspectRatio="none">
            <defs><linearGradient id="g-b-total" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.4" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,18 L10,14 L20,12 L30,8 L40,4 L50,6 L60,4 L70,2 L80,4 L90,2 L100,4 L110,2 L120,2 L120,24 L0,24 Z" fill="url(#g-b-total)" />
            <polyline points="0,18 10,14 20,12 30,8 40,4 50,6 60,4 70,2 80,4 90,2 100,4 110,2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
          <div className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <p className="text-4xl font-bold tracking-tight text-foreground">{DUMMY_BRANCHES.filter((b) => b.email.endsWith('.in')).length}</p>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-success/10 text-success">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                8.3%
              </span>
            </div>
            <p className="text-sm text-muted mt-1">India</p>
          </div>
          <svg className="w-full h-8 text-success/30" viewBox="0 0 120 24" preserveAspectRatio="none">
            <defs><linearGradient id="g-b-india" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.4" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,20 L10,18 L20,16 L30,14 L40,12 L50,10 L60,8 L70,6 L80,4 L90,6 L100,4 L110,4 L120,4 L120,24 L0,24 Z" fill="url(#g-b-india)" />
            <polyline points="0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6 80,4 90,6 100,4 110,4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="rounded-2xl bg-surface shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
          <div className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <p className="text-4xl font-bold tracking-tight text-foreground">{DUMMY_BRANCHES.filter((b) => b.email.endsWith('.lk')).length}</p>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-success/10 text-success">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                15.2%
              </span>
            </div>
            <p className="text-sm text-muted mt-1">Sri Lanka</p>
          </div>
          <svg className="w-full h-8 text-accent/30" viewBox="0 0 120 24" preserveAspectRatio="none">
            <defs><linearGradient id="g-b-lk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.4" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,16 L10,20 L20,18 L30,22 L40,14 L50,10 L60,6 L70,8 L80,6 L90,2 L100,4 L110,2 L120,2 L120,24 L0,24 Z" fill="url(#g-b-lk)" />
            <polyline points="0,16 10,20 20,18 30,22 40,14 50,10 60,6 70,8 80,6 90,2 100,4 110,2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
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
          {filtered.length > ROWS_PER_PAGE && (
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
          )}
        </Table>
      </div>

      <Modal.Backdrop isOpen={createOpen} onOpenChange={(v: boolean) => { if (!v) setCreateOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>New Branch</Modal.Header>
            <Modal.Body>
              <form id="create-form" onSubmit={async (e) => { e.preventDefault(); setCreateSaving(true); try { await api.post('/api/branches', { name: newName, phone: newPhone || undefined, email: newEmail || undefined, address: newAddress || undefined }); setCreateOpen(false); } finally { setCreateSaving(false); } }} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="new-name">Name *</Label>
                  <Input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)} required fullWidth />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-phone">Phone</Label>
                  <Input id="new-phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} fullWidth />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-email">Email</Label>
                  <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} fullWidth />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-address">Address</Label>
                  <Input id="new-address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} fullWidth />
                </div>
              </form>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" form="create-form" isPending={createSaving}>Create Branch</Button>
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
              <Button variant="danger" isPending={deleting} onPress={handleDelete}>{deleting ? 'Deleting...' : 'Delete'}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
