import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

import { currencySymbol } from '../lib/currency';
import { PDF_FONT_FAMILY } from './pdf-fonts';

const green = '#15803d';
const black = '#111827';
const gray = '#6b7280';
const light = '#e5e7eb';

const styles = StyleSheet.create({
  page: { padding: 0, fontFamily: PDF_FONT_FAMILY, color: black },
  body: { padding: '32 36' },
  // Header
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 14, borderBottom: `2px solid ${green}` },
  brandBlock: { flexDirection: 'column' },
  brandName: { fontSize: 18, fontWeight: 'bold', color: green, letterSpacing: 1 },
  brandTag: { fontSize: 7, color: gray, marginTop: 1, letterSpacing: 0.5 },
  titleBlock: { alignItems: 'flex-end' },
  docTitle: { fontSize: 14, fontWeight: 'bold', color: black },
  docSub: { fontSize: 7, color: gray, marginTop: 2 },
  // Summary row
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, padding: '8 10', backgroundColor: '#f0fdf4', borderRadius: 3, border: `1px solid #bbf7d0` },
  summaryLabel: { fontSize: 6, color: gray, marginBottom: 1, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: green },
  // Section
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: black, marginBottom: 8, marginTop: 4, paddingBottom: 4, borderBottom: `1px solid ${light}` },
  // Records table
  tableHeaderRow: { flexDirection: 'row', backgroundColor: green, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 2 },
  tableHeaderText: { fontSize: 7, fontWeight: 'bold', color: 'white', textTransform: 'uppercase' as const },
  tableRow: { flexDirection: 'row', borderBottom: `1px solid ${light}`, paddingVertical: 4, paddingHorizontal: 6 },
  tableCell: { fontSize: 7, color: black },
  tableCellMuted: { fontSize: 7, color: gray },
  altRow: { backgroundColor: '#fafafa' },
  // Footer
  footer: { position: 'absolute' as const, bottom: 20, left: 36, right: 36, borderTop: `1px solid ${light}`, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between', fontSize: 6, color: gray },
  // Page number
  pageNumber: { position: 'absolute' as const, bottom: 20, right: 36, fontSize: 6, color: gray },
});

function ShipmentTable({ rows, sym }: { rows: Record<string, unknown>[]; sym: string }) {
  return (
    <View>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderText, { width: '16%' }]}>Tracking / Code</Text>
        <Text style={[styles.tableHeaderText, { width: '11%' }]}>Customer</Text>
        <Text style={[styles.tableHeaderText, { width: '10%' }]}>Phone</Text>
        <Text style={[styles.tableHeaderText, { width: '11%' }]}>Email</Text>
        <Text style={[styles.tableHeaderText, { width: '9%' }]}>Destination</Text>
        <Text style={[styles.tableHeaderText, { width: '8%' }]}>Carrier</Text>
        <Text style={[styles.tableHeaderText, { width: '8%' }]}>Branch</Text>
        <Text style={[styles.tableHeaderText, { width: '8%' }]}>Bill Amt</Text>
        <Text style={[styles.tableHeaderText, { width: '8%' }]}>Status</Text>
        <Text style={[styles.tableHeaderText, { width: '7%' }]}>Date</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.altRow : {}]}>
          <View style={{ width: '16%', flexDirection: 'column' }}>
            <Text style={{ fontFamily: 'Courier', fontSize: 6.5, color: black }}>{(r.tracking_no as string) || ''}</Text>
            {(r.label_code as string) ? <Text style={{ fontSize: 5.5, color: gray }}>{(r.label_code as string)}</Text> : null}
          </View>
          <Text style={[styles.tableCell, { width: '11%', fontSize: 6.5 }]}>{(r.customer_name as string) || '\u2014'}</Text>
          <Text style={[styles.tableCell, { width: '10%', fontSize: 6.5 }]}>{(r.customer_phone as string) || '\u2014'}</Text>
          <Text style={[styles.tableCell, { width: '11%', fontSize: 6.5 }]}>{(r.customer_email as string) || '\u2014'}</Text>
          <Text style={[styles.tableCell, { width: '9%', fontSize: 6.5 }]}>{(r.destination as string) || '\u2014'}</Text>
          <Text style={[styles.tableCell, { width: '8%', fontSize: 6.5 }]}>{(r.carrier as string) || '\u2014'}</Text>
          <Text style={[styles.tableCell, { width: '8%', fontSize: 6.5 }]}>{(r.branch_name as string) || '\u2014'}</Text>
          <Text style={[styles.tableCell, { width: '8%', fontSize: 6.5 }]}>{(r.bill_amount as string) && Number(r.bill_amount) > 0 ? `${sym} ${Number(r.bill_amount).toFixed(2)}` : '\u2014'}</Text>
          <Text style={[styles.tableCell, { width: '8%', fontSize: 6.5 }]}>{(r.status as string) || ''}</Text>
          <Text style={[styles.tableCellMuted, { width: '7%', fontSize: 6.5 }]}>{(r.created_at as string)?.slice(5) || ''}</Text>
        </View>
      ))}
    </View>
  );
}

