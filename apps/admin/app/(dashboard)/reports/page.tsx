'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button, Card, Select, ListBox, Tabs, Table, Skeleton, Chip } from '@heroui/react';
import { FileText, Download, LoaderCircle, Package, Receipt, Truck, CheckCircle, AlertTriangle, IndianRupee, Send, CheckCircle2, XCircle, Calendar, Building2, X } from 'lucide-react';
import { KpiCard } from '@/components/kpi-card';
import { authClient } from '@/lib/auth-client';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import { useDashboardBranches, useTenants } from '@/lib/queries';
import { api, getTenantFilter, getBranchFilter } from '@/lib/api';
import { getUser } from '@/types/auth';
import { usePageTitle } from '@/lib/use-page-title';
import { formatCurrency } from '@/lib/currency';

type ShipmentRow = {
  id: string;
  tracking_no: string;
  label_code: string;
  status: string;
  origin: string;
  destination: string;
  carrier: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  branch_name: string;
  sender_name: string;
  sender_phone: string;
  recipient_name: string;
  recipient_phone: string;
};

type QuotationRow = {
  id: string;
  quote_no: string;
  status: string;
  total: number;
  valid_until: string | null;
  created_at: string;
  customer_name: string;
};

type ReportMeta = {
  summary: Record<string, number>;
  revenue?: string;
  statusDistribution: { status: string; count: number }[];
};

const STATUS_COLORS: Record<string, 'accent' | 'success' | 'danger' | 'warning' | 'default'> = {
  delivered: 'success',
  in_transit: 'accent',
  exception: 'danger',
  pending: 'warning',
  accepted: 'success',
  converted: 'warning',
  rejected: 'danger',
  sent: 'accent',
  draft: 'default',
};

const ROWS_PER_PAGE = 20;

