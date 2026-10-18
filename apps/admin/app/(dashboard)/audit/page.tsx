'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTableHeaderScope } from '@/components/use-table-header-scope';
import { useRouter } from 'next/navigation';
import {
  Button, Card, Chip, Input, Label, ListBox, Modal, Select, Table,
} from '@heroui/react';
import { api, getTenantFilter, getBranchFilter } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { usePageTitle } from '@/lib/use-page-title';
import { getUser } from '@/types/auth';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import {
  Activity, Clock, Download, RefreshCw, Monitor, Globe, Eye, X, List, Layout,
} from 'lucide-react';
import AuditTimeline from '@/components/audit-timeline';
import { PageHeader } from '@/components/page-header';

type AuditEntry = {
  id: string;
  event: string;
  userId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

const EVENT_COLORS: Record<string, 'accent' | 'success' | 'danger' | 'warning' | 'default'> = {
  LOGIN_SUCCESS: 'success',
  LOGIN_FAILED: 'danger',
  LOGIN_BLOCKED: 'danger',
  PASSWORD_RESET: 'warning',
  USER_CREATED: 'accent',
  USER_DELETED: 'danger',
  USER_UPDATED: 'accent',
  USER_ROLE_CHANGED: 'accent',
  USER_BANNED: 'danger',
  USER_UNBANNED: 'success',
  NOTIFICATION_SENT: 'success',
  NOTIFICATION_READ: 'accent',
  NOTIFICATION_FAILED: 'danger',
  SHIPMENT_DELETED: 'danger',
  SHIPMENT_UPDATED: 'accent',
  INVOICE_CREATED: 'accent',
  INVOICE_SENT: 'accent',
  INVOICE_UPDATED: 'accent',
  INVOICE_DELETED: 'danger',
  BRANCH_CREATED: 'accent',
  BRANCH_UPDATED: 'accent',
  BRANCH_DELETED: 'danger',
  QUOTATION_CREATED: 'accent',
  QUOTATION_UPDATED: 'accent',
  QUOTATION_DELETED: 'danger',
  QUOTATION_CONVERTED: 'success',
  INVITATION_CREATED: 'accent',
  INVITATION_CANCELLED: 'warning',
};

const ROWS_PER_PAGE = 25;

export default function AuditLogPage() {
  usePageTitle('Audit Log');
  useTableHeaderScope();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { tenantFilter } = useTenantFilter();
  const userRole = getUser(session)?.role;
  const isSuperadmin = userRole === 'superadmin';
  const isTenantAdmin = userRole === 'tenant-admin';

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [eventFilter, setEventFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  // Timeline state
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [timelineGroups, setTimelineGroups] = useState<{
    key: string;
    type: string;
    label: string;
    eventCount: number;
    startTime: string;
    endTime: string;
    metadataKeys: string[];
    events: AuditEntry[];
  }[]>([]);

  const totalPages = Math.ceil(total / ROWS_PER_PAGE);

  useEffect(() => {
    api.get<string[]>('/api/audit-logs/events')
      .then(setEventTypes)
      .catch((e) => console.error('[audit] event types fetch failed:', e));
  }, [tenantFilter]);

  const buildParams = useCallback((pageNum: number, limit: number) => {
    const params = new URLSearchParams({
      page: String(pageNum),
      limit: String(limit),
    });
    if (eventFilter !== 'all') params.set('event', eventFilter);
    if (searchQuery) params.set('search', searchQuery);
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);
    return params;
  }, [eventFilter, searchQuery, startDate, endDate]);

  const fetchLogs = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(pageNum, ROWS_PER_PAGE);
      const body = await api.getFull<{ data: AuditEntry[]; total: number; page: number; limit: number }>(
        `/api/audit-logs?${params.toString()}`,
      );
      setEntries(body.data ?? []);
      setTotal(body.total ?? 0);
      setPage(pageNum);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [buildParams, tenantFilter]);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(1, 200);
      const body = await api.getFull<{
        groups: typeof timelineGroups;
        total: number;
        page: number;
        limit: number;
      }>(`/api/audit-logs/timeline?${params.toString()}`);
      setTimelineGroups(body.groups ?? []);
      setTotal(body.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }, [buildParams, tenantFilter]);

  useEffect(() => {
    if (!isSuperadmin && !isTenantAdmin && userRole !== 'staff') return;
    if (viewMode === 'table') {
      fetchLogs(1);
    } else {
      fetchTimeline();
    }
  }, [viewMode, fetchLogs, fetchTimeline, isSuperadmin, isTenantAdmin, tenantFilter]);

  function handleRefresh() {
    if (viewMode === 'table') {
      fetchLogs(page);
    } else {
      fetchTimeline();
    }
  }

  function handleDownloadCsv() {
    const params = new URLSearchParams();
    if (eventFilter !== 'all') params.set('event', eventFilter);
    if (searchQuery) params.set('search', searchQuery);
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);

    const url = `/api/audit-logs/export?${params.toString()}`;

    const headers: Record<string, string> = {};
    const tenantId = getTenantFilter();
    const branchId = getBranchFilter();
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    if (branchId) headers['X-Branch-ID'] = branchId;

    // Use fetch with credentials/headers for auth, then trigger download from blob
    fetch(url, {
      credentials: 'include',
      headers,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      })
      .catch((err) => {
        console.error('CSV download failed:', err);
        setError('Failed to download CSV. Please try again.');
      });
  }

  function formatMetadata(meta: Record<string, unknown>): string {
    const parts: string[] = [];
    if (meta.email) parts.push(`email: ${meta.email}`);
    if (meta.role) parts.push(`role: ${meta.role}`);
    if (meta.changes) {
      const changes = meta.changes as Record<string, { from: unknown; to: unknown }>;
      const changeStrs = Object.entries(changes).map(
        ([k, v]) => `${k}: ${String(v.from ?? '—')} → ${String(v.to ?? '—')}`,
      );
      parts.push(changeStrs.join(', '));
    }
    if (meta.reason) parts.push(`reason: ${meta.reason}`);
    if (meta.count) parts.push(`count: ${meta.count}`);
    if (meta.invoiceId) parts.push(`invoice: ${meta.invoiceId}`);
    if (meta.shipmentId) parts.push(`shipment: ${meta.shipmentId}`);
    if (meta.trackingNo) parts.push(`tracking: ${meta.trackingNo}`);
    if (meta.recipient) parts.push(`to: ${meta.recipient}`);
    if (meta.eventType) parts.push(`event: ${meta.eventType}`);
    return parts.join(' | ') || JSON.stringify(meta);
  }

  function formatUA(ua: string | null): string {
    if (!ua) return '—';
    // Truncate long user agents
    return ua.length > 80 ? ua.slice(0, 80) + '…' : ua;
  }

  if (!isSuperadmin && !isTenantAdmin && userRole !== 'staff') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Activity size={40} className="text-muted" />
        <p className="text-lg font-medium">Audit log not available</p>
        <p className="text-sm text-muted">You do not have permission to view audit logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit Log"
        subtitle="Track all system events and changes"
        icon={<List size={18} />}
        action={
          <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg content-panel p-0.5">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground'
              }`}
              onClick={() => { setViewMode('table'); }}
            >
              <List size={14} />
              Table
            </button>
            <button
              type="button"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'timeline' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground'
              }`}
              onClick={() => { setViewMode('timeline'); }}
            >
              <Layout size={14} />
              Timeline
            </button>
          </div>
          <Button
            variant="secondary"
            onPress={handleDownloadCsv}
            isDisabled={loading || total === 0}
          >
            <Download size={16} />
            CSV
          </Button>
          <Button variant="secondary" onPress={handleRefresh} isDisabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
        }
      />

      {/* Filters */}
      <Card>
        <Card.Content className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted mb-1 block">Event Type</Label>
              <Select
                selectedKey={eventFilter}
                onSelectionChange={(k) => { setEventFilter(k as string); setPage(1); }}
                placeholder="All events"
                variant="secondary"
                aria-label="Filter by event type"
              >
                <Select.Trigger className="h-10 text-sm">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="all" textValue="All Events">All Events</ListBox.Item>
                    {eventTypes.map((evt) => (
                      <ListBox.Item key={evt} id={evt} textValue={evt}>
                        <div className="flex items-center gap-2">
                          <Activity size={14} className="text-muted" />
                          {evt.replace(/_/g, ' ')}
                        </div>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted mb-1 block">Search</Label>
              <Input
                variant="secondary"
                placeholder="Search events, metadata, IDs..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                fullWidth
              />
            </div>
            <div className="w-40">
              <Label className="text-xs text-muted mb-1 block">From</Label>
              <Input
                variant="secondary"
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                fullWidth
              />
            </div>
            <div className="w-40">
              <Label className="text-xs text-muted mb-1 block">To</Label>
              <Input
                variant="secondary"
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                fullWidth
              />
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Summary bar */}
      <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
        {viewMode === 'table' ? (
          <>
            <List size={14} />
            <span>
              {total > 0
                ? `${(page - 1) * ROWS_PER_PAGE + 1}–${Math.min(page * ROWS_PER_PAGE, total)} of ${total} events`
                : 'No events found'}
            </span>
          </>
        ) : (
          <>
            <Layout size={14} />
            <span>
              {timelineGroups.length > 0
                ? `${timelineGroups.length} group${timelineGroups.length !== 1 ? 's' : ''} · ${total} total events`
                : 'No timeline groups found'}
            </span>
          </>
        )}
        {eventFilter !== 'all' && (
          <span className="inline-flex items-center gap-1">
            <Chip size="sm" variant="soft" color="accent">
              {eventFilter.replace(/_/g, ' ')}
            </Chip>
            <button type="button" className="text-muted hover:text-foreground" onClick={() => { setEventFilter('all'); setPage(1); }} aria-label="Remove filter">
              <X size={12} />
            </button>
          </span>
        )}
        {startDate && (
          <span className="inline-flex items-center gap-1">
            <Chip size="sm" variant="soft" color="accent">
              From {startDate}
            </Chip>
            <button type="button" className="text-muted hover:text-foreground" onClick={() => { setStartDate(''); setPage(1); }} aria-label="Remove date filter">
              <X size={12} />
            </button>
          </span>
        )}
        {endDate && (
          <span className="inline-flex items-center gap-1">
            <Chip size="sm" variant="soft" color="accent">
              To {endDate}
            </Chip>
            <button type="button" className="text-muted hover:text-foreground" onClick={() => { setEndDate(''); setPage(1); }} aria-label="Remove date filter">
              <X size={12} />
            </button>
          </span>
        )}
      </div>

      {error && (
        <Card>
          <Card.Content>
            <p className="text-sm text-danger-soft-foreground">{error}</p>
          </Card.Content>
        </Card>
      )}

      {/* Table view */}
      {viewMode === 'table' ? (
        <Card>
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 w-full rounded bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : (
            <Table className="table-clickable">
              <Table.ScrollContainer>
                <Table.Content aria-label="Audit table" onRowAction={(key) => {
                  const entry = entries?.find((e) => e.id === key);
                  if (entry) setSelectedEntry(entry);
                }}>
                  <Table.Header>
                    <Table.Column isRowHeader>Time</Table.Column>
                    <Table.Column>Event</Table.Column>
                    <Table.Column>User ID</Table.Column>
                    <Table.Column>Details</Table.Column>
                    <Table.Column>IP</Table.Column>
                    <Table.Column>User Agent</Table.Column>
                    <Table.Column width={48}>{() => null}</Table.Column>
                  </Table.Header>
                  <Table.Body
                    renderEmptyState={() => (
                      <div className="flex items-center justify-center py-24">
                        <div className="text-center max-w-xs">
                          <Activity size={32} className="mx-auto text-muted mb-3" />
                          <p className="text-sm text-muted font-medium">No audit events found</p>
                          <p className="text-xs text-muted mt-1">Try adjusting your filters or date range.</p>
                        </div>
                      </div>
                    )}
                  >
                    {entries?.map((entry) => (
                      <Table.Row key={entry.id} id={entry.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-1.5 text-xs text-muted">
                            <Clock size={12} />
                            <span className="whitespace-nowrap">
                              {new Date(entry.createdAt).toLocaleString('en-IN', {
                                day: '2-digit', month: '2-digit', year: '2-digit',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Chip size="sm" variant="soft" color={EVENT_COLORS[entry.event] ?? 'default'}>
                            {entry.event.replace(/_/g, ' ')}
                          </Chip>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="font-mono text-xs">
                            {entry.userId ? `${entry.userId.slice(0, 8)}…` : '—'}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="max-w-[250px]">
                          <p className="text-xs text-muted truncate" title={formatMetadata(entry.metadata)}>
                            {formatMetadata(entry.metadata) || '—'}
                          </p>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-xs text-muted font-mono">{entry.ipAddress || '—'}</span>
                        </Table.Cell>
                        <Table.Cell className="max-w-[180px]">
                          <span className="text-xs text-muted truncate block" title={entry.userAgent ?? undefined}>
                            {formatUA(entry.userAgent)}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onPress={() => setSelectedEntry(entry)}
                            aria-label="View details"
                          >
                            <Eye size={14} />
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
              {total > 0 && (
                <Table.Footer>
                  <div className="flex items-center justify-between w-full px-4 py-2 text-sm">
                    <span className="text-muted">
                      {total > 0
                        ? `${(page - 1) * ROWS_PER_PAGE + 1}–${Math.min(page * ROWS_PER_PAGE, total)} of ${total}`
                        : '0 results'}
                    </span>
                    {totalPages > 0 && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm" variant="secondary"
                          isDisabled={page === 1}
                          onPress={() => fetchLogs(page - 1)}
                        >
                          Prev
                        </Button>
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
                              <Button
                                key={p} size="sm"
                                variant={p === page ? 'primary' : 'secondary'}
                                onPress={() => fetchLogs(p)}
                              >
                                {p}
                              </Button>
                            ),
                          );
                        })()}
                        <Button
                          size="sm" variant="secondary"
                          isDisabled={page === totalPages}
                          onPress={() => fetchLogs(page + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                </Table.Footer>
              )}
            </Table>
          )}
        </Card>
      ) : (
        /* Timeline view */
        <AuditTimeline
          groups={timelineGroups}
          loading={loading}
        />
      )}

      {/* Detail modal */}
      <Modal.Backdrop isOpen={!!selectedEntry} onOpenChange={(v) => { if (!v) setSelectedEntry(null); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Event Details</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {selectedEntry && (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted">Event</Label>
                      <p className="mt-1">
                        <Chip size="sm" variant="soft" color={EVENT_COLORS[selectedEntry.event] ?? 'default'}>
                          {selectedEntry.event.replace(/_/g, ' ')}
                        </Chip>
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted">Time</Label>
                      <p className="mt-1 text-foreground flex items-center gap-1.5">
                        <Clock size={14} className="text-muted" />
                        {new Date(selectedEntry.createdAt).toLocaleString('en-IN', {
                          day: 'numeric', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', second: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted">User ID</Label>
                    <p className="mt-1 font-mono text-xs text-foreground">
                      {selectedEntry.userId || '—'}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted">Metadata</Label>
                    <pre className="mt-1 p-3 rounded-lg bg-muted/10 border border-border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedEntry.metadata, null, 2)}
                    </pre>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted flex items-center gap-1">
                        <Globe size={12} /> IP Address
                      </Label>
                      <p className="mt-1 font-mono text-xs text-foreground">
                        {selectedEntry.ipAddress || '—'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted flex items-center gap-1">
                        <Monitor size={12} /> User Agent
                      </Label>
                      <p className="mt-1 text-xs text-muted break-words">
                        {selectedEntry.userAgent || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => setSelectedEntry(null)}>Close</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
