'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card, Chip, Input, Label, ListBox, Modal, ScrollShadow, Select, Skeleton, cn } from '@heroui/react';
import { CustomerAssigner } from '@/components/customer-assigner';
import { api, getTenantFilter } from '@/lib/api';
import { CopyButton, Flag, countryFromString } from '@/components/copy-button';
import { useTenants } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';

import { getCountryCode, stripDialCode } from '@/lib/country-codes';
import { ArrowLeft, Check, MapPin, Clock, Calendar, Package, FileText, Users, Globe, DollarSign, RefreshCw, Trash2, Pencil, Ban, Send, Download, Plus } from 'lucide-react';

type Customer = { id: string; name: string; email?: string; phone?: string };
type TrackingEvent = {
  id: string; status: string; subStatus: string | null;
  description: string | null; location: string | null; carrier: string | null; eventTime: string;
};

type ApiShipment = {
  id: string; trackingNo: string; labelCode: string | null;
  status: string; customerId: string | null;
  contactEmail: string | null; contactPhone: string | null;
  carrier: string | null; origin: string | null; destination: string | null;
  billAmount: string | null; trackingRegistered: boolean;
  lastTrackedAt: string | null; trackingProvider: string | null;
  estimatedDelivery: string | null; actualDelivery: string | null;
  createdAt: string; updatedAt: string;
  tenantId?: string; branchId?: string | null;
};

const STATUS_META: Record<string, { label: string; color: 'warning' | 'accent' | 'success' | 'danger' | 'default' }> = {
  pending:          { label: 'Pending',          color: 'warning' },
  info_received:    { label: 'Info Received',    color: 'warning' },
  in_transit:       { label: 'In Transit',       color: 'accent' },
  out_for_delivery: { label: 'Out for Delivery', color: 'accent' },
  delivered:        { label: 'Delivered',        color: 'success' },
  delivery_failure: { label: 'Delivery Failed',  color: 'danger'  },
  cancelled:        { label: 'Cancelled',        color: 'danger'  },
  exception:        { label: 'Exception',        color: 'danger'  },
};

const STATUS_ICONS: Record<string, ReactNode> = {
  pending: <Package size={18} />,
  info_received: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
  in_transit: <Package size={18} />,
  out_for_delivery: <Package size={18} />,
  delivered: <Check size={18} />,
  delivery_failure: <Ban size={18} />,
  cancelled: <Ban size={18} />,
  exception: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
};

