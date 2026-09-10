import type { ColumnDef } from '@/components/table-preferences';

export const SHIPMENTS_TABLE_STORAGE_KEY = 'shipments-table';

export const SHIPMENT_COLUMNS: ColumnDef[] = [
  { id: 'trackingNumber', label: 'Tracking #', always: true },
  { id: 'labelCode', label: 'Label Code' },
  { id: 'customerName', label: 'Customer' },
  { id: 'carrier', label: 'Carrier' },
  { id: 'billAmount', label: 'Bill' },
  { id: 'status', label: 'Status', always: true },
];

export { FILTER_GROUPS, STATUS_GROUPS } from '@/lib/status-config';
