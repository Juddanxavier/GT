import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

import { currencySymbol } from '../lib/currency';

const accent = '#22c55e';
const black = '#111827';
const gray = '#6b7280';
const light = '#e5e7eb';

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: black,
  },
  body: {
    padding: '36 44',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingBottom: 16,
    borderBottom: `1px solid ${light}`,
  },
  brandName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: black,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  titleBlock: {
    alignItems: 'flex-end',
  },
  titleLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: accent,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  titleSub: {
    fontSize: 8,
    color: gray,
    marginTop: 2,
  },
  panels: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 28,
  },
  panel: {
    flex: 1,
  },
  panelLabel: {
    fontSize: 7,
    color: gray,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  panelValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: black,
    marginBottom: 2,
  },
  panelSub: {
    fontSize: 8,
    color: gray,
  },
  panelLine: {
    fontSize: 8,
    color: black,
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: `1px solid ${black}`,
    marginBottom: 0,
  },
  tableHeaderCell: {
    fontSize: 7,
    color: gray,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottom: `1px solid ${light}`,
  },
  cellDesc: { flex: 2.5 },
  cellRef: { flex: 2 },
  cellQty: { flex: 0.8, textAlign: 'center' },
  cellRate: { flex: 1.2, textAlign: 'right' },
  cellAmount: { flex: 1.3, textAlign: 'right' },
  cellText: { fontSize: 9, color: black },
  cellMuted: { fontSize: 8, color: gray },
  totals: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    width: '45%',
    justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 9, color: gray },
  totalValue: { fontSize: 9, color: black, fontWeight: 'bold' },
  grandTotalRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    marginTop: 4,
    width: '45%',
    justifyContent: 'space-between',
    borderTop: `1px solid ${accent}`,
  },
  grandLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: black,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grandValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: accent,
  },
  notes: {
    marginTop: 28,
    paddingTop: 12,
    borderTop: `1px solid ${light}`,
  },
  notesLabel: {
    fontSize: 7,
    color: gray,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 8,
    color: gray,
    lineHeight: 1.6,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTop: `1px solid ${light}`,
    fontSize: 7,
    color: gray,
  },
});

