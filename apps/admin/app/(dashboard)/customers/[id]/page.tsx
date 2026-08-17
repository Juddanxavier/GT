'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Building2, Package, Receipt, CalendarDays, Pencil } from 'lucide-react';
import { Button, Chip, Spinner, Table } from '@heroui/react';
import { PageHeader } from '@/components/page-header';
import { ShipmentStatusBadge } from '@/components/shipment-status-badge';
import { api } from '@/lib/api';
import { useShipments, useInvoices, useBranches, useTenants, type UserRecord, type Invoice } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';
import { getCountryCode } from '@/lib/country-codes';
import { formatCurrency } from '@/lib/currency';
import { INVOICE_STATUS_COLORS } from '@/lib/status-config';

const ROLE_COLORS: Record<string, 'accent' | 'success' | 'warning' | 'default'> = {
  customer: 'success',
  staff: 'warning',
  'tenant-admin': 'accent',
  superadmin: 'default',
};

export default function CustomerProfilePage() {
  usePageTitle('Customer Profile');
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { data: user, isPending, isError } = useQuery<UserRecord>({
    queryKey: ['user', id],
    queryFn: () => api.get<UserRecord>(`/api/users/${id}`),
    enabled: !!id,
  });

  const { data: branches = [] } = useBranches();
  const { data: tenants = [] } = useTenants();

  const branch = useMemo(() => branches.find((b) => b.id === user?.branchId), [branches, user]);
  const tenantCountry = useMemo(() => {
    const t = tenants.find((t) => t.id === branch?.tenantId);
    return t?.country ?? undefined;
  }, [tenants, branch]);
  const tenantCurrency = useMemo(() => {
    const t = tenants.find((t) => t.id === branch?.tenantId);
    return t?.currency ?? undefined;
  }, [tenants, branch]);
  const phoneDial = getCountryCode(tenantCountry).dialCode;
  const phoneFlag = getCountryCode(tenantCountry).flag;

  const { data: shipmentsData } = useShipments(1, 10, 'all', '', id);
  const { data: invoicesData } = useInvoices(undefined, 1, 10, undefined, id);
  const shipments = Array.isArray(shipmentsData) ? [] : (shipmentsData?.data ?? []);
  const invoices = Array.isArray(invoicesData) ? [] : (invoicesData?.data ?? []);

  if (isPending)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );

  if (isError || !user)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-danger text-sm">Failed to load customer</p>
        <Button variant="secondary" size="sm" onPress={() => router.back()}>Go back</Button>
      </div>
    );

  const initials = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.name || 'Customer'}
        subtitle={user.email}
        icon={<User size={18} />}
        action={
          <Button variant="secondary" onPress={() => router.push(`/customers/${user.id}/edit`)}>
            <Pencil size={14} /> Edit
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-sm border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center text-lg font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.name}</p>
              <Chip size="sm" variant="soft" color={ROLE_COLORS[user.role] ?? 'default'} className="mt-1 capitalize">{user.role}</Chip>
            </div>
          </div>
          <div className="mt-5 space-y-2.5 text-sm">
            <p className="flex items-center gap-2 text-muted"><Mail size={14} className="shrink-0" /> {user.email}</p>
            <p className="flex items-center gap-2 text-muted">
              <Phone size={14} className="shrink-0" />
              {user.phone ? `${phoneFlag ? `${phoneFlag} ` : ''}${user.phone.startsWith('+') ? user.phone : `${phoneDial} ${user.phone}`}` : '—'}
            </p>
            <p className="flex items-center gap-2 text-muted">
              <Building2 size={14} className="shrink-0" />
              {branch?.name ?? '—'}
            </p>
            <p className="flex items-center gap-2 text-muted">
              <CalendarDays size={14} className="shrink-0" />
              Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="rounded-sm border border-border bg-surface p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted">Shipments</span>
              <Package size={16} className="text-muted" />
            </div>
            <p className="text-3xl font-bold tracking-tight">{shipmentsData?.total ?? 0}</p>
            <p className="mt-auto pt-2 text-[11px] text-muted">Across all statuses</p>
          </div>
          <div className="rounded-sm border border-border bg-surface p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted">Invoices</span>
              <Receipt size={16} className="text-muted" />
            </div>
            <p className="text-3xl font-bold tracking-tight">{invoicesData?.total ?? 0}</p>
            <p className="mt-auto pt-2 text-[11px] text-muted">Across all statuses</p>
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Shipments</h2>
          {shipments.length > 0 && (
            <Button size="sm" variant="ghost" onPress={() => router.push(`/shipments?search=${encodeURIComponent(user.email)}`)}>
              View all
            </Button>
          )}
        </div>
        {shipments.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted text-sm">No shipments for this customer</div>
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Customer shipments">
                <Table.Header>
                  <Table.Column id="trackingNo" isRowHeader>Tracking #</Table.Column>
                  <Table.Column id="carrier">Carrier</Table.Column>
                  <Table.Column id="billAmount">Bill</Table.Column>
                  <Table.Column id="status">Status</Table.Column>
                  <Table.Column id="created">Created</Table.Column>
                </Table.Header>
                <Table.Body>
                  {shipments.map((s) => (
                    <Table.Row key={s.id} onAction={() => router.push(`/shipments/${s.trackingNo}`)} className="cursor-pointer">
                      <Table.Cell><span className="font-mono text-xs font-medium">{s.trackingNo}</span></Table.Cell>
                      <Table.Cell>{s.carrier || '—'}</Table.Cell>
                      <Table.Cell>{s.billAmount ? formatCurrency(s.billAmount, tenantCurrency) : '—'}</Table.Cell>
                      <Table.Cell><ShipmentStatusBadge status={s.status} /></Table.Cell>
                      <Table.Cell><span className="text-xs text-muted">{new Date(s.createdAt).toLocaleDateString()}</span></Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </div>

      <div className="rounded-sm border border-border bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm">Invoices</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted text-sm">No invoices for this customer</div>
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Customer invoices">
                <Table.Header>
                  <Table.Column id="invoiceNo" isRowHeader>Invoice No</Table.Column>
                  <Table.Column id="trackingNo">Tracking</Table.Column>
                  <Table.Column id="amount">Amount</Table.Column>
                  <Table.Column id="status">Status</Table.Column>
                  <Table.Column id="created">Created</Table.Column>
                </Table.Header>
                <Table.Body>
                  {invoices.map((inv: Invoice) => (
                    <Table.Row key={inv.id} onAction={() => router.push(`/invoices/${inv.invoiceNo}`)} className="cursor-pointer">
                      <Table.Cell><span className="font-mono text-xs font-medium">{inv.invoiceNo}</span></Table.Cell>
                      <Table.Cell className="font-mono text-xs">{inv.trackingNo || '—'}</Table.Cell>
                      <Table.Cell>{formatCurrency(inv.amount, tenantCurrency)}</Table.Cell>
                      <Table.Cell>
                        <Chip size="sm" variant="soft" color={INVOICE_STATUS_COLORS[inv.status] ?? 'default'} className="capitalize">{inv.status}</Chip>
                      </Table.Cell>
                      <Table.Cell><span className="text-xs text-muted">{new Date(inv.createdAt).toLocaleDateString()}</span></Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </div>
    </div>
  );
}
