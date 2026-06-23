import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { bullConnectionOptions } from '../redis';
import { db } from '../db';
import { isRedisConnected, notificationQueue, emailQueue, whatsappQueue, pdfQueue, archiveQueue, deadLetterQueue } from '../queues';
import type { EventType } from '../email/templates';
import { renderEmail } from '../email/render';
import { sendEmail } from '../email/provider';
import { buildEmailHtml } from '../email/build-html';
import type { Branding, ShipmentData } from '../email/types';
import { checkAndSetIdempotency } from '../notifications/idempotency';
import { isWhatsAppConfigured } from '../notifications/whatsapp/config';
import { getWhatsAppTemplateParams } from '../notifications/whatsapp/templates';
import { invoices as invoiceSchema, shipments, customers } from '../db/schema';
import { runArchive } from '../services/archive';
import { generateInvoicePdf, getInvoiceData } from '../invoice/service';

function getConnection() {
  if (!bullConnectionOptions) {
    throw new Error('BullMQ connection not available — REDIS_URL missing');
  }
  return bullConnectionOptions;
}

function createWorker<T = unknown>(
  name: string,
  processor: (job: { id?: string; data: T }) => Promise<void>,
  concurrency: number,
): Worker | null {
  if (!isRedisConnected()) {
    return null;
  }
  const worker = new Worker<T>(
    name,
    async (job) => {
      console.log(`[worker/${name}] processing job ${job.id}:`, job.data);
      await processor(job);
    },
    { connection: getConnection(), concurrency },
  );

  worker.on('ready', () => console.log(`[worker] ${name} ready`));
  worker.on('failed', async (job, err) => {
    console.error(`[worker] ${name} job ${job?.id} failed:`, err.message);
    if (job && deadLetterQueue && name !== 'dead-letter') {
      await deadLetterQueue.add(name, {
        ...job.data,
        queueName: name,
        failedReason: err.message,
      });
    }
  });
  worker.on('error', (err) => console.error(`[worker] ${name} error:`, err.message));

  return worker;
}

type NotifyJobData = {
  shipmentId: string;
  eventId: string;
  eventType: EventType;
  tenantId: string;
  trackingNo: string;
};

export async function notificationProcessor(job: NotifyJobData): Promise<void> {
  const { shipmentId, eventId, eventType, tenantId, trackingNo } = job;

  const ship = await db
    .select({
      trackingNo: shipments.trackingNo,
      carrier: shipments.carrier,
      origin: shipments.origin,
      destination: shipments.destination,
      estimatedDelivery: shipments.estimatedDelivery,
      status: shipments.status,
      customerId: shipments.customerId,
    })
    .from(shipments)
    .where(eq(shipments.id, shipmentId))
    .limit(1);

  if (!ship.length) {
    console.warn(`[notifications] Shipment ${shipmentId} not found`);
    return;
  }

  const s = ship[0]!;
  let customerName: string | null = null;
  let customerEmail: string | null = null;
  let customerPhone: string | null = null;

  if (s.customerId) {
    const cust = await db
      .select({ name: customers.name, email: customers.email, phone: customers.phone })
      .from(customers)
      .where(eq(customers.id, s.customerId))
      .limit(1);
    if (cust.length) {
      customerName = cust[0]!.name;
      customerEmail = cust[0]!.email;
      customerPhone = cust[0]!.phone;
    }
  }

  const shipmentData: ShipmentData = {
    trackingNo: s.trackingNo,
    carrier: s.carrier ?? undefined,
    origin: s.origin ?? undefined,
    destination: s.destination ?? undefined,
    estimatedDelivery: s.estimatedDelivery?.toISOString() ?? undefined,
    customerName: customerName ?? undefined,
    status: eventType,
  };

  // Fan out: email
  if (customerEmail && emailQueue) {
    const emailAlreadySent = await checkAndSetIdempotency(eventId, shipmentId, 'email');
    if (!emailAlreadySent) {
      await emailQueue.add('send', {
        to: customerEmail,
        eventType,
        shipment: shipmentData,
      });
    } else {
      console.log(`[notifications] Skipping duplicate email for event ${eventId} / shipment ${shipmentId}`);
    }
  }

  // Fan out: WhatsApp (queued)
  if (customerPhone && isWhatsAppConfigured() && whatsappQueue) {
    const waAlreadySent = await checkAndSetIdempotency(eventId, shipmentId, 'whatsapp');
    if (!waAlreadySent) {
      const waParams = getWhatsAppTemplateParams(eventType, shipmentData);
      if (waParams) {
        await whatsappQueue.add('send', {
          to: customerPhone,
          ...waParams,
        });
      }
    } else {
      console.log(`[notifications] Skipping duplicate WhatsApp for event ${eventId} / shipment ${shipmentId}`);
    }
  }
}

export const notificationWorker = createWorker<NotifyJobData>(
  'notification',
  notificationProcessor,
  5,
);