type InvoicePdfData = {
  invoiceNo: string;
  trackingNo: string;
  companyName: string;
  amount: string;
  customerName: string;
  createdAt: string;
  paidAt: string;
  currency?: string;
  senderAddress?: Record<string, string>;
  recipientAddress?: Record<string, string>;
  logoBase64?: string | null;
};

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const sym = currencySymbol(data.currency);
  const amt = Number(data.amount);
  const hasGst = data.companyName !== 'Lanka Mahal';
  const gst = hasGst ? Math.round(amt * 0.18) : 0;
  const subtotal = hasGst ? amt - gst : amt;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.body}>
          {/* Header */}
          <View style={styles.header}>
            {data.companyName === 'Lanka Mahal' && data.logoBase64 ? (
              <Image src={data.logoBase64} style={{ width: 50 }} />
            ) : (
              <Text style={styles.brandName}>{data.companyName}</Text>
            )}
            <View style={styles.titleBlock}>
              <Text style={styles.titleLabel}>Invoice</Text>
              <Text style={styles.titleSub}>{data.invoiceNo}</Text>
            </View>
          </View>

          {/* Info Panels */}
          <View style={styles.panels}>
            <View style={styles.panel}>
              <Text style={styles.panelLabel}>Sender</Text>
              <Text style={styles.panelValue}>{data.senderAddress?.name ?? data.customerName}</Text>
              {data.senderAddress?.phone && <Text style={styles.panelLine}>Phone: {data.senderAddress.phone}</Text>}
              {data.senderAddress?.email && <Text style={styles.panelLine}>Email: {data.senderAddress.email}</Text>}
              <Text style={styles.panelLine}>{[data.senderAddress?.street, data.senderAddress?.city, data.senderAddress?.pincode, data.senderAddress?.country].filter(Boolean).join(', ') || '—'}</Text>
            </View>
            <View style={styles.panel}>
              <Text style={styles.panelLabel}>Recipient</Text>
              <Text style={styles.panelValue}>{data.recipientAddress?.name ?? '—'}</Text>
              {data.recipientAddress?.phone && <Text style={styles.panelLine}>Phone: {data.recipientAddress.phone}</Text>}
              {data.recipientAddress?.email && <Text style={styles.panelLine}>Email: {data.recipientAddress.email}</Text>}
              <Text style={styles.panelLine}>{[data.recipientAddress?.street, data.recipientAddress?.city, data.recipientAddress?.pincode, data.recipientAddress?.country].filter(Boolean).join(', ') || '—'}</Text>
            </View>
            <View style={styles.panel}>
              <Text style={styles.panelLabel}>Invoice Details</Text>
              <Text style={styles.panelLine}>Tracking: {data.trackingNo}</Text>
              <Text style={styles.panelLine}>Date: {data.createdAt}</Text>
              <Text style={styles.panelLine}>Status: Paid</Text>
            </View>
          </View>

          {/* Table */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.cellDesc]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.cellRef]}>Reference</Text>
            <Text style={[styles.tableHeaderCell, styles.cellQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.cellRate]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, styles.cellAmount]}>Amount</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.cellText, styles.cellDesc]}>Freight Charges</Text>
            <Text style={[styles.cellMuted, styles.cellRef]}>{data.invoiceNo}</Text>
            <Text style={[styles.cellText, styles.cellQty]}>1</Text>
            <Text style={[styles.cellText, styles.cellRate]}>{sym} {subtotal.toLocaleString('en-IN')}</Text>
            <Text style={[styles.cellText, styles.cellAmount]}>{sym} {subtotal.toLocaleString('en-IN')}</Text>
          </View>

          {hasGst && (
            <View style={styles.tableRow}>
              <Text style={[styles.cellMuted, styles.cellDesc]}>GST @ 18%</Text>
              <Text style={[styles.cellMuted, styles.cellRef]} />
              <Text style={[styles.cellMuted, styles.cellQty]}>1</Text>
              <Text style={[styles.cellMuted, styles.cellRate]}>{sym} {gst.toLocaleString('en-IN')}</Text>
              <Text style={[styles.cellMuted, styles.cellAmount]}>{sym} {gst.toLocaleString('en-IN')}</Text>
            </View>
          )}

          {/* Totals */}
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{sym} {subtotal.toLocaleString('en-IN')}</Text>
            </View>
            {hasGst && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>GST (18%)</Text>
                <Text style={styles.totalValue}>{sym} {gst.toLocaleString('en-IN')}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>{sym} {amt.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            {data.companyName === 'Lanka Mahal' ? (
              <Text style={styles.notesText}>
                {'CUSTOMER LIMITATION OF LIABILITY\n\n'}
                {'The company shall not be held liable for any food items and prohibited items and for any penalties or customs duties that would be imposed by authorities.\n'}
                {'The company shall not be held liable for incorrect information given by customers.\n'}
                {'The company shall not be held accountable for loss, damage or delay caused by events we cannot control.\n\n'}
                {'INSURANCE\n'}
                {'Insurance is available for total loss of parcel (please note that no insurance is payable for damages caused to goods while being transported to the respective destinations).\n'}
                {'Insurance fee is as follows:\n'}
                {'Rs. 1,000 /= for the declared value of 50,000/= or Less.\n'}
                {'For declared values over Rs. 50,000 the insurance fee would be 2% of the declared value.'}
              </Text>
            ) : (
              <Text style={styles.notesText}>
                This is a computer-generated invoice. No signature required. Thank you for your business.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text>{data.companyName}</Text>
          <Text>Invoice {data.invoiceNo}</Text>
        </View>
      </Page>
    </Document>
  );
}
