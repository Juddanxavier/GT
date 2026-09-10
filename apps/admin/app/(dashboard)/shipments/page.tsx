'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { STATUS_GROUPS, STATUS_META, statusGroupCounts } from '@/lib/status-config';
import { Plus, Radio } from 'lucide-react';
import { Button, Modal, Spinner, type Key, type SortDescriptor } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { type AddressData } from '@/components/address-form';
import { useTablePreferences } from '@/components/table-preferences';
import { authClient } from '@/lib/auth-client';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';
import {
  useShipments,
  useCustomers,
  useBranches,
  useTenants,
  useCreateShipment,
  useDeleteShipment,
  type PaginatedResult,
  type Shipment,
} from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';
import { getUser } from '@/types/auth';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import { getCountryCode } from '@/lib/country-codes';
import { SHIPMENT_COLUMNS, SHIPMENTS_TABLE_STORAGE_KEY } from '@/components/shipments/shipments-constants';
import { ShipmentsKpiRow } from '@/components/shipments/shipments-kpi-row';
import { CreateShipmentModal } from '@/components/shipments/create-shipment-modal';
import { ShipmentsTable } from '@/components/shipments/shipments-table';
import { ShipmentPreviewPanel } from '@/components/shipments/shipment-preview-panel';
import { useMediaQuery } from '@/lib/use-media-query';