function getEmailSubject(eventType: EventType, shipment: ShipmentData): string {
  const map: Record<EventType, string> = {
    InfoReceived: `Shipment ${shipment.trackingNo} - Picked Up`,
    InTransit: `Shipment ${shipment.trackingNo} - In Transit`,
    OutForDelivery: `Shipment ${shipment.trackingNo} - Out for Delivery`,
    Delivered: `Shipment ${shipment.trackingNo} - Delivered`,
    Exception: `Shipment ${shipment.trackingNo} - Delivery Exception`,
  };
  return map[eventType] ?? `Shipment ${shipment.trackingNo} - Status Update`;
}

type EmailJobData = {
  to?: string;
  eventType?: EventType;
  shipment?: ShipmentData;
  branding?: Branding;
  invoiceId?: string;
  pdfBase64?: string;
};

export async function emailProcessor(job: EmailJobData): Promise<void> {
  const { to, eventType, shipment, branding, invoiceId, pdfBase64 } = job;

  if (invoiceId && pdfBase64) {
    const [inv] = await db
      .select({
        invoiceNo: invoiceSchema.invoiceNo,
        tenantId: invoiceSchema.tenantId,
        customerId: invoiceSchema.customerId,
      })
      .from(invoiceSchema)
      .where(eq(invoiceSchema.id, invoiceId))
      .limit(1);

    if (!inv) {
      console.warn(`[email] Invoice ${invoiceId} not found`);
      return;
    }

    const [cust] = await db
      .select({ email: customers.email, name: customers.name })
      .from(customers)
      .where(eq(customers.id, inv.customerId))
      .limit(1);

    if (!cust?.email) {
      console.warn(`[email] No email for customer ${inv.customerId}`);
      return;
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    await sendEmail({
      to: cust.email,
      subject: `Invoice ${inv.invoiceNo} from Gajan Traders`,
      html: buildEmailHtml({
        title: 'Invoice',
        bodyHtml: `<table role="presentation" style="width:100%">
          <tr>
            <td style="text-align:center;padding-bottom:16px">
              <p style="font-size:13px;margin:0 0 4px;color:#52525b">Dear ${cust.name ?? 'Customer'},</p>
              <p style="font-size:13px;margin:0;color:#52525b">Invoice <strong style="color:#18181b">${inv.invoiceNo}</strong> is attached as a PDF.</p>
            </td>
          </tr>
          <tr>
            <td style="text-align:center;padding:8px 0">
              <p style="font-size:11px;margin:0;color:#a1a1aa">Please review the attached document for details.</p>
            </td>
          </tr>
        </table>`,
      }),
      attachments: [{
        filename: `invoice-${inv.invoiceNo}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });
    return;
  }

  if (!eventType || !shipment || !to) return;

  const html = await renderEmail(eventType, shipment, branding);
  const subject = getEmailSubject(eventType, shipment);
  await sendEmail({ to, subject, html });
}

export const emailWorker = createWorker<EmailJobData>(
  'email',
  emailProcessor,
  5,
);

type WhatsAppJobData = {
  to: string;
  templateId: string;
  variables: Record<string, string>;
};

export const whatsappWorker = createWorker<WhatsAppJobData>(
  'whatsapp',
  async (job) => {
    const { to, templateId, variables } = job.data;
    const { sendWhatsApp } = await import('../notifications/whatsapp/provider');
    await sendWhatsApp({ to, templateId, variables });
  },
  3,
);

type PdfJobData = {
  type: 'invoice';
  invoiceId: string;
  tenantId: string;
};

export const pdfWorker = createWorker<PdfJobData>(
  'pdf',
  async (job) => {
    const { type, invoiceId, tenantId } = job.data;

    if (type === 'invoice') {
      const data = await getInvoiceData(invoiceId, tenantId);
      if (!data) {
        console.warn(`[pdf] Invoice ${invoiceId} not found`);
        return;
      }
      const pdf = await generateInvoicePdf(data);
      if (emailQueue) {
        await emailQueue.add('invoice', {
          invoiceId,
          pdfBase64: pdf.toString('base64'),
        });
      }
    }
  },
  2,
);

type ArchiveJobData = Record<string, never>;

export const archiveWorker = createWorker<ArchiveJobData>(
  'archive',
  async () => {
    const result = await runArchive();
    console.log(`[worker/archive] done — archived ${result.archived}, skeletonized ${result.skeletonized}, purged ${result.purged}`);
  },
  1,
);

// Register the daily repeatable job (3 AM). BullMQ deduplicates by name + pattern.
archiveQueue?.add('archive-run', {}, {
  repeat: { pattern: '0 3 * * *' },
  removeOnComplete: { age: 86400 * 7, count: 50 },
  removeOnFail: { age: 86400 * 30, count: 100 },
}).catch((err: Error) => console.error('[archive] failed to register repeatable job:', err.message));

export const workers = [
  notificationWorker,
  emailWorker,
  whatsappWorker,
  pdfWorker,
  archiveWorker,
]
  .filter((w): w is Worker => w !== null);

export function closeWorkers(): Promise<void[]> {
  return Promise.all(workers.map((w) => w.close()));
}
