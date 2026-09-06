'use client';

import { useMemo, useState } from 'react';
import { COUNTRIES } from '@/lib/countries';
import { ChevronDown, DollarSign, Eye, Pencil, Trash2, MoreVertical, Plus, X, ArrowLeft, ArrowRight, Check, FileText, TableIcon } from 'lucide-react';
import { Button, Dropdown, Form, Input, Label, ListBox, Modal, Pagination, Select, Spinner, Table, cn, type Key, type SortDescriptor } from '@heroui/react';
import { getUser } from '@/types/auth';
import { authClient } from '@/lib/auth-client';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import { api } from '@/lib/api';
import {
  useRateCards,
  useRateCard,
  useCreateRateCard,
  useDeleteRateCard,
  useUpdateRateCard,
  type RateCard,
  type ShippingRate,
  type PaginatedResult,
} from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';
import { PageHeader } from '@/components/page-header';

const ROWS_PER_PAGE = 10;
const PLAN_OPTIONS = [
  { key: 'express-priority', label: 'GT Express Priority', desc: '3–5 days' },
  { key: 'express-saver', label: 'GT Express Saver', desc: '3–7 days' },
  { key: 'express-edge', label: 'GT Express Edge', desc: '4–7 days' },
  { key: 'economy', label: 'GT Express Economy', desc: '8–12 days' },
  { key: 'standard', label: 'GT Express Standard', desc: '10–15 days' },
] as const;

const SERVICE_LABELS: Record<string, string> = {
  'express-priority': 'GT Express Priority',
  'express-saver': 'GT Express Saver',
  'express-edge': 'GT Express Edge',
  'economy': 'GT Express Economy',
  'standard': 'GT Express Standard',
  'ocean': 'Ocean Freight',
};
function SortableHeader({ children, sortDirection }: { children: React.ReactNode; sortDirection?: 'ascending' | 'descending' }) {
  return (
    <span className="flex items-center gap-1 select-none">
      {children}
      {sortDirection && <ChevronDown size={12} className={cn('transition-transform duration-100', sortDirection === 'descending' ? 'rotate-180' : '')} />}
    </span>
  );
}

function EyeIcon() { return <Eye size={16} />; }
function TrashIcon() { return <Trash2 size={16} />; }
function DotsIcon() { return <MoreVertical size={16} />; }

interface RateRow {
  weight: string;
  rate: string;
}

function CountryInput({ value, onChange, countryList }: { value: string; onChange: (v: string) => void; countryList: typeof COUNTRIES }) {
  const [filter, setFilter] = useState('');
  const filtered = filter
    ? countryList.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    : countryList;
  return (
    <Select.Root
      selectedKey={value}
      onSelectionChange={(k) => { const v = k as string; onChange(v); }}
      className="w-full"
    >
      <Select.Trigger className="h-10 rounded-sm border border-border bg-surface px-3 text-sm text-foreground data-[pressed]:bg-muted/40 outline-none transition-colors">
        <Select.Value />
        <Select.Indicator>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </Select.Indicator>
      </Select.Trigger>
      <Select.Popover className="min-w-[300px] rounded-sm border border-border bg-surface p-1">
        <div className="px-2 py-1.5 border-b border-border mb-1">
          <input
            type="text"
            placeholder="Search country..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full h-8 rounded-sm border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <ListBox className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <ListBox.Item id="__none" className="px-3 py-2 text-sm text-muted cursor-default">No countries found</ListBox.Item>
          ) : (
            filtered.map((c) => (
              <ListBox.Item key={c.code} id={c.name} textValue={c.name} className="flex items-center px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer data-[focused]:bg-muted/40 data-[selected]:bg-accent/10 transition-colors">{c.name}</ListBox.Item>
            ))
          )}
        </ListBox>
      </Select.Popover>
    </Select.Root>
  );
}

