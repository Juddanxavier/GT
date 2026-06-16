import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { invoices, shipments, tenants, customers } from '../db/schema';
import { InvoiceDocument } from './pdf';

export type InvoiceData = {
  id: string;
  invoiceNo: string;
  shipmentId: string;
  customerId: string;
  amount: string;
  status: string;
  notes: string | null;
  emailCount: number;
  lastEmailSentAt: Date;
  paidAt: Date;
  createdAt: Date;
  trackingNo: string;
  carrier: string | null;
  origin: string | null;
  destination: string | null;
  customerName: string | null;
  companyName: string;
};

export async function getInvoiceByShipmentId(shipmentId: string, tenantId: string): Promise<InvoiceData | null> {
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      shipmentId: invoices.shipmentId,
      customerId: invoices.customerId,
      amount: invoices.amount,
      status: invoices.status,
      notes: invoices.notes,
      emailCount: invoices.emailCount,
      lastEmailSentAt: invoices.lastEmailSentAt,
      paidAt: invoices.paidAt,
      createdAt: invoices.createdAt,
      trackingNo: shipments.trackingNo,
      carrier: shipments.carrier,
      origin: shipments.origin,
      destination: shipments.destination,
      customerName: customers.name,
      companyName: tenants.name,
    })
    .from(invoices)
    .innerJoin(shipments, eq(shipments.id, invoices.shipmentId))
    .innerJoin(tenants, eq(tenants.id, invoices.tenantId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(eq(invoices.shipmentId, shipmentId), eq(invoices.tenantId, tenantId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function getInvoiceData(invoiceId: string, tenantId: string): Promise<InvoiceData | null> {
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      shipmentId: invoices.shipmentId,
      customerId: invoices.customerId,
      amount: invoices.amount,
      status: invoices.status,
      notes: invoices.notes,
      emailCount: invoices.emailCount,
      lastEmailSentAt: invoices.lastEmailSentAt,
      paidAt: invoices.paidAt,
      createdAt: invoices.createdAt,
      trackingNo: shipments.trackingNo,
      carrier: shipments.carrier,
      origin: shipments.origin,
      destination: shipments.destination,
      customerName: customers.name,
      companyName: tenants.name,
    })
    .from(invoices)
    .innerJoin(shipments, eq(shipments.id, invoices.shipmentId))
    .innerJoin(tenants, eq(tenants.id, invoices.tenantId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const doc = <InvoiceDocument data={{
    invoiceNo: data.invoiceNo,
    companyName: data.companyName,
    amount: data.amount,
    customerName: data.customerName ?? '—',
    createdAt: formatDate(data.createdAt),
    paidAt: formatDate(data.paidAt),
  }} />;

  return await renderToBuffer(doc);
}

export function canSendToday(invoice: { emailCount: number; lastEmailSentAt: Date }): boolean {
  const today = new Date();
  const lastSent = new Date(invoice.lastEmailSentAt);
  const sameDay =
    lastSent.getFullYear() === today.getFullYear() &&
    lastSent.getMonth() === today.getMonth() &&
    lastSent.getDate() === today.getDate();

  if (!sameDay) return true;
  return invoice.emailCount < 2;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