export default function ShipmentDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [shipmentTitle, setShipmentTitle] = useState('');
  usePageTitle(shipmentTitle || 'Shipment');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [shipment, setShipment] = useState<ApiShipment | null>(null);
  useEffect(() => { if (shipment?.trackingNo) setShipmentTitle(`Shipment ${shipment.trackingNo}`); }, [shipment?.trackingNo]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; tenantId: string }[]>([]);
  const [tracking, setTracking] = useState<TrackingEvent[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<{ id: string; invoiceNo: string; amount: string; emailCount: number; createdAt: string } | null | undefined>(undefined);

  const [editAssigner, setEditAssigner] = useState<{ customerId: string | null; contactEmail: string; contactPhone: string }>({
    customerId: null,
    contactEmail: '',
    contactPhone: '',
  });

  const [editTenantId, setEditTenantId] = useState('');
  const { data: editTenants = [] } = useTenants();
  const editTenantCountry = useMemo(() => {
    if (!editTenantId) return undefined;
    const t = editTenants.find((t) => t.id === editTenantId);
    return t?.country ?? undefined;
  }, [editTenantId, editTenants]);
  const editPhoneDialCode = getCountryCode(editTenantCountry).dialCode;
  const editPhoneFlag = getCountryCode(editTenantCountry).flag;
  const [editBranchId, setEditBranchId] = useState('');
  const [editBillAmount, setEditBillAmount] = useState(0);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const clearEditError = (field: string) => setEditErrors((prev) => { const { [field]: _, ...rest } = prev; return rest; });

  useEffect(() => { load(); }, []);

  const isStaff = userRole === 'staff';
  const isAdmin = userRole === 'superadmin' || userRole === 'tenant-admin';

  async function load() {
    try {
      const [data, custs, me, tenantList, branchList] = await Promise.all([
        api.get<ApiShipment>(`/api/shipments/${id}`),
        api.get<Customer[]>('/api/customers'),
        api.get<{ id: string; role: string }>('/api/me'),
        api.get<{ id: string; name: string }[]>('/api/tenants'),
        api.get<{ id: string; name: string; tenantId: string }[]>('/api/branches'),
      ]);
      setTenants(tenantList);
      setBranches(branchList);
      setUserRole(me.role);
      setShipment(data);
      setCustomers(custs);
      setEditAssigner({
        customerId: data.customerId ?? null,
        contactEmail: data.contactEmail ?? '',
        contactPhone: data.contactPhone ?? '',
      });

      setEditBillAmount(Number(data.billAmount) || 0);
      setEditTenantId(data.tenantId ?? '');
      setEditBranchId(data.branchId ?? '');
    } catch {
      setLoadError(true);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<{ shipment: object; events: TrackingEvent[] }>(`/api/shipments/${id}/tracking`);
      setTracking(res.events);
    } catch { /* no tracking */ }
    try {
      const inv = await api.get<{ id: string; invoiceNo: string; amount: string; emailCount: number; createdAt: string } | null>(`/api/invoices/shipment/${id}`);
      setInvoice(inv);
    } catch { setInvoice(null); }
    setLoading(false);
  }

  async function handleTrack() {
    if (!shipment) return;
    setTrackingLoading(true);
    try {
      await api.post<{ newEvents: number; currentStatus: string }>(`/api/shipments/${id}/track`);
      const [updated, tr] = await Promise.all([
        api.get<ApiShipment>(`/api/shipments/${id}`),
        api.get<{ shipment: object; events: TrackingEvent[] }>(`/api/shipments/${id}/tracking`),
      ]);
      setShipment(updated);
      setTracking(tr.events);
    } catch (e) { console.error('[shipments] track failed:', e); }
    setTrackingLoading(false);
  }

  async function handleStopTracking() {
    if (!shipment) return;
    if (!window.confirm(`Stop tracking ${shipment.trackingNo}?`)) return;
    setStopLoading(true);
    try {
      await api.post(`/api/shipments/${id}/stop-tracking`);
      setShipment((p) => p ? { ...p, trackingRegistered: false } : null);
    } catch (e) { console.error('[shipments] stop-tracking failed:', e); }
    setStopLoading(false);
  }

  const customerName = useMemo(() => {
    if (!shipment) return '';
    if (!shipment.customerId) {
      if (shipment.contactEmail || shipment.contactPhone) return `Unclaimed — ${shipment.contactEmail || shipment.contactPhone}`;
      return 'Self — no notifications';
    }
    return customers.find((c) => c.id === shipment.customerId)?.name ?? '—';
  }, [shipment, customers]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditErrors({});
    if ((document.getElementById('hp-edit') as HTMLInputElement)?.value) return;
    setSaving(true);
    try {
      const data = await api.patch<ApiShipment>(`/api/shipments/${id}`, {
        customerId: editAssigner.customerId === 'self' ? undefined : (editAssigner.customerId ?? undefined),
        contactEmail: editAssigner.contactEmail || undefined,
        contactPhone: editAssigner.contactPhone || undefined,
        billAmount: editBillAmount || undefined,
        branchId: editBranchId || undefined,
        tenantId: editTenantId || undefined,
      });
      setShipment(data);
      setEditOpen(false);
    } catch (e) {
      const msg = (e as { message?: string })?.message || 'Failed to save';
      setEditErrors({ form: msg });
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!shipment) return;
    setDeleting(true);
    try { await api.delete(`/api/shipments/${id}`); router.push('/shipments'); } finally { setDeleting(false); }
  }

  function openEdit() {
    if (!shipment) return;
    setEditErrors({});
    setEditAssigner({
      customerId: shipment.customerId ?? null,
      contactEmail: shipment.contactEmail ?? '',
      contactPhone: shipment.contactPhone ?? '',
    });
    setEditBillAmount(Number(shipment.billAmount) || 0);
    setEditTenantId(shipment.tenantId ?? '');
    setEditBranchId(shipment.branchId ?? '');
    setEditOpen(true);
  }

  const sel = 'w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  if (loading) return <LoadingSkeleton />;
  if (loadError) return <p className="text-center text-muted mt-20">Failed to load shipment. <button className="underline" onClick={load}>Retry</button></p>;
  if (!shipment) return null;

  const cfg = STATUS_META[shipment.status] ?? { label: shipment.status, color: 'default' as const };
  const statusIcon = STATUS_ICONS[shipment.status] ?? STATUS_ICONS.exception;
  const sorted = [...tracking].sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());
  const originCountry = shipment.origin ? countryFromString(shipment.origin) : null;
  const destCountry = shipment.destination ? countryFromString(shipment.destination) : null;
  const daysSinceUpdate = shipment.lastTrackedAt
    ? Math.floor((Date.now() - new Date(shipment.lastTrackedAt).getTime()) / 86400000)
    : null;
  const transitDays = shipment.estimatedDelivery && shipment.createdAt
    ? Math.ceil((new Date(shipment.estimatedDelivery).getTime() - new Date(shipment.createdAt).getTime()) / 86400000)
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Back button */}
      <button onClick={() => router.push('/shipments')} className="group inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors">
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
        Back to Shipments
      </button>

      {/* Hero Section */}
      <div className={cn(
        'relative overflow-hidden rounded-2xl border',
        cfg.color === 'accent' && 'border-accent/30',
        cfg.color === 'success' && 'border-success/30',
        cfg.color === 'danger' && 'border-danger/30',
        cfg.color === 'warning' && 'border-warning/30',
        cfg.color === 'default' && 'border-border',
      )}>
        {/* Background gradient */}
        <div className={cn(
          'absolute inset-0',
          cfg.color === 'accent' && 'bg-gradient-to-br from-accent/[0.08] to-transparent',
          cfg.color === 'success' && 'bg-gradient-to-br from-success/[0.08] to-transparent',
          cfg.color === 'danger' && 'bg-gradient-to-br from-danger/[0.08] to-transparent',
          cfg.color === 'warning' && 'bg-gradient-to-br from-warning/[0.08] to-transparent',
          cfg.color === 'default' && 'bg-gradient-to-br from-muted/[0.04] to-transparent',
        )} />

        <div className="relative px-8 py-7">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Status + Tracking */}
            <div className="flex items-center gap-5">
              <div className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
                cfg.color === 'accent' && 'bg-accent/15 text-accent',
                cfg.color === 'success' && 'bg-success/15 text-success',
                cfg.color === 'danger' && 'bg-danger/15 text-danger',
                cfg.color === 'warning' && 'bg-warning/15 text-warning',
                cfg.color === 'default' && 'bg-muted/15 text-muted',
              )}>
                {statusIcon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <Chip size="sm" variant="secondary" color={cfg.color}>{cfg.label}</Chip>
                  <span className="text-xs text-muted bg-muted/10 px-2 py-0.5 rounded-full">{shipment.carrier || 'Unknown'}</span>
                  {shipment.trackingRegistered && (
                    <span className="text-xs text-success flex items-center gap-1">
                      <Check size={12} />
                      Active
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  {shipment.trackingNo}
                  <CopyButton text={shipment.trackingNo} />
                </h1>
                {shipment.labelCode && (
                  <p className="text-xs text-muted mt-1 font-mono flex items-center gap-1.5">
                    <span className="text-muted/60">Label:</span>
                    {shipment.labelCode}
                    <CopyButton text={shipment.labelCode} />
                  </p>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onPress={handleTrack} isPending={trackingLoading}>
                <Package size={16} />
                Track Now
              </Button>
              <Button variant="secondary" size="sm" onPress={openEdit}>Edit</Button>
              <Button variant="ghost" size="sm" onPress={() => setDeleteOpen(true)}>Delete</Button>
            </div>
          </div>

          {/* Status bar */}
          <div className="mt-6 flex items-center gap-4 text-xs text-muted">
            {shipment.origin && (
              <div className="flex items-center gap-1.5">
                <MapPin size={14} />
                <span className="truncate max-w-[200px]">{shipment.origin}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Package size={12} />
              <span>{shipment.status.replace(/_/g, ' ')}</span>
            </div>
            {shipment.estimatedDelivery && (
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>Est. {new Date(shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
            )}
            {daysSinceUpdate !== null && (
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>{daysSinceUpdate === 0 ? 'Today' : `${daysSinceUpdate}d ago`}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Origin"
          value={shipment.origin || '—'}
          icon={<MapPin size={14} />}
          accent={originCountry ? <Flag country={originCountry} /> : null}
        />
        <StatCard
          label="Destination"
          value={shipment.destination || '—'}
          icon={<MapPin size={14} />}
          accent={destCountry ? <Flag country={destCountry} /> : null}
        />
        <StatCard
          label="Estimated Delivery"
          value={shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          icon={<Clock size={14} />}
          meta={transitDays ? `${transitDays}d transit` : null}
        />
        <StatCard
          label="Actual Delivery"
          value={shipment.actualDelivery ? new Date(shipment.actualDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          icon={<Check size={14} />}
          highlighted={!!shipment.actualDelivery}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={14} className="text-muted" />
              <h2 className="text-sm font-semibold">Tracking Timeline</h2>
            </div>
            {sorted.length > 0 && (
              <span className="text-xs text-muted bg-muted/10 px-2.5 py-1 rounded-full">{sorted.length} events</span>
            )}
          </div>

          {sorted.length === 0 ? (
            <Card className="py-14">
              <div className="text-center max-w-xs mx-auto">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted/10 flex items-center justify-center">
                  <Package size={20} className="text-muted" />
                </div>
                <p className="text-sm text-muted font-medium">No tracking events yet</p>
                <p className="text-xs text-muted mt-1.5 leading-relaxed">Click &quot;Track Now&quot; to fetch live tracking data from the carrier.</p>
              </div>
            </Card>
          ) : (
            <Card>
              <ScrollShadow className="max-h-[620px]">
                <div className="p-6">
                  <div className="space-y-0">
                    {sorted.map((evt, i) => {
                      const m = STATUS_META[evt.status] ?? { label: evt.status.replace(/_/g, ' '), color: 'default' as const };
                      const evtIcon = STATUS_ICONS[evt.status] ?? STATUS_ICONS.exception;
                      const latest = i === 0;
                      return (
                        <div key={evt.id} className="relative flex gap-5 pb-8 last:pb-0">
                          {/* Connector line */}
                          {i < sorted.length - 1 && (
                            <div className={cn(
                              'absolute left-[17px] top-[38px] bottom-0 w-0.5',
                              latest ? 'bg-accent/25' : 'bg-border/50',
                            )} />
                          )}
                          {/* Icon dot */}
                          <div className={cn(
                            'relative z-10 flex-shrink-0 w-[34px] h-[34px] rounded-xl flex items-center justify-center',
                            latest
                              ? (cfg.color === 'accent' ? 'bg-accent text-white shadow-sm shadow-accent/30' :
                                 cfg.color === 'success' ? 'bg-success text-white shadow-sm shadow-success/30' :
                                 cfg.color === 'danger' ? 'bg-danger text-white shadow-sm shadow-danger/30' :
                                 'bg-foreground text-background shadow-sm')
                              : 'bg-muted/10 text-muted border border-border/40',
                          )}>
                            {latest ? (
                              <Check size={14} />
                            ) : (
                              <div className="w-[14px] h-[14px]">{evtIcon}</div>
                            )}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Chip size="sm" variant="soft" color={m.color}>{m.label}</Chip>
                              {latest && (
                                <span className="text-[10px] font-semibold text-accent uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded-full">Latest</span>
                              )}
                              {evt.subStatus && (
                                <span className="text-xs text-muted hidden sm:inline">· {evt.subStatus.replace(/_/g, ' ')}</span>
                              )}
                            </div>
                            {evt.description && (
                              <p className="text-sm text-foreground mb-1.5 leading-relaxed">{evt.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                              {evt.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={10} />
                                  {evt.location}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(evt.eventTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {evt.carrier && (
                                <span className="flex items-center gap-1">
                                  <Package size={10} />
                                  {evt.carrier}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollShadow>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-5">
          {/* Invoice */}
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <FileText size={14} className="text-muted" />
                Invoice
              </Card.Title>
            </Card.Header>
            <div className="border-t border-border" />
            <Card.Content className="p-4 space-y-2">
              {invoice === undefined ? (
                <p className="text-sm text-muted text-center py-2">Loading...</p>
              ) : invoice ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Invoice #</span>
                    <span className="text-sm font-semibold">{invoice.invoiceNo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Amount</span>
                    <span className="text-sm font-semibold text-success">₹{Number(invoice.amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Sent</span>
                    <span className="text-sm">{invoice.emailCount}/2 today</span>
                  </div>
                  <div className="pt-2 space-y-2 border-t border-border">
                    <Button className="w-full justify-start" variant="secondary" size="sm" onPress={async () => {
                      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                      const headers: Record<string, string> = {};
                      const tid = getTenantFilter();
                      if (tid) headers['X-Tenant-ID'] = tid;
                      const res = await fetch(`${base}/api/invoices/${invoice.id}/pdf`, { credentials: 'include', headers });
                      const blob = await res.blob();
                      window.open(URL.createObjectURL(blob), '_blank');
                    }}>
                      <FileText size={16} />
                      View Invoice
                    </Button>
                    <Button className="w-full justify-start" variant="ghost" size="sm" onPress={async () => {
                      try {
                        const res = await api.post<{ sent: boolean; emailCount: number }>(`/api/invoices/${invoice.id}/send`);
                        setInvoice({ ...invoice, emailCount: res.emailCount });
                      } catch (e) { console.error('[invoices] send failed:', e); }
                    }}>
                      <Send size={16} />
                      Send Invoice
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-3 space-y-3">
                  <p className="text-xs text-muted">No invoice generated yet</p>
                  <Button className="w-full justify-center" variant="secondary" size="sm" onPress={async () => {
                    try {
                      const inv = await api.post<{ id: string; invoiceNo: string; amount: string; emailCount: number; createdAt: string }>(`/api/invoices/shipment/${id}`);
                      setInvoice(inv);
                    } catch (e) {
                      if ((e as { status?: number })?.status === 409) {
                        const inv = await api.get<{ id: string; invoiceNo: string; amount: string; emailCount: number; createdAt: string } | null>(`/api/invoices/shipment/${id}`);
                        if (inv) setInvoice(inv);
                      } else {
                        console.error('[invoices] generate failed:', e);
                      }
                    }
                    }}>
                      <Plus size={16} />
                      Generate Invoice
                    </Button>
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Shipment Details */}
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <FileText size={14} className="text-muted" />
                Details
              </Card.Title>
            </Card.Header>
            <div className="border-t border-border" />
            <Card.Content className="p-0 divide-y divide-border">
              <InfoRow label="Customer" value={customerName} icon={<Users size={14} className="text-muted" />} />
              <InfoRow label="Carrier" value={shipment.carrier || '—'} icon={<Package size={14} className="text-muted" />} />
              <InfoRow label="Provider" value={shipment.trackingProvider || '—'} icon={<Globe size={14} className="text-muted" />} />
              <InfoRow label="Bill Amount" value={shipment.billAmount ? `\u20B9${shipment.billAmount}` : '—'} icon={<DollarSign size={14} className="text-muted" />} />
              <InfoRow label="Tracking" value={shipment.trackingRegistered ? 'Active' : 'Inactive'} icon={<Package size={14} className="text-muted" />} />
              <InfoRow label="Last Tracked" value={shipment.lastTrackedAt ? new Date(shipment.lastTrackedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'} icon={<Clock size={14} className="text-muted" />} />
              <InfoRow label="Created" value={new Date(shipment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} icon={<Calendar size={14} className="text-muted" />} />
              <InfoRow label="Updated" value={new Date(shipment.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} icon={<RefreshCw size={14} className="text-muted" />} />
            </Card.Content>
          </Card>

          {/* Route Visualization */}
          {(shipment.origin || shipment.destination) && (
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted"><polyline points="3 6 9 6 15 18 21 18" /><path d="M3 18h6l6-12h6" /></svg>
                  Route
                </Card.Title>
              </Card.Header>
              <div className="border-t border-border" />
              <Card.Content className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full border-2 border-accent bg-accent/20" />
                    <div className="w-0.5 h-8 bg-gradient-to-b from-accent/60 to-muted" />
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
                {shipment.actualDelivery && (
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-success flex items-center gap-1">
                      <Check size={12} />
                      Delivered
                    </span>
                    <span className="font-semibold text-success">{new Date(shipment.actualDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
              </Card.Content>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /></svg>
                Actions
              </Card.Title>
            </Card.Header>
            <div className="border-t border-border" />
            <Card.Content className="p-4 space-y-2">
              <Button className="w-full justify-start" variant="secondary" size="sm" onPress={handleTrack} isPending={trackingLoading}>
                <RefreshCw size={16} />
                Refresh Tracking
              </Button>
              <Button className="w-full justify-start" variant="secondary" size="sm" onPress={openEdit}>
                <Pencil size={16} />
                Edit Shipment
              </Button>
              {isAdmin && shipment.trackingRegistered && (
                <Button className="w-full justify-start" variant="ghost" size="sm" onPress={handleStopTracking} isPending={stopLoading}>
                  <Ban size={16} />
                  Stop Tracking
                </Button>
              )}
              <Button className="w-full justify-start" variant="ghost" size="sm" onPress={() => setDeleteOpen(true)}>
                <Trash2 size={16} />
                Delete
              </Button>
            </Card.Content>
          </Card>
        </div>
      </div>

      <Modal.Backdrop isOpen={editOpen} onOpenChange={(v) => { if (!v) setEditOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Edit Shipment</Modal.Header>
            <Modal.Body>
              <form id="edit-form" onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot */}
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <label htmlFor="hp-edit">Leave empty</label>
                  <input id="hp-edit" name="website" type="text" tabIndex={-1} autoComplete="off" />
                </div>
                <CustomerAssigner
                  customers={customers}
                  customerId={editAssigner.customerId ?? ''}
                  contactEmail={editAssigner.contactEmail}
                  contactPhone={editAssigner.contactPhone}
                  onChange={(data) => setEditAssigner(data)}
                  phoneDialCode={editPhoneDialCode}
                  phoneFlag={editPhoneFlag}
                  clearError={() => {}}
                  showSelf
                />
                {(userRole === 'superadmin' || userRole === 'tenant-admin') && (
                  <div className="space-y-1">
                    <Label>Branch</Label>
                    <Select
                      selectedKey={editBranchId}
                      onSelectionChange={(k) => { setEditBranchId(k as string); clearEditError('branchId'); }}
                      placeholder="None"
                      variant="secondary"
                      aria-label="Select branch"
                    >
                      <Select.Trigger className="h-10 text-sm">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {branches.filter((b) => b.tenantId === editTenantId).map((b) => (
                            <ListBox.Item key={b.id} id={b.id} textValue={b.name}>
                              {b.name}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    {editErrors.branchId && <p className="text-xs text-danger">{editErrors.branchId}</p>}
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="edit-billAmount">Bill Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none">&#x20B9;</span>
                    <input id="edit-billAmount" type="number" step="0.01" min="0" value={editBillAmount}
                      onChange={(e) => { setEditBillAmount(Number(e.target.value)); clearEditError('billAmount'); }}
                      className={`w-full pl-8 pr-3 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary ${isStaff ? 'opacity-60 cursor-not-allowed' : ''}`}
                      disabled={isStaff} />
                  </div>
                  {editErrors.billAmount && <p className="text-xs text-danger">{editErrors.billAmount}</p>}
                  {isStaff && <p className="text-xs text-muted">Only admins can change bill amount</p>}
                </div>
              </form>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" form="edit-form" isPending={saving}>Save</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop isOpen={deleteOpen} onOpenChange={(v) => { if (!v) setDeleteOpen(false); }}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>Delete Shipment</Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">Delete <strong>{shipment.trackingNo}</strong>? This cannot be undone.</p>
            </Modal.Body>
            <Modal.Footer className="flex gap-2">
              <Button variant="secondary" onPress={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="danger" isPending={deleting} onPress={handleDelete}>{deleting ? 'Deleting...' : 'Delete'}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5">
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="text-sm text-muted flex-1">{label}</span>
      <span className="text-sm font-medium text-right max-w-[50%] truncate">{value}</span>
    </div>
  );
}

function StatCard({ label, value, icon, accent, meta, highlighted }: {
  label: string; value: string; icon: ReactNode; accent?: ReactNode | null; meta?: string | null; highlighted?: boolean;
}) {
  return (
    <Card className={cn(
      'p-4 transition-shadow hover:shadow-sm',
      highlighted && 'border-success/30 bg-success/[0.02]',
    )}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-muted">{icon}</span>
        {accent && <span className="flex-shrink-0">{accent}</span>}
        <span className="text-[11px] text-muted font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn(
        'text-sm font-semibold truncate',
        highlighted && 'text-success',
      )}>{value}</p>
      {meta && <p className="text-[11px] text-muted mt-0.5">{meta}</p>}
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <Skeleton className="h-4 w-36" />

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="p-8">
          <div className="flex items-start gap-5">
            <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
            <div className="flex-1">
              <div className="flex gap-2 mb-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-8 w-64 mb-1" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-16 rounded-lg" />
              <Skeleton className="h-9 w-16 rounded-lg" />
            </div>
          </div>
          <div className="mt-6 flex gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-32" />)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-5 w-28" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 space-y-4">
          <Skeleton className="h-5 w-36" />
          <Card className="p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-5 pb-6">
                <Skeleton className="w-[34px] h-[34px] rounded-xl shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-full max-w-sm mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </Card>
        </div>
        <div className="col-span-2 space-y-5">
          <Card><Card.Header><Skeleton className="h-5 w-24" /></Card.Header><div className="p-5 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-3 w-full" />)}
          </div></Card>
          <Card><Card.Header><Skeleton className="h-5 w-16" /></Card.Header><div className="p-5">
            <Skeleton className="h-16 w-full" />
          </div></Card>
        </div>
      </div>
    </div>
  );
}