export default function RateCardsPage() {
  usePageTitle('Rate Cards');
  const [search, setSearch] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'destinationCountry', direction: 'ascending' });
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<RateCard | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<RateCard | null>(null);

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');
  const [newCountry, setNewCountry] = useState('');
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [planRates, setPlanRates] = useState<Record<string, RateRow[]>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [rateInputMode, setRateInputMode] = useState<'table' | 'paste'>('table');
  const [pasteText, setPasteText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');

  const [csvCountry, setCsvCountry] = useState('');
  const [csvText, setCsvText] = useState('');
  const [csvError, setCsvError] = useState('');

  const isEditing = editingId !== null;

  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userRole = getUser(session)?.role;
  if (!sessionPending && !userRole) { return null; }

  useTenantFilter();
  const rateCardsQuery = useRateCards(page, ROWS_PER_PAGE, search || undefined);
  const rateCardsResp = rateCardsQuery.data as PaginatedResult<RateCard> | undefined;
  const rateCards = rateCardsResp?.data ?? [];
  const totalCount = rateCardsResp?.total ?? 0;
  const { isPending: loading, error: queryError } = rateCardsQuery;
  const countryList = COUNTRIES;
  const createRateCard = useCreateRateCard();
  const deleteRateCard = useDeleteRateCard();
  const updateRateCard = useUpdateRateCard();

  const filtered = useMemo(() => {
    const col = sortDescriptor.column as keyof RateCard;
    const dir = sortDescriptor.direction;
    return [...rateCards].sort((a, b) => {
      const cmp = String(a[col] ?? '').localeCompare(String(b[col] ?? ''));
      return dir === 'descending' ? -cmp : cmp;
    });
  }, [sortDescriptor, rateCards]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ROWS_PER_PAGE));
  const start = (page - 1) * ROWS_PER_PAGE + 1;
  const end = Math.min(page * ROWS_PER_PAGE, totalCount);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  function resetForm() {
    setStep(1); setMode('manual'); setNewCountry(''); setSelectedPlans([]);
    setPlanRates({}); setFormErrors({}); setRateInputMode('table'); setPasteText('');
    setCsvCountry(''); setCsvText(''); setCsvError(''); setEditingId(null); setNewPlanName('');
    setEditLoading(false);
  }

  function openCreateModal() { resetForm(); setFormOpen(true); }

  function openEditModal(card: RateCard) {
    resetForm();
    setEditingId(card.id);
    setNewCountry(card.destinationCountry);
    setEditLoading(true);
    setFormOpen(true);
    api.getFull<{ data: RateCard }>(`/api/rate-cards/${card.id}`)
      .then((res) => {
        const full = res.data;
        const svcTypes = [...new Set((full.rates ?? []).map((r) => r.serviceType))];
        setSelectedPlans(svcTypes);
        const rates: Record<string, RateRow[]> = {};
        for (const svc of svcTypes) {
          rates[svc] = (full.rates ?? []).filter((r) => r.serviceType === svc).map((r) => ({ weight: r.weightTo, rate: r.rate }));
        }
        setPlanRates(rates);
        setStep(3);
      })
      .catch(() => {
        const svcTypes = [...new Set((card.rates ?? []).map((r) => r.serviceType))];
        setSelectedPlans(svcTypes);
        const rates: Record<string, RateRow[]> = {};
        for (const svc of svcTypes) {
          rates[svc] = (card.rates ?? []).filter((r) => r.serviceType === svc).map((r) => ({ weight: r.weightTo, rate: r.rate }));
        }
        setPlanRates(rates);
        setStep(3);
      })
      .finally(() => setEditLoading(false));
  }

  function togglePlan(planKey: string) {
    setSelectedPlans((prev) => prev.includes(planKey) ? prev.filter((p) => p !== planKey) : [...prev, planKey]);
  }

  function addCustomPlan() {
    const name = newPlanName.trim();
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!key || selectedPlans.includes(key)) return;
    setSelectedPlans((prev) => [...prev, key]);
    SERVICE_LABELS[key] = name;
    setPlanRates((prev) => ({ ...prev, [key]: [] }));
    setNewPlanName('');
  }

  function removePlan(planKey: string) {
    setSelectedPlans((prev) => prev.filter((p) => p !== planKey));
    setPlanRates((prev) => {
      const next = { ...prev };
      delete next[planKey];
      return next;
    });
  }

  function goToStep3() {
    setFormErrors({});
    if (selectedPlans.length === 0) { setFormErrors({ plans: 'Select at least one plan' }); return; }
    if (!Object.keys(planRates).length) {
      const initial: Record<string, RateRow[]> = {};
      for (const p of selectedPlans) initial[p] = [];
      setPlanRates(initial);
    }
    setPasteText(''); setRateInputMode('table'); setStep(3);
  }

  function updateRateRow(svc: string, index: number, field: keyof RateRow, value: string) {
    setPlanRates((prev) => ({
      ...prev,
      [svc]: (prev[svc] ?? []).map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    }));
  }

  function removeRateRow(svc: string, index: number) {
    setPlanRates((prev) => ({ ...prev, [svc]: (prev[svc] ?? []).filter((_, i) => i !== index) }));
  }

  function addRow(svc: string) {
    setPlanRates((prev) => {
      const rows = prev[svc] ?? [];
      const lastWeight = rows.length > 0 ? String(Math.ceil(parseFloat(rows[rows.length - 1]!.weight)) + 1) : '1';
      return { ...prev, [svc]: [...rows, { weight: lastWeight, rate: '' }] };
    });
  }

  function parsePasteText() {
    const lines = pasteText.trim().split('\n').filter((l) => l.trim());
    const rows: RateRow[] = [];
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map((s) => s.trim());
      if (parts.length >= 2) rows.push({ weight: parts[0] ?? '1', rate: parts[1] ?? '' });
      else if (parts.length === 1) {
        const [w, r] = (parts[0] ?? '').split(/\s+/);
        rows.push({ weight: w ?? '1', rate: r ?? '' });
      }
    }
    if (rows.length > 0 && selectedPlans[0]) {
      setPlanRates((prev) => ({ ...prev, [selectedPlans[0]!]: rows }));
    }
  }

  function buildDbRates() {
    const dbRates: { packageType: string; serviceType: string; weightFrom: string; weightTo: string; rate: string }[] = [];
    for (const svc of selectedPlans) {
      const rows = planRates[svc] ?? [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]!;
        const from = i === 0 ? '0.00' : parseFloat(rows[i - 1]!.weight).toFixed(2);
        const to = parseFloat(r.weight).toFixed(2);
        dbRates.push({ packageType: 'all', serviceType: svc, weightFrom: from, weightTo: to, rate: r.rate });
      }
    }
    return dbRates;
  }

  function handleSave() {
    setFormErrors({});
    if (!newCountry.trim()) { setFormErrors({ destinationCountry: 'Country is required' }); return; }
    const allRows = selectedPlans.flatMap((svc) => planRates[svc] ?? []);
    if (allRows.length === 0) { setFormErrors({ rates: 'Add at least one rate row' }); return; }
    if (allRows.some((r) => !r.rate || !r.weight)) { setFormErrors({ rates: 'All weight and rate fields are required' }); return; }

    const dbRates = buildDbRates();
    if (isEditing) {
      updateRateCard.mutate(
        { id: editingId, data: { destinationCountry: newCountry.trim(), rates: dbRates } },
        { onSuccess: () => { setFormOpen(false); } },
      );
    } else {
      createRateCard.mutate(
        { destinationCountry: newCountry.trim(), rates: dbRates },
        { onSuccess: () => { setFormOpen(false); } },
      );
    }
  }

  function parseCsv(text: string): { serviceType: string; weight: string; rate: string }[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');
    const rows: { serviceType: string; weight: string; rate: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cols = line.split(',').map((c) => c.trim());
      if (cols.length < 3) throw new Error(`Row ${i + 1}: expected 3 columns (serviceType,weight,rate)`);
      rows.push({ serviceType: cols[0] ?? '', weight: cols[1] ?? '0', rate: cols[2] ?? '0' });
    }
    return rows;
  }

  function handleCsvUpload() {
    setCsvError('');
    try {
      const rows = parseCsv(csvText);
      if (!csvCountry.trim()) { setCsvError('Country is required'); return; }
      const dbRates = rows.map((r, i, arr) => {
        const prevSame = arr.slice(0, i).filter((x) => x.serviceType === r.serviceType);
        const from = prevSame.length === 0 ? '0.00' : (parseFloat(prevSame[prevSame.length - 1]!.weight)).toFixed(2);
        const to = parseFloat(r.weight).toFixed(2);
        return { packageType: 'all', serviceType: r.serviceType, weightFrom: from, weightTo: to, rate: r.rate };
      });
      createRateCard.mutate(
        { destinationCountry: csvCountry.trim(), rates: dbRates },
        { onSuccess: () => { setFormOpen(false); }, onError: (err) => setCsvError(err.message) },
      );
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'Invalid CSV');
    }
  }

  function handleContextAction(key: Key, card: RateCard) {
    if (key === 'view') setDetailTarget(card);
    else if (key === 'edit') openEditModal(card);
    else if (key === 'delete') setDeleteTarget(card);
    else if (key === 'toggle') updateRateCard.mutate({ id: card.id, data: { isActive: !card.isActive } });
  }

  const stepTitles = ['Country', 'Plans', 'Rates'];

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]"><Spinner /></div>
      ) : (
      <>
      <PageHeader title="Rate Cards" subtitle="Manage shipping rates by destination country" icon={<DollarSign size={18} />}
        action={<Button onPress={openCreateModal}><Plus size={14} /> New Rate Card</Button>}
      />

      {queryError && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load rate cards. {queryError instanceof Error ? queryError.message : 'Please try again.'}
        </div>
      )}

      <div className="rounded-sm border border-border bg-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <Input placeholder="Search by country..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} fullWidth />
        </div>
        <Table className="table-clickable">
          <Table.ScrollContainer>
            <Table.Content aria-label="Rate Cards" className="min-w-[600px]" sortDescriptor={sortDescriptor} onSortChange={(d) => { setSortDescriptor(d); setPage(1); }} onRowAction={(key) => { const card = rateCards.find((c) => c.id === key); if (card) setDetailTarget(card); }}>
              <Table.Header>
                <Table.Column id="#" width={48}>{() => <span className="text-muted text-xs">#</span>}</Table.Column>
                <Table.Column allowsSorting id="destinationCountry" isRowHeader>{({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Country</SortableHeader>}</Table.Column>
                <Table.Column id="plans">{() => <span>Plans</span>}</Table.Column>
                <Table.Column allowsSorting id="isActive">{({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Status</SortableHeader>}</Table.Column>
                <Table.Column allowsSorting id="updatedAt">{({ sortDirection }) => <SortableHeader sortDirection={sortDirection}>Updated</SortableHeader>}</Table.Column>
                <Table.Column id="actions" width={48}>{() => null}</Table.Column>
              </Table.Header>
              <Table.Body renderEmptyState={() => <div className="flex items-center justify-center py-16 text-muted text-sm">No rate cards found</div>}>
                {filtered.map((card, i) => {
                  const plans = [...new Set((card.rates ?? []).map((r) => r.serviceType))];
                  return (
                    <Table.Row key={card.id} id={card.id}>
                      <Table.Cell><span className="text-xs text-muted">{start + i}</span></Table.Cell>
                      <Table.Cell className="font-medium">{card.destinationCountry}</Table.Cell>
                      <Table.Cell>
                        <div className="flex gap-1">
                          {plans.map((p) => <span key={p} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-foreground/[0.06] text-foreground/70">{SERVICE_LABELS[p] ?? p}</span>)}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', card.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                          {card.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="text-sm text-muted">{new Date(card.updatedAt).toLocaleDateString()}</Table.Cell>
                      <Table.Cell>
                        <span onClick={(e) => e.stopPropagation()}>
                          <Dropdown.Root>
                            <Dropdown.Trigger className="inline-flex items-center justify-center rounded-md min-w-0 px-1 h-7 text-muted hover:text-foreground hover:bg-muted transition-colors outline-none text-sm"><DotsIcon /></Dropdown.Trigger>
                            <Dropdown.Popover placement="bottom end">
                              <Dropdown.Menu onAction={(key) => handleContextAction(key, card)}>
                                <Dropdown.Item id="view" textValue="View"><span className="flex items-center gap-2"><EyeIcon /> View</span></Dropdown.Item>
                                <Dropdown.Item id="edit" textValue="Edit"><span className="flex items-center gap-2"><Pencil size={16} /> Edit</span></Dropdown.Item>
                                <Dropdown.Item id="toggle" textValue="Toggle"><span className="flex items-center gap-2">{card.isActive ? 'Deactivate' : 'Activate'}</span></Dropdown.Item>
                                <Dropdown.Item id="delete" textValue="Delete"><span className="flex items-center gap-2"><TrashIcon /> Delete</span></Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown.Root>
                        </span>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          <Table.Footer>
            <Pagination size="sm">
              <Pagination.Summary>{start} to {end} of {totalCount} results</Pagination.Summary>
              <Pagination.Content>
                <Pagination.Item><Pagination.Previous isDisabled={page === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}><Pagination.PreviousIcon /> Prev</Pagination.Previous></Pagination.Item>
                {pages.map((p) => <Pagination.Item key={p}><Pagination.Link isActive={p === page} onPress={() => setPage(p)}>{p}</Pagination.Link></Pagination.Item>)}
                <Pagination.Item><Pagination.Next isDisabled={page === totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}>Next <Pagination.NextIcon /></Pagination.Next></Pagination.Item>
              </Pagination.Content>
            </Pagination>
          </Table.Footer>
        </Table>
      </div>

      {/* Create / Edit Modal */}
      <Modal.Backdrop isOpen={formOpen} onOpenChange={(v: boolean) => { if (!v) setFormOpen(false); }}>
        <Modal.Container>
            <Modal.Dialog className="max-w-2xl max-h-[90vh]">
            <Modal.Header>
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-center justify-between">
                  <span>{isEditing ? 'Edit Rate Card' : 'New Rate Card'}</span>
                  {!isEditing && (
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      <button type="button" onClick={() => setMode('manual')} className={cn('px-3 py-1.5 text-xs font-medium transition-colors', mode === 'manual' ? 'bg-[#E8621A] text-white' : 'bg-surface text-foreground/60 hover:bg-muted/40')}><TableIcon size={12} className="inline mr-1" />Manual</button>
                      <button type="button" onClick={() => { setMode('csv'); setCsvError(''); }} className={cn('px-3 py-1.5 text-xs font-medium transition-colors', mode === 'csv' ? 'bg-[#E8621A] text-white' : 'bg-surface text-foreground/60 hover:bg-muted/40')}><FileText size={12} className="inline mr-1" />Import CSV</button>
                    </div>
                  )}
                </div>
                {mode === 'manual' && !isEditing && (
                  <div className="flex items-center gap-2">
                    {stepTitles.map((title, i) => (
                      <div key={title} className="flex items-center gap-2">
                        <div className={cn('flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold', i + 1 <= step ? 'bg-[#E8621A] text-white' : 'bg-foreground/10 text-foreground/40')}>
                          {i + 1 < step ? <Check size={14} /> : i + 1}
                        </div>
                        <span className={cn('text-sm', i + 1 <= step ? 'text-foreground font-medium' : 'text-foreground/40')}>{title}</span>
                        {i < 2 && <div className={cn('w-8 h-px', i + 1 < step ? 'bg-[#E8621A]' : 'bg-foreground/15')} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Modal.Header>
            <Modal.Body className="max-h-[75vh] overflow-y-auto">

              {editLoading && (
                <div className="flex items-center justify-center py-12"><Spinner size="lg" /></div>
              )}

              {!editLoading && (
              <>
              {/* CSV MODE */}
              {mode === 'csv' && !isEditing && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <Label>Destination Country</Label>
                    <CountryInput value={csvCountry} onChange={setCsvCountry} countryList={countryList} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>CSV Data</Label>
                    <p className="text-xs text-muted mb-1">Format: serviceType,weight,rate (one row per slab)</p>
                    <textarea className="h-48 rounded-sm border border-border bg-surface p-3 text-sm font-mono outline-none focus:ring-1 focus:ring-ring" placeholder={`express-priority,0.5,1250\nexpress-priority,1,1450\neconomy,1,1800`} value={csvText} onChange={(e) => setCsvText(e.target.value)} />
                    {csvError && <p className="text-xs text-danger">{csvError}</p>}
                  </div>
                </div>
              )}

              {/* MANUAL MODE */}
              {mode === 'manual' && (
                <>
                  {/* Step 1: Country */}
                  {step === 1 && (
                    <Form.Root id="step1-form" onSubmit={(e) => { e.preventDefault(); setFormErrors({}); if (!newCountry.trim()) { setFormErrors({ destinationCountry: 'Country is required' }); return; } setStep(2); }} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <Label>Destination Country</Label>
                        <CountryInput value={newCountry} onChange={setNewCountry} countryList={countryList} />
                        {formErrors.destinationCountry && <p className="text-xs text-danger">{formErrors.destinationCountry}</p>}
                      </div>
                    </Form.Root>
                  )}

                  {/* Step 2: Plans — Toggle Pills + Custom */}
                  {step === 2 && (
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-muted">Select plans for {newCountry}.</p>
                      {formErrors.plans && <p className="text-xs text-danger">{formErrors.plans}</p>}
                      <div className="flex flex-wrap gap-2">
                        {PLAN_OPTIONS.map((plan) => {
                          const isActive = selectedPlans.includes(plan.key);
                          return (
                            <button key={plan.key} type="button" onClick={() => togglePlan(plan.key)}
                              className={cn('inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all', isActive ? 'bg-[#E8621A] text-white shadow-sm' : 'bg-foreground/[0.06] text-foreground/70 hover:bg-foreground/[0.1]')}>
                              {plan.label}
                              <span className={cn('text-xs', isActive ? 'text-white/70' : 'text-foreground/40')}>{plan.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input placeholder="Custom plan name (e.g. Ocean Freight)" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomPlan(); } }} className="flex-1" />
                        <Button variant="secondary" onPress={addCustomPlan} isDisabled={!newPlanName.trim()}><Plus size={14} /> Add Plan</Button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Rates — per plan */}
                  {step === 3 && (
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted">Enter rates per plan. Same rate applies to document, parcel &amp; cargo.</p>
                        <div className="flex rounded-md border border-border overflow-hidden">
                          <button type="button" onClick={() => setRateInputMode('table')} className={cn('px-3 py-1 text-xs font-medium transition-colors', rateInputMode === 'table' ? 'bg-[#E8621A] text-white' : 'bg-surface text-foreground/60')}><TableIcon size={11} className="inline mr-1" />Table</button>
                          <button type="button" onClick={() => setRateInputMode('paste')} className={cn('px-3 py-1 text-xs font-medium transition-colors', rateInputMode === 'paste' ? 'bg-[#E8621A] text-white' : 'bg-surface text-foreground/60')}><FileText size={11} className="inline mr-1" />Paste</button>
                        </div>
                      </div>
                      {formErrors.rates && <p className="text-xs text-danger">{formErrors.rates}</p>}

                      {rateInputMode === 'table' && selectedPlans.map((svc) => {
                        const label = SERVICE_LABELS[svc] ?? svc;
                        const rows = planRates[svc] ?? [];
                        return (
                          <div key={svc} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{label}</span>
                                <button type="button" onClick={() => removePlan(svc)} className="text-foreground/30 hover:text-danger transition-colors"><X size={14} /></button>
                              </div>
                              <Button size="sm" variant="secondary" onPress={() => addRow(svc)}><Plus size={12} /> Add Row</Button>
                            </div>
                            {rows.length > 0 ? (
                              <div className="rounded-lg border border-border overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-muted/30">
                                      <th className="px-3 py-2 text-left text-xs font-medium text-muted w-32">Up to (kg)</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-muted">Rate</th>
                                      <th className="px-3 py-2 w-16"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.map((r, j) => (
                                      <tr key={j} className="border-t border-border">
                                        <td className="px-3 py-1.5"><Input value={r.weight} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) updateRateRow(svc, j, 'weight', v); }} className="h-8 text-sm" /></td>
                                        <td className="px-3 py-1.5"><Input placeholder="0" value={r.rate} onChange={(e) => updateRateRow(svc, j, 'rate', e.target.value)} className="h-8 text-sm" /></td>
                                        <td className="px-3 py-1.5"><Button size="sm" variant="danger" onPress={() => removeRateRow(svc, j)}><X size={12} /></Button></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-muted">No rows yet. Click "Add Row" to start.</p>
                            )}
                          </div>
                        );
                      })}

                      {rateInputMode === 'table' && (
                        <div className="flex items-center gap-2 pt-2">
                          <Input placeholder="New plan name" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomPlan(); } }} className="flex-1" />
                          <Button variant="secondary" onPress={addCustomPlan} isDisabled={!newPlanName.trim()}><Plus size={14} /> Add Plan</Button>
                        </div>
                      )}

                      {rateInputMode === 'paste' && (
                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-muted">Paste rates — one per line. Format: <code className="bg-muted/40 px-1 rounded">weight,rate</code></p>
                          <textarea className="h-48 rounded-sm border border-border bg-surface p-3 text-sm font-mono outline-none focus:ring-1 focus:ring-ring" placeholder={`5,1200\n10,1800\n15,2500`} value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
                          <Button size="sm" variant="secondary" onPress={parsePasteText} className="self-start"><Check size={12} /> Apply Pasted Rates</Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              </>
              )}
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              {mode === 'manual' && step > 1 && !isEditing && (
                <Button variant="secondary" onPress={() => setStep(step - 1)}><ArrowLeft size={14} /> Back</Button>
              )}
              <div className="flex-1" />
              <Button variant="secondary" onPress={() => setFormOpen(false)}>Cancel</Button>
              {mode === 'csv' && !isEditing && (
                <Button isPending={createRateCard.isPending} onPress={handleCsvUpload}>Import</Button>
              )}
              {mode === 'manual' && step === 1 && (
                <Button type="submit" form="step1-form">Next <ArrowRight size={14} /></Button>
              )}
              {mode === 'manual' && step === 2 && (
                <Button onPress={goToStep3}>Next <ArrowRight size={14} /></Button>
              )}
              {mode === 'manual' && step === 3 && (
                <Button isPending={createRateCard.isPending || updateRateCard.isPending} onPress={handleSave}>{isEditing ? 'Save Changes' : 'Create Rate Card'}</Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Detail/View Modal */}
      <Modal.Backdrop isOpen={!!detailTarget} onOpenChange={(v: boolean) => { if (!v) setDetailTarget(null); }}>
        <Modal.Container>
          <Modal.Dialog className="max-w-3xl">
            <Modal.Header>
              <div className="flex items-center justify-between w-full">
                <span>{detailTarget?.destinationCountry} — Rate Card</span>
                {detailTarget && <Button size="sm" variant="secondary" onPress={() => { setDetailTarget(null); openEditModal(detailTarget); }}><Pencil size={12} /> Edit</Button>}
              </div>
            </Modal.Header>
            <Modal.Body className="max-h-[75vh] overflow-y-auto">
              {detailTarget && (
                <div className="space-y-4">
                  <div className="flex gap-4 text-sm">
                    <span className="text-muted">Status:</span>
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', detailTarget.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                      {detailTarget.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <RateTable rateCardId={detailTarget.id} />
                </div>
              )}
            </Modal.Body>
            <Modal.Footer><Button variant="secondary" onPress={() => setDetailTarget(null)}>Close</Button></Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Delete Modal */}
      <Modal.Backdrop isOpen={!!deleteTarget} onOpenChange={(v: boolean) => { if (!v) setDeleteTarget(null); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Delete Rate Card</Modal.Header>
            <Modal.Body><p className="text-sm text-muted">Are you sure you want to delete the rate card for <strong>{deleteTarget?.destinationCountry}</strong>? All shipping rates will be removed. This action cannot be undone.</p></Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" isPending={deleteRateCard.isPending} onPress={() => { if (deleteTarget) { deleteRateCard.mutate(deleteTarget.id); setDeleteTarget(null); } }}>{deleteRateCard.isPending ? 'Deleting...' : 'Delete'}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      </>)}
    </div>
  );
}

function RateTable({ rateCardId }: { rateCardId: string }) {
  const { data, isPending } = useRateCard(rateCardId);
  const rateCard = (data as unknown as { data: RateCard } | undefined)?.data;
  const rates: ShippingRate[] = rateCard?.rates ?? [];

  if (isPending) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (!rates.length) return <p className="text-sm text-muted">No rates found.</p>;

  const grouped: Record<string, ShippingRate[]> = {};
  for (const r of rates) {
    if (!grouped[r.serviceType]) grouped[r.serviceType] = [];
    grouped[r.serviceType]!.push(r);
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([svc, slabs]) => (
        <div key={svc}>
          <h3 className="text-sm font-semibold mb-2">{SERVICE_LABELS[svc] ?? svc}</h3>
          <div className="rounded-sm border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted">Weight (kg)</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted">Rate</th>
                </tr>
              </thead>
              <tbody>
                {slabs.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-3 py-2">Up to {s.weightTo} kg</td>
                    <td className="px-3 py-2 text-right font-medium">{parseFloat(s.rate).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
