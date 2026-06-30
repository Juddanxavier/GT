'use client';

import { useState } from 'react';
import {
  Button, Card, Chip, Label, Modal,
} from '@heroui/react';
import {
  Activity, Clock, Eye, Package, FileText, User, Mail, Bell,
  Building2, FileSpreadsheet, LogIn,
} from 'lucide-react';

type AuditEntry = {
  id: string;
  event: string;
  userId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type TimelineGroup = {
  key: string;
  type: string;
  label: string;
  eventCount: number;
  startTime: string;
  endTime: string;
  metadataKeys: string[];
  events: AuditEntry[];
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

const GROUP_ICONS: Record<string, typeof Package> = {
  shipment: Package,
  invoice: FileText,
  user: User,
  invitation: Mail,
  notification: Bell,
  branch: Building2,
  quotation: FileSpreadsheet,
  login: LogIn,
  other: Activity,
};

const GROUP_COLORS: Record<string, string> = {
  shipment: '#3b82f6',
  invoice: '#8b5cf6',
  user: '#22c55e',
  invitation: '#f59e0b',
  notification: '#06b6d4',
  branch: '#ec4899',
  quotation: '#f97316',
  login: '#6366f1',
  other: '#a1a1aa',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTimeFull(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
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
  if (meta.invoiceId) parts.push(`invoice: ${(meta.invoiceNo as string) ?? (meta.invoiceId as string).slice(0, 8)}`);
  if (meta.shipmentId) parts.push(`shipment: ${(meta.trackingNo as string) ?? (meta.shipmentId as string).slice(0, 8)}`);
  if (meta.trackingNo) parts.push(`tracking: ${meta.trackingNo}`);
  if (meta.recipient) parts.push(`to: ${meta.recipient}`);
  if (meta.channel) parts.push(`channel: ${meta.channel}`);
  if (meta.eventType) parts.push(`event: ${meta.eventType}`);
  if (meta.type && meta.type !== meta.event) parts.push(`type: ${meta.type}`);
  if (meta.branchId && !meta.name) parts.push(`branch: ${(meta.branchId as string).slice(0, 8)}`);
  return parts.join(' | ') || JSON.stringify(meta);
}

function formatDuration(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h${remMins > 0 ? ` ${remMins}m` : ''}`;
}

export default function AuditTimeline({
  groups,
  loading,
}: {
  groups: TimelineGroup[];
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  function toggleGroup(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-0.5 h-24 rounded bg-muted/20" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-muted/20" />
              <div className="h-3 w-32 rounded bg-muted/20" />
              <div className="h-8 w-full rounded bg-muted/10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center max-w-xs">
          <Activity size={32} className="mx-auto text-muted mb-3" />
          <p className="text-sm text-muted font-medium">No timeline events found</p>
          <p className="text-xs text-muted mt-1">Try adjusting your filters or date range.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const Icon = GROUP_ICONS[group.type] ?? Activity;
        const color = GROUP_COLORS[group.type] ?? GROUP_COLORS.other;
        const isOpen = expanded.has(group.key);
        const firstEvent = group.events[0]!;
        const lastEvent = group.events[group.events.length - 1]!;
        const eventTypes = [...new Set(group.events.map((e) => e.event))];

        return (
          <Card key={group.key} className="overflow-visible">
            {/* Group header */}
            <button
              type="button"
              className="w-full text-left focus:outline-none"
              onClick={() => toggleGroup(group.key)}
            >
              <Card.Content className="p-4">
                <div className="flex items-start gap-3">
                  {/* Timeline dot and connector */}

                  <div className="flex flex-col items-center shrink-0 pt-0.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center ring-2 ring-background"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      <Icon size={16} />
                    </div>
                    {isOpen && group.events.length > 1 && (
                      <div className="w-0.5 flex-1 mt-1" style={{ backgroundColor: `${color}30`, minHeight: 16 }} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{group.label}</span>
                          <Chip size="sm" variant="soft" className="shrink-0 text-[10px]" style={{
                            backgroundColor: `${color}18`,
                            color,
                          }}>
                            {group.type}
                          </Chip>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {formatTime(firstEvent.createdAt)}
                          </span>
                          <span>→</span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {formatTime(lastEvent.createdAt)}
                          </span>
                          <span className="text-muted/60">
                            ({formatDuration(firstEvent.createdAt, lastEvent.createdAt)})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Chip size="sm" variant="soft" color="default" className="text-[10px]">
                          {group.eventCount} event{group.eventCount !== 1 ? 's' : ''}
                        </Chip>
                        {eventTypes.map((evt) => (
                          <Chip key={evt} size="sm" variant="soft" color={EVENT_COLORS[evt] ?? 'default'} className="text-[10px] hidden sm:inline-flex">
                            {evt.replace(/_/g, ' ')}
                          </Chip>
                        ))}
                        <div
                          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Content>
            </button>

            {/* Expanded events */}
            {isOpen && (
              <div className="pb-3 px-4">
                <div className="ml-[26px] pl-4 border-l-2 relative" style={{ borderColor: `${color}25` }}>
                  {group.events.map((entry, idx) => {
                    const isLast = idx === group.events.length - 1;
                    return (
                      <div key={entry.id} className={`relative ${isLast ? '' : 'pb-4'}`}>
                        {/* Event dot on the timeline */}
                        <div
                          className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ring-2 ring-background z-10"
                          style={{ backgroundColor: color }}
                        />

                        {/* Event card */}
                        <button
                          type="button"
                          className="w-full text-left rounded-xl border border-border/60 bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <div className="px-3 py-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Chip size="sm" variant="soft" color={EVENT_COLORS[entry.event] ?? 'default'}>
                                    {entry.event.replace(/_/g, ' ')}
                                  </Chip>
                                  <span className="text-xs text-muted">
                                    {formatTime(entry.createdAt)}
                                  </span>
                                  {entry.userId && (
                                    <span className="font-mono text-[10px] text-muted/60">
                                      by {entry.userId.slice(0, 8)}…
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted mt-1 truncate" title={formatMetadata(entry.metadata)}>
                                  {formatMetadata(entry.metadata) || '—'}
                                </p>
                              </div>
                              <Eye size={14} className="text-muted shrink-0 mt-0.5" />
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* Detail modal */}
      <Modal.Backdrop isOpen={!!selectedEntry} onOpenChange={(v: boolean) => { if (!v) setSelectedEntry(null); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Event Details</Modal.Header>
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
                        {formatTimeFull(selectedEntry.createdAt)}
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

                  {selectedEntry.ipAddress && (
                    <div>
                      <Label className="text-xs text-muted">IP Address</Label>
                      <p className="mt-1 font-mono text-xs text-foreground">
                        {selectedEntry.ipAddress}
                      </p>
                    </div>
                  )}
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