export default function ShipmentsPage() {
  usePageTitle('Shipments');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') ?? '');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'trackingNumber', direction: 'ascending' });
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; trackingNumber: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') ?? 'all');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const prefs = useTablePreferences(SHIPMENTS_TABLE_STORAGE_KEY, SHIPMENT_COLUMNS);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);

  const [createOpen, setCreateOpen] = useState(false);
  const [previewTracking, setPreviewTracking] = useState<string | null>(null);
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const [assignerData, setAssignerData] = useState<{ customerId: string | null; contactEmail: string; contactPhone: string }>({
    customerId: null,
    contactEmail: '',
    contactPhone: '',
  });
  const [newTrackingNumber, setNewTrackingNumber] = useState('');
  const [billAmount, setBillAmount] = useState(0);
  const [senderAddress, setSenderAddress] = useState<AddressData>({});
  const [recipientAddress, setRecipientAddress] = useState<AddressData>({});

  const { data: session } = authClient.useSession();
  const userData = getUser(session);
  const userRole = userData?.role;
  const isSuperAdmin = userRole === 'superadmin';
  const isTenantAdmin = userRole === 'tenant-admin';
  const userTenantId = userData?.tenantId;
  const userBranchId = userData?.branchId as string | undefined;
  const isStaff = !isSuperAdmin && !isTenantAdmin;
  const { tenantFilter, branchFilter } = useTenantFilter();
  const effectiveTenantId = isSuperAdmin ? tenantFilter : (userTenantId ?? '');
  const { data: tenants = [] } = useTenants();
  const tenantCountry = useMemo(() => {
    const t = tenants.find((t) => t.id === effectiveTenantId);
    return t?.country ?? undefined;
  }, [effectiveTenantId, tenants]);
  const tenantCurrency = useMemo(() => {
    const t = tenants.find((t) => t.id === effectiveTenantId);
    return t?.currency ?? undefined;
  }, [effectiveTenantId, tenants]);
  const phoneDialCode = getCountryCode(tenantCountry).dialCode;
  const phoneFlag = getCountryCode(tenantCountry).flag;

  const computedStatus = useMemo(() => {
    if (statusFilter === 'all') return 'all';
    return STATUS_GROUPS[statusFilter]?.join(',') ?? 'all';
  }, [statusFilter]);

  const shipmentsQuery = useShipments(page, rowsPerPage, computedStatus, debouncedSearch);
  const shipmentsResp = shipmentsQuery.data as PaginatedResult<Shipment> | undefined;
  const shipmentRows = Array.isArray(shipmentsResp) ? shipmentsResp : (shipmentsResp?.data ?? []);
  const totalCount = Array.isArray(shipmentsResp) ? shipmentRows.length : (shipmentsResp?.total ?? 0);
  const counts = !Array.isArray(shipmentsResp) ? shipmentsResp?.counts : undefined;

  const { toast } = useToast();
  const { data: allCustomers = [] } = useCustomers();
  const { data: newBranches = [] } = useBranches();
  const queryClient = useQueryClient();

  const toggleAll = useCallback((rows: { id: string }[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (rows.every((r) => next.has(r.id))) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected shipment(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selected).map((id) => api.delete(`/api/shipments/${id}`)));
      toast('success', 'Shipments deleted', `${selected.size} shipment(s) removed`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    } catch (e) {
      toast('error', 'Failed to delete shipments', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBulkDeleting(false);
    }
  }, [selected, toast, queryClient]);

  const [bulkStatusUpdating, setBulkStatusUpdating] = useState(false);
  const statusLabel = (s: string) => STATUS_META[s as keyof typeof STATUS_META]?.label ?? s;

  const handleBulkStatus = useCallback(async (status: string) => {
    if (selected.size === 0 || bulkStatusUpdating) return;
    setBulkStatusUpdating(true);
    try {
      const results = await Promise.allSettled(Array.from(selected).map((id) => api.patch(`/api/shipments/${id}`, { status })));
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const fail = results.length - ok;
      if (ok > 0) {
        toast('success', 'Status updated', `${ok} shipment(s) set to ${statusLabel(status)}${fail ? `, ${fail} failed` : ''}`);
        setSelected(new Set());
        queryClient.invalidateQueries({ queryKey: ['shipments'] });
      } else {
        toast('error', 'Update failed', 'None of the shipments could be updated');
      }
    } catch (e) {
      toast('error', 'Bulk status update failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBulkStatusUpdating(false);
    }
  }, [selected, bulkStatusUpdating, toast, queryClient]);

  const [selectedBranchId, setSelectedBranchId] = useState(isStaff ? (userBranchId ?? '') : branchFilter);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = (field: string) => setErrors((prev) => { const { [field]: _, ...rest } = prev; return rest; });
  const createShipment = useCreateShipment();
  const deleteShipment = useDeleteShipment();

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of allCustomers) map.set(c.id, c.name);
    return map;
  }, [allCustomers]);

  const paginated = useMemo(() => {
    const items = shipmentRows.map((s) => ({
      id: s.id,
      trackingNumber: s.trackingNo,
      labelCode: s.labelCode,
      carrier: s.carrier ?? '',
      status: s.status,
      customerName: s.customerId ? (customerMap.get(s.customerId) ?? '—') : s.contactEmail || s.contactPhone || 'Self',
      billAmount: s.billAmount as string | undefined,
      createdAt: s.createdAt,
      lastTrackedAt: s.lastTrackedAt,
      stale: s.trackingRegistered
        && s.status !== 'delivered'
        && s.lastTrackedAt
        ? (Date.now() - new Date(s.lastTrackedAt).getTime()) / 86400000 > 3
        : false,
    }));
    const col = sortDescriptor.column as keyof typeof items[number];
    const dir = sortDescriptor.direction;
    items.sort((a, b) => {
      const valA = String(a[col] ?? '');
      const valB = String(b[col] ?? '');
      const cmp = valA.localeCompare(valB);
      return dir === 'descending' ? -cmp : cmp;
    });
    return items;
  }, [shipmentRows, sortDescriptor, customerMap]);

  const handleCsvExport = useCallback(() => {
    const rows = selected.size > 0 ? paginated.filter((r) => selected.has(r.id)) : paginated;
    if (rows.length === 0) return;
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      ['Tracking #', 'Label Code', 'Customer', 'Carrier', 'Status', 'Bill Amount', 'Created'].join(','),
      ...rows.map((r) => [r.trackingNumber, r.labelCode ?? '', r.customerName ?? '', r.carrier ?? '', statusLabel(r.status), r.billAmount ?? '', r.createdAt].map(esc).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selected, paginated]);

  const escHtml = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

  const handlePrintLabels = useCallback(() => {
    const rows = selected.size > 0 ? paginated.filter((r) => selected.has(r.id)) : paginated;
    if (rows.length === 0) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Shipment Labels</title><style>
      body{font-family:system-ui,sans-serif;margin:24px;}
      h1{font-size:18px;margin-bottom:16px;}
      table{width:100%;border-collapse:collapse;font-size:13px;}
      th{text-align:left;border-bottom:2px solid #333;padding:6px 8px;}
      td{border-bottom:1px solid #ccc;padding:8px;font-family:monospace;}
      @media print{ h1{display:none;} }
    </style></head><body>
    <h1>Shipment Labels (${rows.length})</h1>
    <table><thead><tr><th>Tracking #</th><th>Label Code</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${escHtml(r.trackingNumber)}</td><td>${escHtml(r.labelCode || '—')}</td></tr>`).join('')}
    </tbody></table>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`);
    w.document.close();
  }, [selected, paginated]);

  const isPending = shipmentsQuery.isPending;
  const isError = shipmentsQuery.isError;
  const refetch = shipmentsQuery.refetch;

  function handleContextAction(key: Key, shipment: typeof paginated[number]) {
    if (key === 'view') {
      if (isDesktop) setPreviewTracking(shipment.trackingNumber);
      else router.push(`/shipments/${shipment.trackingNumber}`);
    } else if (key === 'edit') router.push(`/shipments/${shipment.trackingNumber}`);
    else if (key === 'delete') setDeleteTarget(shipment);
  }

  function handleRowPreview(trackingNumber: string) {
    if (isDesktop) setPreviewTracking(trackingNumber);
    else router.push(`/shipments/${trackingNumber}`);
  }

  const kpiCounts = useMemo(() => statusGroupCounts(counts), [counts]);
  const applyStatus = (group: string) => { setStatusFilter(group); setPage(1); };

  function openCreateModal() {
    setErrors({});
    setNewTrackingNumber('');
    setBillAmount(0);
    setCreateOpen(true);
    setAssignerData({ customerId: null, contactEmail: '', contactPhone: '' });
    setSenderAddress({});
    setRecipientAddress({});
  }

  function handleCreateSuccess(trackingNo: string) {
    toast('success', 'Shipment created', `Tracking #${trackingNo}`);
    setCreateOpen(false);
    setNewTrackingNumber('');
    setBillAmount(0);
    setSenderAddress({});
    setRecipientAddress({});
    setAssignerData({ customerId: null, contactEmail: '', contactPhone: '' });
    setSelectedBranchId(isStaff ? (userBranchId ?? '') : branchFilter);
    setErrors({});
  }

  return (
    <div className="shipments-ops space-y-4">
      {isPending ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <p className="text-danger text-sm">Failed to load shipments</p>
          <Button variant="secondary" size="sm" onPress={() => refetch()}>Retry</Button>
        </div>
      ) : (
      <>
      <header className="ops-header-bar flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[var(--ops-accent-dim)] border border-[var(--ops-border)] flex items-center justify-center text-[var(--ops-accent)]">
            <Radio size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Operations Board</h1>
            <p className="text-xs text-muted">Shipments command center — filter, preview, act</p>
          </div>
        </div>
        <Button onPress={openCreateModal}>
          <Plus size={16} /> New Shipment
        </Button>
      </header>

      <ShipmentsKpiRow counts={kpiCounts} statusFilter={statusFilter} onStatusFilter={applyStatus} />

      <div className="flex flex-col xl:flex-row gap-4 items-stretch">
      <div className="flex-1 min-w-0">
      <ShipmentsTable
        search={search}
        onSearch={handleSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        columns={SHIPMENT_COLUMNS}
        prefs={prefs}
        rows={paginated}
        selected={selected}
        onSelectedChange={setSelected}
        onToggleAll={toggleAll}
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
        previewTrackingId={previewTracking}
        onRowPreview={handleRowPreview}
        onRowOpen={(trackingNumber) => router.push(`/shipments/${trackingNumber}`)}
        onContextAction={handleContextAction}
        userRole={userRole}
        tenantCurrency={tenantCurrency}
        bulkDeleting={bulkDeleting}
        onBulkDelete={handleBulkDelete}
        onBulkStatus={handleBulkStatus}
        onCsvExport={handleCsvExport}
        onPrintLabels={handlePrintLabels}
        page={page}
        onPageChange={setPage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        totalCount={totalCount}
      />
      </div>

      {isDesktop && previewTracking && (
        <ShipmentPreviewPanel
          trackingId={previewTracking}
          tenantCurrency={tenantCurrency}
          onClose={() => setPreviewTracking(null)}
          onOpenFull={() => router.push(`/shipments/${previewTracking}`)}
        />
      )}
      </div>

      <CreateShipmentModal
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        newTrackingNumber={newTrackingNumber}
        onNewTrackingNumberChange={setNewTrackingNumber}
        billAmount={billAmount}
        onBillAmountChange={setBillAmount}
        selectedBranchId={selectedBranchId}
        onSelectedBranchIdChange={setSelectedBranchId}
        assignerData={assignerData}
        onAssignerChange={setAssignerData}
        senderAddress={senderAddress}
        onSenderAddressChange={setSenderAddress}
        recipientAddress={recipientAddress}
        onRecipientAddressChange={setRecipientAddress}
        errors={errors}
        onErrorsChange={setErrors}
        clearError={clearError}
        shipmentRows={shipmentRows}
        allCustomers={allCustomers}
        branches={newBranches}
        effectiveTenantId={effectiveTenantId}
        phoneDialCode={phoneDialCode}
        phoneFlag={phoneFlag}
        isSuperAdmin={isSuperAdmin}
        isTenantAdmin={isTenantAdmin}
        onResetBranch={() => setSelectedBranchId(isStaff ? (userBranchId ?? '') : branchFilter)}
        createShipment={createShipment}
        onSuccess={handleCreateSuccess}
        onError={(message) => toast('error', 'Failed to create shipment', message)}
      />

      <Modal.Backdrop isOpen={!!deleteTarget} onOpenChange={(v: boolean) => { if (!v) setDeleteTarget(null); }}>
        <Modal.Container>
          <Modal.Dialog aria-label="Delete Shipment">
            <Modal.Header>Delete Shipment</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">Are you sure you want to delete shipment <strong>{deleteTarget?.trackingNumber}</strong>? This action cannot be undone.</p>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" isPending={deleteShipment.isPending} onPress={() => {
                if (deleteTarget) { deleteShipment.mutate(deleteTarget.id); setDeleteTarget(null); }
              }}>{deleteShipment.isPending ? 'Deleting...' : 'Delete'}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      </>)}
    </div>
  );
}
