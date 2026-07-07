'use client';

import type { ReactNode } from 'react';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Chip, Skeleton, Tabs, cn, Spinner } from '@heroui/react';
import { api } from '@/lib/api';
import { useShipment, useShipmentTracking, useShipmentInvoice, useGenerateInvoice, useTrackShipment, useStopTracking, useDeleteShipment, useUpdateShipment } from '@/lib/queries';
import { STATUS_META } from '@repo/ui/status-config';
import { TrackingTimeline } from './tracking-timeline';
import { CopyButton, Flag, countryFromString } from '@/components/copy-button';
import { useQueryClient } from '@tanstack/react-query';
import { usePageTitle } from '@/lib/use-page-title';
import { ArrowLeft, Package, MapPin, Clock, Calendar, FileText, MessageSquare, Check, RefreshCw, Trash2, Pencil, Ban, Send, Plus, DollarSign, Globe, Users } from 'lucide-react';
import { useTenantFilter } from '@/lib/tenant-filter-context';

type TabKey = 'details' | 'tracking' | 'invoice' | 'notes';

export default function ShipmentDetailPage(): ReactNode {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { tenantFilter, branchFilter } = useTenantFilter();

  const { data: shipment, isLoading, error, refetch } = useShipment(id);
  const { data: trackingData, isLoading: trackingLoading } = useShipmentTracking(id);
  const { data: invoice, isLoading: invoiceLoading } = useShipmentInvoice(id);

  const trackMutation = useTrackShipment();
  const stopMutation = useStopTracking();
  const deleteMutation = useDeleteShipment();
  const generateInvoice = useGenerateInvoice();
  const updateShipment = useUpdateShipment();

  const [tab, setTab] = useState<TabKey>('details');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const trackingEvents = trackingData?.events ?? [];
  const sortedEvents = useMemo(
    () => [...trackingEvents].sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime()),
    [trackingEvents],
  );

  usePageTitle(shipment ? `Shipment ${shipment.trackingNo}` : 'Shipment');

  const handleTrack = async () => {
    await trackMutation.mutateAsync(id);
  };

  const handleStopTracking = async () => {
    if (!shipment) return;
    if (!window.confirm(`Stop tracking ${shipment.trackingNo}?`)) return;
    await stopMutation.mutateAsync(id);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    router.push('/shipments');
  };

  // ── Loading state ──
  if (isLoading) return <DetailLoadingSkeleton />;

  // ── Error state ──
  if (error || !shipment) {
    return (
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.push('/shipments')} className="group inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-6">
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          Back to Shipments
        </button>
        <Card className="p-12 text-center">
          <p className="text-danger text-sm mb-3">{error?.message ?? 'Failed to load shipment'}</p>
          <Button variant="flat" size="sm" onPress={() => refetch()}>Retry</Button>
        </Card>
      </div>
    );
  }

  const cfg = STATUS_META[shipment.status as keyof typeof STATUS_META] ?? { label: shipment.status.replace(/_/g, ' '), color: 'default' };
  const originCountry = shipment.origin ? countryFromString(shipment.origin) : null;
  const destCountry = shipment.destination ? countryFromString(shipment.destination) : null;
  const daysSinceUpdate = shipment.lastTrackedAt
    ? Math.floor((Date.now() - new Date(shipment.lastTrackedAt).getTime()) / 86400000) : null;
  const transitDays = shipment.estimatedDelivery && shipment.createdAt
    ? Math.ceil((new Date(shipment.estimatedDelivery).getTime() - new Date(shipment.createdAt).getTime()) / 86400000) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back button */}
      <button onClick={() => router.push('/shipments')} className="group inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors">
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
        Back to Shipments
      </button>

      {/* Hero section */}
      <div className={cn(
        'relative overflow-hidden rounded-2xl border',
        cfg.color === 'primary' && 'border-primary/30',
        cfg.color === 'success' && 'border-success/30',
        cfg.color === 'danger' && 'border-danger/30',
        cfg.color === 'warning' && 'border-warning/30',
        cfg.color === 'default' && 'border-border',
      )}>
        <div className={cn(
          'absolute inset-0',
          cfg.color === 'primary' && 'bg-gradient-to-br from-primary/[0.08] to-transparent',
          cfg.color === 'success' && 'bg-gradient-to-br from-success/[0.08] to-transparent',
          cfg.color === 'danger' && 'bg-gradient-to-br from-danger/[0.08] to-transparent',
          cfg.color === 'warning' && 'bg-gradient-to-br from-warning/[0.08] to-transparent',
          cfg.color === 'default' && 'bg-gradient-to-br from-muted/[0.04] to-transparent',
        )} />
        <div className="relative px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
                cfg.color === 'primary' && 'bg-primary/15 text-primary',
                cfg.color === 'success' && 'bg-success/15 text-success',
                cfg.color === 'danger' && 'bg-danger/15 text-danger',
                cfg.color === 'warning' && 'bg-warning/15 text-warning',
                cfg.color === 'default' && 'bg-muted/15 text-muted',
              )}>
                <Package size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Chip size="sm" variant="flat" color={cfg.color as 'success' | 'danger' | 'warning' | 'primary' | 'default'}>{cfg.label}</Chip>
                  <span className="text-xs text-muted bg-muted/10 px-2 py-0.5 rounded-full">{shipment.carrier || 'Unknown'}</span>
                  {shipment.trackingRegistered && (
                    <span className="text-xs text-success flex items-center gap-1"><Check size={12} />Active</span>
                  )}
                </div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  {shipment.trackingNo}
                  <CopyButton text={shipment.trackingNo} />
                </h1>
                {shipment.labelCode && (
                  <p className="text-xs text-muted mt-1 font-mono flex items-center gap-1.5">
                    <span className="text-muted/60">Label:</span> {shipment.labelCode} <CopyButton text={shipment.labelCode} />
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="flat" size="sm" onPress={handleTrack} isLoading={trackMutation.isPending}>
                <RefreshCw size={14} /> Track Now
              </Button>
              <Button variant="flat" size="sm" onPress={() => setEditOpen(true)}>Edit</Button>
              <Button variant="ghost" size="sm" onPress={() => setDeleteOpen(true)}>Delete</Button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted flex-wrap">
            {shipment.origin && (
              <div className="flex items-center gap-1.5"><MapPin size={14} /><span className="truncate max-w-[200px]">{shipment.origin}</span></div>
            )}
            <div className="flex items-center gap-1.5"><Package size={12} /><span>{shipment.status.replace(/_/g, ' ')}</span></div>
            {shipment.estimatedDelivery && (
              <div className="flex items-center gap-1.5"><Clock size={14} /><span>Est. {new Date(shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span></div>
            )}
            {daysSinceUpdate !== null && (
              <div className="flex items-center gap-1.5"><Calendar size={14} /><span>{daysSinceUpdate === 0 ? 'Today' : `${daysSinceUpdate}d ago`}</span></div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Origin" value={shipment.origin || '—'} icon={<MapPin size={14} />} accent={originCountry ? <Flag country={originCountry} /> : null} />
        <StatCard label="Destination" value={shipment.destination || '—'} icon={<MapPin size={14} />} accent={destCountry ? <Flag country={destCountry} /> : null} />
        <StatCard label="Estimated Delivery" value={shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} icon={<Clock size={14} />} meta={transitDays ? `${transitDays}d transit` : null} />
        <StatCard label="Actual Delivery" value={shipment.actualDelivery ? new Date(shipment.actualDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} icon={<Check size={14} />} highlighted={!!shipment.actualDelivery} />
      </div>

      {/* Tab Navigation */}
      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as TabKey)}>
        <Tabs.List>
          <Tabs.Tab key="details" title="Details" />
          <Tabs.Tab key="tracking" title="Tracking" />
          <Tabs.Tab key="invoice" title="Invoice" />
          <Tabs.Tab key="notes" title="Notes" />
        </Tabs.List>

        {/* Details Tab */}
        <Tabs.Panel key="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer & Assignment */}
            <Card>
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Users size={14} /> Customer</h3>
              </div>
              <div className="p-5 space-y-3">
                <InfoRow label="Name" value={shipment.customerName || shipment.contactEmail || shipment.contactPhone || 'Unassigned'} />
                {shipment.contactEmail && <InfoRow label="Email" value={shipment.contactEmail} />}
                {shipment.contactPhone && <InfoRow label="Phone" value={shipment.contactPhone} />
              </div>
            </Card>

            {/* Shipment Info */}
            <Card>
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold flex items-center gap-2"><FileText size={14} /> Shipment Info</h3>
              </div>
              <div className="p-5 space-y-3">
                <InfoRow label="Carrier" value={shipment.carrier || '—'} />
                <InfoRow label="Provider" value={shipment.trackingProvider || '—'} />
                <InfoRow label="Bill Amount" value={shipment.billAmount ? `₹${shipment.billAmount}` : '—'} />
                <InfoRow label="Tracking" value={shipment.trackingRegistered ? 'Active' : 'Inactive'} />
                <InfoRow label="Last Tracked" value={shipment.lastTrackedAt ? new Date(shipment.lastTrackedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'} />
                <InfoRow label="Created" value={new Date(shipment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                <InfoRow label="Updated" value={new Date(shipment.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
              </div>
            </Card>

            {/* Route */}
            {(shipment.origin || shipment.destination) && (
              <Card className="lg:col-span-2">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><MapPin size={14} /> Route</h3>
                </div>
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full border-2 border-primary bg-primary/20" />
                      <div className="w-0.5 h-8 bg-gradient-to-b from-primary/60 to-muted" />
                      <div className="w-4 h-4 rounded-full border-2 border-success bg-success/20" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-6">
                      <div>
                        <p className="text-[11px] text-muted font-medium uppercase tracking-wider mb-1">Origin</p>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          {originCountry && <Flag country={originCountry} />}
                          {shipment.origin || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted font-medium uppercase tracking-wider mb-1">Destination</p>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          {destCountry && <Flag country={destCountry} />}
                          {shipment.destination || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {shipment.estimatedDelivery && (
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                      <span className="text-muted">Estimated delivery</span>
                      <span className="font-semibold">{new Date(shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </Tabs.Panel>

        {/* Tracking Tab */}
        <Tabs.Panel key="tracking">
          <Card>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Package size={14} /> Tracking Timeline</h3>
              {sortedEvents.length > 0 && (
                <span className="text-xs text-muted bg-muted/10 px-2.5 py-1 rounded-full">{sortedEvents.length} events</span>
              )}
            </div>
            <div className="p-5">
              <TrackingTimeline events={sortedEvents} />
            </div>
          </Card>
        </Tabs.Panel>

        {/* Invoice Tab */}
        <Tabs.Panel key="invoice">
          <Card>
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2"><FileText size={14} /> Invoice</h3>
            </div>
            <div className="p-5">
              {invoiceLoading ? (
                <div className="flex items-center justify-center py-8"><Spinner size="sm" /></div>
              ) : invoice ? (
                <div className="space-y-3 max-w-md">
                  <InfoRow label="Invoice #" value={invoice.invoiceNo} />
                  <InfoRow label="Amount" value={`₹${Number(invoice.amount).toLocaleString('en-IN')}`} />
                  <InfoRow label="Sent" value={`${invoice.emailCount}/2 today`} />
                  <InfoRow label="Created" value={new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="flat" onPress={async () => {
                      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                      const headers: Record<string, string> = {};
                      const tid = tenantFilter;
                      if (tid) headers['X-Tenant-ID'] = tid;
                      const res = await fetch(`${base}/api/invoices/${invoice.id}/pdf`, { credentials: 'include', headers });
                      const blob = await res.blob();
                      window.open(URL.createObjectURL(blob), '_blank');
                    }}>
                      <FileText size={14} /> View PDF
                    </Button>
                    <Button size="sm" variant="flat" onPress={async () => {
                      try {
                        await api.post(`/api/invoices/${invoice.id}/send`);
                        queryClient.invalidateQueries({ queryKey: ['shipment-invoice', id] });
                      } catch (e) { console.error('[invoice] send failed:', e); }
                    }}>
                      <Send size={14} /> Send
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted">No invoice generated yet</p>
                  <Button size="sm" variant="flat" onPress={async () => {
                    try {
                      await generateInvoice.mutateAsync(id);
                    } catch (e) {
                      if ((e as { status?: number })?.status === 409) {
                        queryClient.invalidateQueries({ queryKey: ['shipment-invoice', id] });
                      }
                    }
                  }} isLoading={generateInvoice.isPending}>
                    <Plus size={14} /> Generate Invoice
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </Tabs.Panel>

        {/* Notes Tab */}
        <Tabs.Panel key="notes">
          <Card>
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2"><MessageSquare size={14} /> Notes</h3>
            </div>
            <div className="p-5 text-center py-12 text-sm text-muted">
              <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
              <p>No notes yet</p>
            </div>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Actions aside */}
      <Card>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">Actions</h3>
        </div>
        <div className="p-4 flex flex-wrap gap-2">
          <Button variant="flat" size="sm" onPress={handleTrack} isLoading={trackMutation.isPending}>
            <RefreshCw size={14} /> Refresh Tracking
          </Button>
          <Button variant="flat" size="sm" onPress={() => setEditOpen(true)}>
            <Pencil size={14} /> Edit
          </Button>
          {shipment.trackingRegistered && (
            <Button variant="ghost" size="sm" onPress={handleStopTracking} isLoading={stopMutation.isPending}>
              <Ban size={14} /> Stop Tracking
            </Button>
          )}
          <Button variant="ghost" size="sm" color="danger" onPress={() => setDeleteOpen(true)}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </Card>

      {/* Delete Modal */}
      {/* ponytail: keep simple modal pattern */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-sm mx-4">
            <div className="p-6 space-y-4">
              <p className="text-sm">Delete <strong>{shipment.trackingNo}</strong>? This cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <Button variant="flat" size="sm" onPress={() => setDeleteOpen(false)}>Cancel</Button>
                <Button color="danger" size="sm" onPress={handleDelete} isLoading={deleteMutation.isPending}>Delete</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }): ReactNode {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {icon && <span className="flex-shrink-0 text-muted">{icon}</span>}
      <span className="text-sm text-muted flex-1">{label}</span>
      <span className="text-sm font-medium text-right max-w-[50%] truncate">{value}</span>
    </div>
  );
}

function StatCard({ label, value, icon, accent, meta, highlighted }: {
  label: string; value: string; icon: ReactNode; accent?: ReactNode | null; meta?: string | null; highlighted?: boolean;
}): ReactNode {
  return (
    <Card className={cn('p-4', highlighted && 'border-success/30 bg-success/[0.02]')}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-muted">{icon}</span>
        {accent && <span className="flex-shrink-0">{accent}</span>}
        <span className="text-[11px] text-muted font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('text-sm font-semibold truncate', highlighted && 'text-success')}>{value}</p>
      {meta && <p className="text-[11px] text-muted mt-0.5">{meta}</p>}
    </Card>
  );
}

function DetailLoadingSkeleton(): ReactNode {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <Skeleton className="h-4 w-36" />
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="p-8">
          <div className="flex items-start gap-5">
            <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
            <div className="flex-1">
              <div className="flex gap-2 mb-2"><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div>
              <Skeleton className="h-8 w-64 mb-1" /><Skeleton className="h-4 w-40" />
            </div>
            <div className="flex gap-2 shrink-0"><Skeleton className="h-9 w-24 rounded-lg" /><Skeleton className="h-9 w-16 rounded-lg" /></div>
          </div>
          <div className="mt-6 flex gap-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-4 w-32" />)}</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => <Card key={i} className="p-4"><Skeleton className="h-3 w-16 mb-2" /><Skeleton className="h-5 w-28" /></Card>)}
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}