export default function ReportsPage() {
  usePageTitle('Reports');
  const { data: session } = authClient.useSession();
  const isStaff = getUser(session)?.role === 'staff';
  const userRole = getUser(session)!.role;
  const { tenantFilter, branchFilter, setBranch } = useTenantFilter();
  const { data: tenants = [] } = useTenants();
  const { data: branches = [] } = useDashboardBranches();

  const [reportType, setReportType] = useState<string>('shipments');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [records, setRecords] = useState<ShipmentRow[] | QuotationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [genPdf, setGenPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [genCsv, setGenCsv] = useState(false);

  const totalPages = Math.ceil(total / ROWS_PER_PAGE);

  const fetchReport = useCallback(async (type: string, start: string, end: string, pageNum: number) => {
    setError('');
    setLoading(true);
    setReportType(type);
    try {
      const offset = (pageNum - 1) * ROWS_PER_PAGE;
      const params = new URLSearchParams({ limit: String(ROWS_PER_PAGE), offset: String(offset) });
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      const branchId = getBranchFilter();
      if (branchId) params.set('branchId', branchId);

      const dataUrl = type === 'shipments' ? '/api/reports/shipments/data' : '/api/reports/quotations/data';
      const dataRes = await api.get<{ rows: ShipmentRow[] | QuotationRow[]; total: number }>(`${dataUrl}?${params}`);
      setRecords(dataRes.rows);
      setTotal(dataRes.total);
      setPage(pageNum);

      if (pageNum === 1) {
        const aggUrl = type === 'shipments' ? '/api/reports/shipments' : '/api/reports/quotations';
        const aggRes = await api.get<any>(`${aggUrl}?${params}`);
        const summary = aggRes.summary as Record<string, number> ?? {};
        const statusKey = type === 'shipments' ? 'statusDistribution' : 'funnel';
        const revenue = type === 'shipments' ? aggRes.revenue : undefined;
        setMeta({ summary, revenue, statusDistribution: aggRes[statusKey] ?? [] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(reportType, startDate, endDate, 1);
  }, []);

  function handleFilterChange(type: string, start: string, end: string) {
    setReportType(type);
    setStartDate(start);
    setEndDate(end);
    fetchReport(type, start, end, 1);
  }

  async function downloadPdf() {
    setGenPdf(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const tenantOverride = getTenantFilter();
      if (tenantOverride) headers['X-Tenant-ID'] = tenantOverride;
      const branchOverride = getBranchFilter();
      if (branchOverride) headers['X-Branch-ID'] = branchOverride;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/reports/pdf`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ type: reportType, startDate: startDate || undefined, endDate: endDate || undefined }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || 'Failed to generate PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate PDF');
    } finally {
      setGenPdf(false);
    }
  }

  async function downloadExcel() {
    setGenCsv(true);
    try {
      const params = new URLSearchParams({ limit: '100000', offset: '0' });
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      const dataUrl = reportType === 'shipments' ? '/api/reports/shipments/data' : '/api/reports/quotations/data';
      const dataRes = await api.get<{ rows: ShipmentRow[] | QuotationRow[] }>(`${dataUrl}?${params}`);
      const allRows = dataRes.rows as ShipmentRow[] | QuotationRow[];
      if (!allRows.length) return;

      const rows = reportType === 'shipments'
        ? (allRows as ShipmentRow[]).map((r) => ({
            'Tracking #': r.tracking_no, 'Label Code': r.label_code, Customer: r.customer_name,
            'Sender': r.sender_name, 'Sender Phone': r.sender_phone,
            'Recipient': r.recipient_name, 'Recipient Phone': r.recipient_phone,
            Status: r.status, Origin: r.origin,
            Destination: r.destination, Carrier: r.carrier, Branch: r.branch_name,
            Created: new Date(r.created_at).toLocaleDateString(),
          }))
        : (allRows as QuotationRow[]).map((r) => ({
            'Quote #': r.quote_no, Customer: r.customer_name, Status: r.status,
            Amount: formatCurrency(Number(r.total), tenants.find((t) => t.id === tenantFilter)?.currency ?? undefined),
            'Valid Until': r.valid_until ? new Date(r.valid_until).toLocaleDateString() : '',
            Created: new Date(r.created_at).toLocaleDateString(),
          }));
      const headers = Object.keys(rows[0]!).join(',');
      const csv = '\uFEFF' + headers + '\n' + rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export CSV');
    } finally {
      setGenCsv(false);
    }
  }

  async function sendEmailReport() {
    setSendingEmail(true);
    setError('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const tenantOverride = getTenantFilter();
      if (tenantOverride) headers['X-Tenant-ID'] = tenantOverride;
      const branchOverride = getBranchFilter();
      if (branchOverride) headers['X-Branch-ID'] = branchOverride;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/reports/send-email`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ type: reportType, startDate: startDate || undefined, endDate: endDate || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Failed to send email');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  }

  if (isStaff) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <FileText size={40} className="text-muted" />
      <p className="text-lg font-medium">Reports not available</p>
      <p className="text-sm text-muted">Staff accounts cannot access reports.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted text-sm">View and export reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onPress={downloadPdf} isDisabled={genPdf}>
            {genPdf ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
            {genPdf ? 'Generating...' : 'PDF'}
          </Button>
          <Button variant="secondary" onPress={downloadExcel} isDisabled={genCsv || !total}>
            {genCsv ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
            {genCsv ? 'Generating...' : 'Excel'}
          </Button>
          <Button variant="secondary" onPress={sendEmailReport} isDisabled={sendingEmail || !total}>
            {sendingEmail ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
            {sendingEmail ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border">
        <Tabs selectedKey={reportType} onSelectionChange={(k) => handleFilterChange(k as string, startDate, endDate)}>
          <Tabs.List>
            <Tabs.Tab id="shipments"><div className="flex items-center gap-1.5"><Package size={15} />Shipments</div></Tabs.Tab>
            <Tabs.Tab id="quotations"><div className="flex items-center gap-1.5"><Receipt size={15} />Quotations</div></Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1">
          <Calendar size={14} className="text-muted shrink-0" />
          <input type="date" value={startDate} onChange={(e) => handleFilterChange(reportType, e.target.value, endDate)}
            className="w-28 bg-transparent text-sm outline-none border-none p-0 [color-scheme:var(--color-scheme)]" placeholder="Start" />
          <span className="text-muted text-xs">to</span>
          <input type="date" value={endDate} onChange={(e) => handleFilterChange(reportType, startDate, e.target.value)}
            className="w-28 bg-transparent text-sm outline-none border-none p-0 [color-scheme:var(--color-scheme)]" placeholder="End" />
          {!startDate && !endDate && <Chip size="sm" variant="soft" className="text-xs h-6">All time</Chip>}
          {(startDate || endDate) && (
            <button onClick={() => handleFilterChange(reportType, '', '')} className="text-muted hover:text-foreground ml-1">
              <X size={14} />
            </button>
          )}
        </div>

        {userRole !== 'staff' && (
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 size={14} className="text-muted shrink-0" />
            <Select
              selectedKey={branchFilter}
              onSelectionChange={(k) => { setBranch(k as string); fetchReport(reportType, startDate, endDate, 1); }}
              variant="secondary"
              aria-label="Branch"
              className="w-36"
            >
              <Select.Trigger className="h-8 text-sm">
                <Select.Value />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="" textValue="All Branches">All Branches</ListBox.Item>
                  {branches.map((b) => (
                    <ListBox.Item key={b.id} id={b.id} textValue={b.name}>{b.name}</ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        )}
      </div>

      {error && <Card><Card.Content><p className="text-sm text-danger">{error}</p></Card.Content></Card>}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full">
        {(reportType === 'shipments' ? [
          { key: 'total', color: '#3b82f6', icon: Package },
          { key: 'delivered', color: '#22c55e', icon: CheckCircle },
          { key: 'in_transit', color: '#8b5cf6', icon: Truck },
          { key: 'exceptions', color: '#ef4444', icon: AlertTriangle },
          { key: 'revenue', color: '#f59e0b', icon: IndianRupee, format: 'currency' as const },
        ] : [
          { key: 'total', color: '#3b82f6', icon: Receipt },
          { key: 'accepted', color: '#22c55e', icon: CheckCircle2 },
          { key: 'converted', color: '#f59e0b', icon: AlertTriangle },
          { key: 'rejected', color: '#ef4444', icon: XCircle },
        ]).map(({ key, color, icon, format }) => (
          <KpiCard
            key={key}
            label={key.replace(/_/g, ' ')}
            count={meta && key === 'revenue' ? Number(meta.revenue || 0) : Number(meta?.summary[key as keyof typeof meta.summary] ?? 0)}
            color={color}
            icon={icon}
            format={format}
          />
        ))}
      </div>

      <p className="text-sm text-muted">
        {reportType === 'shipments' ? 'Shipment' : 'Quotation'} report
        {!startDate && !endDate ? ' — All time' : startDate ? ` from ${startDate}` : ''}{startDate && endDate ? ` to ${endDate}` : ''}
        {' \u2014 '}{total} record{total !== 1 ? 's' : ''}
      </p>

      <Card>
      {loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
        </div>
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Report records">
              <Table.Header>
                {reportType === 'shipments' ? (
                  <>
                    <Table.Column isRowHeader>Tracking #</Table.Column>
                    <Table.Column>Label Code</Table.Column>
                    <Table.Column>Customer</Table.Column>
                    <Table.Column>Sender</Table.Column>
                    <Table.Column>Recipient</Table.Column>
                    <Table.Column>Status</Table.Column>
                    <Table.Column>Origin</Table.Column>
                    <Table.Column>Destination</Table.Column>
                    <Table.Column>Carrier</Table.Column>
                    <Table.Column>Branch</Table.Column>
                    <Table.Column>Created</Table.Column>
                  </>
                ) : (
                  <>
                    <Table.Column isRowHeader>Quote #</Table.Column>
                    <Table.Column>Customer</Table.Column>
                    <Table.Column>Status</Table.Column>
                    <Table.Column>Amount</Table.Column>
                    <Table.Column>Valid Until</Table.Column>
                    <Table.Column>Created</Table.Column>
                  </>
                )}
              </Table.Header>
              <Table.Body renderEmptyState={() => <div className="text-center py-16 text-muted text-sm">No records</div>}>
                    {reportType === 'shipments'
                      ? (records as ShipmentRow[]).map((r) => (
                          <Table.Row key={r.id}>
                            <Table.Cell className="font-mono text-xs font-medium">{r.tracking_no}</Table.Cell>
                            <Table.Cell className="text-xs text-muted">{r.label_code || '\u2014'}</Table.Cell>
                            <Table.Cell>{r.customer_name || '\u2014'}</Table.Cell>
                            <Table.Cell className="text-xs">{r.sender_name ? `${r.sender_name}${r.sender_phone ? ` (${r.sender_phone})` : ''}` : '\u2014'}</Table.Cell>
                            <Table.Cell className="text-xs">{r.recipient_name ? `${r.recipient_name}${r.recipient_phone ? ` (${r.recipient_phone})` : ''}` : '\u2014'}</Table.Cell>
                            <Table.Cell><Chip size="sm" variant="soft" color={STATUS_COLORS[r.status] ?? 'default'}>{r.status}</Chip></Table.Cell>
                            <Table.Cell className="text-xs text-muted">{r.origin || '\u2014'}</Table.Cell>
                            <Table.Cell className="text-xs text-muted">{r.destination || '\u2014'}</Table.Cell>
                            <Table.Cell className="text-xs">{r.carrier || '\u2014'}</Table.Cell>
                            <Table.Cell className="text-xs text-muted">{r.branch_name || '\u2014'}</Table.Cell>
                            <Table.Cell className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</Table.Cell>
                          </Table.Row>
                        ))
                  : (records as QuotationRow[]).map((r) => (
                      <Table.Row key={r.id}>
                        <Table.Cell className="font-mono text-xs font-medium">{r.quote_no}</Table.Cell>
                        <Table.Cell>{r.customer_name || '\u2014'}</Table.Cell>
                        <Table.Cell><Chip size="sm" variant="soft" color={STATUS_COLORS[r.status] ?? 'default'}>{r.status}</Chip></Table.Cell>
                        <Table.Cell className="font-medium">{formatCurrency(Number(r.total), tenants.find((t) => t.id === tenantFilter)?.currency ?? undefined)}</Table.Cell>
                        <Table.Cell className="text-xs text-muted">{r.valid_until ? new Date(r.valid_until).toLocaleDateString() : '\u2014'}</Table.Cell>
                        <Table.Cell className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</Table.Cell>
                      </Table.Row>
                    ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          {total >= 0 && (
            <Table.Footer>
              <div className="flex items-center justify-between w-full px-4 py-2 text-sm">
                <span className="text-muted">{total > 0 ? `${(page - 1) * ROWS_PER_PAGE + 1}\u2013${Math.min(page * ROWS_PER_PAGE, total)} of ${total}` : '0 results'}</span>
                {totalPages > 0 && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="secondary" isDisabled={page === 1} onPress={() => fetchReport(reportType, startDate, endDate, page - 1)}>Prev</Button>
                    {(() => {
                      const pages: (number | '...')[] = [];
                      const start = Math.max(1, page - 2);
                      const end = Math.min(totalPages, page + 2);
                      if (start > 1) { pages.push(1); if (start > 2) pages.push('...'); }
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (end < totalPages) { if (end < totalPages - 1) pages.push('...'); pages.push(totalPages); }
                      return pages.map((p, i) =>
                        p === '...' ? (
                          <span key={`e${i}`} className="px-1 text-muted">...</span>
                        ) : (
                          <Button key={p} size="sm" variant={p === page ? 'primary' : 'secondary'} onPress={() => fetchReport(reportType, startDate, endDate, p)}>{p}</Button>
                        )
                      );
                    })()}
                    <Button size="sm" variant="secondary" isDisabled={page === totalPages} onPress={() => fetchReport(reportType, startDate, endDate, page + 1)}>Next</Button>
                  </div>
                )}
              </div>
            </Table.Footer>
          )}
        </Table>
      )}
    </Card>
    </div>
  );
}