function QuotationTable({ rows, sym }: { rows: Record<string, unknown>[]; sym: string }) {
  return (
    <View>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderText, { width: '20%' }]}>Quote #</Text>
        <Text style={[styles.tableHeaderText, { width: '25%' }]}>Customer</Text>
        <Text style={[styles.tableHeaderText, { width: '15%' }]}>Status</Text>
        <Text style={[styles.tableHeaderText, { width: '15%' }]}>Amount</Text>
        <Text style={[styles.tableHeaderText, { width: '13%' }]}>Valid Until</Text>
        <Text style={[styles.tableHeaderText, { width: '12%' }]}>Date</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.altRow : {}]}>
          <Text style={[styles.tableCell, { width: '20%', fontFamily: 'Courier' }]}>{(r.quote_no as string) || ''}</Text>
          <Text style={[styles.tableCell, { width: '25%' }]}>{(r.customer_name as string) || '\u2014'}</Text>
          <Text style={[styles.tableCell, { width: '15%' }]}>{(r.status as string) || ''}</Text>
          <Text style={[styles.tableCell, { width: '15%' }]}>{sym} {(r.total as string) ? Number(r.total).toFixed(2) : '0.00'}</Text>
          <Text style={[styles.tableCellMuted, { width: '13%' }]}>{(r.valid_until as string)?.slice(5) || '\u2014'}</Text>
          <Text style={[styles.tableCellMuted, { width: '12%' }]}>{(r.created_at as string)?.slice(5) || ''}</Text>
        </View>
      ))}
    </View>
  );
}

type ReportData = {
  title: string;
  subtitle: string;
  summaryCards: { label: string; value: string }[];
  records: Record<string, unknown>[];
  generatedAt: string;
  recordType: 'shipments' | 'quotations';
  tenantName?: string;
  currency?: string;
};

export function ReportDocument({ data }: { data: ReportData }) {
  const sym = currencySymbol(data.currency);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.body}>
          <View style={styles.headerBar}>
            <View style={styles.brandBlock}>
              <Text style={styles.brandName}>{(data.tenantName ?? 'GAJAN TRADERS').toUpperCase()}</Text>
              <Text style={styles.brandTag}>Logistics &amp; Supply Chain</Text>
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.docTitle}>{data.title}</Text>
              <Text style={styles.docSub}>{data.subtitle} | Generated {data.generatedAt}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            {data.summaryCards.map((card, i) => (
              <View key={i} style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{card.label}</Text>
                <Text style={styles.summaryValue}>{card.value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Record Details ({data.records.length} records)</Text>
          {data.recordType === 'shipments' ? (
            <ShipmentTable rows={data.records} sym={sym} />
          ) : (
            <QuotationTable rows={data.records} sym={sym} />
          )}
        </View>

        <Text style={styles.footer}>{(data.tenantName ?? 'Gajan Traders')} — Confidential Report</Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
