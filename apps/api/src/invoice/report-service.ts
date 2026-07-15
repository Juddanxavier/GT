import { renderToBuffer } from '@react-pdf/renderer';
import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { db } from '../db';
import { ReportDocument } from './report-pdf';
import { currencySymbol } from '../lib/currency';

type ReportParams = {
  tenantFilter: SQL<unknown>;
  branchFilter: SQL<unknown>;
  sFilter: SQL<unknown>;
  sbFilter: SQL<unknown>;
  qFilter: SQL<unknown>;
  qbFilter: SQL<unknown>;
  type: string;
  startDate?: string;
  endDate?: string;
  tenantName?: string;
  currency?: string;
};

const ALLOWED_COLUMNS = new Set(['created_at', 's.created_at', 'q.created_at']);

function dateFilter(col: string, start?: string, end?: string): SQL<unknown> {
  if (!ALLOWED_COLUMNS.has(col)) throw new Error(`Invalid column: ${col}`);
  if (start && end) return sql`${sql.raw(col)} >= ${start}::date AND ${sql.raw(col)} < (${end}::date + INTERVAL '1 day')`;
  if (start) return sql`${sql.raw(col)} >= ${start}::date`;
  if (end) return sql`${sql.raw(col)} < (${end}::date + INTERVAL '1 day')`;
  return sql`TRUE`;
}

export async function generateReportPdf(params: ReportParams) {
  const { type, startDate, endDate, tenantFilter, branchFilter, sFilter, sbFilter, qFilter, qbFilter, tenantName, currency } = params;
  const sym = currencySymbol(currency);
  const sDate = dateFilter('created_at', startDate, endDate);
  const sdDate = dateFilter('s.created_at', startDate, endDate);
  const qdDate = dateFilter('q.created_at', startDate, endDate);
  const d = new Date();
  const generatedAt = d.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC';
  const dateLabel = [startDate, endDate].filter(Boolean).join(' – ') || 'All time';

  if (type === 'quotations') {
    const [summary] = await db.execute<Record<string, unknown>>(
      sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END),0)::int AS accepted, COALESCE(SUM(CASE WHEN status='converted' THEN 1 ELSE 0 END),0)::int AS converted, COALESCE(SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END),0)::int AS rejected FROM quotation WHERE ${tenantFilter} AND ${branchFilter} AND ${sDate}`,
    );
    const s = summary ?? { total: 0, accepted: 0, converted: 0, rejected: 0 };

    const records = await db.execute<Record<string, unknown>>(
      sql`SELECT q.id, q.quote_no, q.status, q.total, TO_CHAR(q.valid_until, 'YYYY-MM-DD') AS valid_until, TO_CHAR(q.created_at, 'YYYY-MM-DD') AS created_at, COALESCE(u.name, '') AS customer_name FROM quotation q LEFT JOIN "user" u ON u.id = q.user_id WHERE ${qFilter} AND ${qbFilter} AND ${qdDate} ORDER BY q.created_at DESC LIMIT 1000`,
    );

    return await renderToBuffer(ReportDocument({
      data: {
        title: 'Quotation Report',
        subtitle: dateLabel,
        recordType: 'quotations',
        summaryCards: [
          { label: 'Total', value: String(s.total as number) },
          { label: 'Accepted', value: String(s.accepted as number) },
          { label: 'Converted', value: String(s.converted as number) },
          { label: 'Rejected', value: String(s.rejected as number) },
        ],
        records: records as Record<string, unknown>[],
        generatedAt,
        tenantName,
        currency,
      },
    }));
  }

  const [summary] = await db.execute<Record<string, unknown>>(
    sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END),0)::int AS delivered, COALESCE(SUM(CASE WHEN status='in_transit' THEN 1 ELSE 0 END),0)::int AS in_transit, COALESCE(SUM(CASE WHEN status IN ('exception','failed_attempt') THEN 1 ELSE 0 END),0)::int AS exceptions FROM shipment WHERE ${tenantFilter} AND ${branchFilter} AND ${sDate} AND archived_at IS NULL`,
  );
  const s = summary ?? { total: 0, delivered: 0, in_transit: 0, exceptions: 0 };

  const [rev] = await db.execute<Record<string, unknown>>(
    sql`SELECT COALESCE(SUM(amount),0)::numeric(12,2) AS total FROM invoice WHERE ${tenantFilter} AND ${branchFilter} AND ${sDate} AND archived_at IS NULL`,
  );

  const records = await db.execute<Record<string, unknown>>(
    sql`SELECT s.id, s.tracking_no, s.label_code, s.status, s.origin, s.destination, s.carrier, TO_CHAR(s.created_at, 'YYYY-MM-DD') AS created_at, COALESCE(u.name, '') AS customer_name, COALESCE(u.phone, '') AS customer_phone, COALESCE(u.email, '') AS customer_email, COALESCE(b.name, '') AS branch_name, COALESCE(s.bill_amount, inv.amount, '0') AS bill_amount FROM shipment s LEFT JOIN "user" u ON u.id = s.user_id LEFT JOIN branch b ON b.id = s.branch_id LEFT JOIN invoice inv ON inv.shipment_id = s.id WHERE ${sFilter} AND ${sbFilter} AND ${sdDate} AND s.archived_at IS NULL ORDER BY s.created_at DESC LIMIT 1000`,
  );

  return await renderToBuffer(ReportDocument({
    data: {
      title: 'Shipment Report',
      subtitle: dateLabel,
      recordType: 'shipments',
      summaryCards: [
        { label: 'Total', value: String(s.total as number) },
        { label: 'Delivered', value: String(s.delivered as number) },
        { label: 'In Transit', value: String(s.in_transit as number) },
        { label: 'Exceptions', value: String(s.exceptions as number) },
        { label: 'Bill Amount', value: `${sym} ${(rev?.total as string) ?? '0.00'}` },
      ],
        records: records as Record<string, unknown>[],
        generatedAt,
        tenantName,
        currency,
      },
  }));
}
