import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { bullConnection } from '../redis';
import { db } from '../db';
import { isRedisConnected, notificationQueue, emailQueue, whatsappQueue, pdfQueue, deadLetterQueue } from '../queues';
import type { EventType } from '../email/templates';
import { renderEmail } from '../email/render';
import { sendEmail } from '../email/provider';
import type { Branding, ShipmentData } from '../email/types';
import { checkAndSetIdempotency } from '../notifications/idempotency';
import { isWhatsAppConfigured } from '../notifications/whatsapp/config';
import { getWhatsAppTemplateParams } from '../notifications/whatsapp/templates';
import { invoices as invoiceSchema, shipments, customers } from '../db/schema';
import { generateInvoicePdf, getInvoiceData } from '../invoice/service';

function getConnection() {
  if (!bullConnection) {
    throw new Error('BullMQ connection not available — UPSTASH_REDIS_URL missing');
  }
  return bullConnection;
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

export const notificationWorker = createWorker<NotifyJobData>(
  'notification',
  async (job) => {
    const { shipmentId, eventId, eventType, tenantId, trackingNo } = job.data;

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
  },
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

export const emailWorker = createWorker<EmailJobData>(
  'email',
  async (job) => {
    const { to, eventType, shipment, branding, invoiceId, pdfBase64 } = job.data;

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
        html: `<p>Dear ${cust.name ?? 'Customer'},</p><p>Please find your invoice attached.</p>`,
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
  },
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

export const workers = [
  notificationWorker,
  emailWorker,
  whatsappWorker,
  pdfWorker,
]
  .filter((w): w is Worker => w !== null);

export function closeWorkers(): Promise<void[]> {
  return Promise.all(workers.map((w) => w.close()));
}
