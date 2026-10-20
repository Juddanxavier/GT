import { buildEmailHtml } from '@repo/auth-config';
import { Worker } from 'bullmq';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { invoices as invoiceSchema, notifications, shipments, tenants, user } from '../db/schema';
import { sendEmail } from '../email/provider';
import { renderEmail } from '../email/render';
import type { EventType } from '../email/templates';
import type { Branding, ShipmentData } from '../email/types';
import { generateInvoicePdf, getInvoiceData } from '../invoice/service';
import './webhook-worker';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const lankaLogoDataUri: string | null = (() => {
  try {
    const buf = readFileSync(resolve(process.cwd(), 'public', 'lanka-mahal-logo.webp'));
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
})();
import { checkAndSetIdempotency } from '../notifications/idempotency';
import { isWhatsAppConfigured } from '../notifications/whatsapp/config';
import { getWhatsAppTemplateParams } from '../notifications/whatsapp/templates';
import { eventTypeToPrefCategory, shouldNotifyByEmail, shouldNotifyByWhatsapp } from '../services/notification-prefs';
import { emitToUser } from '../realtime';
import {
  archiveQueue,
  deadLetterQueue,
  emailQueue,
  isRedisConfigured,
  notificationQueue,
  pdfQueue,
  shipmentQueue,
  whatsappQueue,
} from '../queues';
import { bullConnection, bullConnectionOptions, cacheClient } from '../redis';
import { runArchive } from '../services/archive';
import { logAudit } from '../services/audit';
import { performTracking, autoCreateInvoice } from '../services/shipment';
import { childLogger, type Logger } from '../logger';

function getConnection() {
  if (!bullConnectionOptions) {
    throw new Error('BullMQ connection not available — REDIS_URL missing');
  }
  return bullConnectionOptions;
}

function createWorker<T extends Record<string, unknown> = Record<string, unknown>>(
  name: string,
  processor: (data: T, log: Logger) => Promise<void>,
  concurrency: number,
): Worker | null {
  if (!isRedisConfigured()) {
    return null;
  }
  const worker = new Worker<T>(
    name,
    async (job) => {
      const log = childLogger({ jobId: job.id, queue: name });
      log.info('processing job');
      await processor(job.data, log);
    },
    { connection: getConnection(), concurrency },
  );

  worker.on('ready', () => childLogger({ queue: name }).info('worker ready'));
  worker.on('failed', async (job, err) => {
    const log = childLogger({ queue: name, ...(job?.id ? { jobId: job.id } : {}) });
    log.error({ err }, 'job failed');
    if (job && deadLetterQueue && name !== 'dead-letter') {
      await deadLetterQueue.add(name, {
        ...(job.data as Record<string, unknown>),
        queueName: name,
        failedReason: err.message,
        jobId: job.id,
      });
    }
    if (job && ['notification', 'email', 'whatsapp'].includes(name)) {
      await logAudit('NOTIFICATION_FAILED', null, {
        queue: name,
        jobId: job.id,
        failedReason: err.message,
        ...('tenantId' in (job.data as Record<string, unknown>)
          ? { tenantId: (job.data as Record<string, unknown>).tenantId as string }
          : {}),
        ...('to' in (job.data as Record<string, unknown>)
          ? { recipient: (job.data as Record<string, unknown>).to as string }
          : {}),
        ...('shipmentId' in (job.data as Record<string, unknown>)
          ? { shipmentId: (job.data as Record<string, unknown>).shipmentId as string }
          : {}),
        ...('eventType' in (job.data as Record<string, unknown>)
          ? { eventType: (job.data as Record<string, unknown>).eventType as string }
          : {}),
      });
    }
  });
  worker.on('error', (err) => childLogger({ queue: name }).error({ err }, 'worker error'));

  return worker;
}

type NotifyJobData = {
  shipmentId: string;
  eventId: string;
  eventType: EventType;
  tenantId: string;
  trackingNo: string;
  labelCode?: string;
  carrier?: string;
  origin?: string;
  destination?: string;
  estimatedDelivery?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerUserId?: string;
};

// WhatsApp is skipped entirely when MSG91 is not configured. Warn once per
// process so the gap is visible instead of silent.
let warnedWhatsAppUnconfigured = false;

export async function notificationProcessor(job: NotifyJobData, log: Logger): Promise<void> {
  const {
    shipmentId,
    eventId,
    eventType,
    tenantId,
    trackingNo,
    labelCode,
    carrier,
    origin,
    destination,
    estimatedDelivery,
    customerName,
    customerEmail,
    customerPhone,
    customerUserId,
  } = job;

  // In-app notification for the linked customer (admin app stays quote-only)
  if (customerUserId && tenantId) {
    try {
      const alreadyNotified = await checkAndSetIdempotency(eventId, shipmentId, 'in_app', log);
      if (alreadyNotified) {
        log.info({ eventId, shipmentId }, 'skipping duplicate in-app notification');
      } else {
        await db.insert(notifications).values({
          tenantId,
          userId: customerUserId,
          type: 'status_update',
          title: `Shipment ${trackingNo} ${statusLabel(eventType)}`,
          message: `Your shipment ${trackingNo} status changed to ${statusLabel(eventType)}.`,
          link: '/my-shipments',
        });
        emitToUser(customerUserId, 'notification:new', {});
      }
    } catch (err) {
      log.error({ err, shipmentId, eventId }, 'failed to create in-app notification');
    }
  }

  // Respect customer notification preferences when we know the user
  const category = eventTypeToPrefCategory(eventType);
  let emailOn = true;
  let whatsappOn = true;
  if (customerUserId) {
    try {
      const [emailPref, whatsappPref] = await Promise.all([
        shouldNotifyByEmail(customerUserId, tenantId, category),
        shouldNotifyByWhatsapp(customerUserId, tenantId, category),
      ]);
      emailOn = emailPref;
      whatsappOn = whatsappPref;
    } catch (err) {
      log.error({ err, userId: customerUserId }, 'notification pref check failed, sending anyway');
    }
  }

  const shipmentData: ShipmentData = {
    trackingNo,
    labelCode,
    carrier,
    origin,
    destination,
    estimatedDelivery,
    customerName,
    status: eventType ?? 'InTransit',
  };

  // Fetch tenant branding for email templates
  let branding: Branding | undefined;
  try {
    const [tenant] = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (tenant) {
      const isLanka = tenant.name?.toLowerCase().includes('lanka');
      branding = {
        companyName: tenant.name ?? 'Gajan Traders',
        supportEmail: 'support@gajantraders.com',
        primaryColor: isLanka ? '#059669' : '#7c3aed',
        logoUrl: isLanka && lankaLogoDataUri ? lankaLogoDataUri : undefined,
      };
    }
  } catch {
    // non-blocking: templates have built-in fallbacks
  }

  // Fan out: email
  if (customerEmail && emailQueue && emailOn) {
    const emailAlreadySent = await checkAndSetIdempotency(eventId, shipmentId, 'email', log);
    if (!emailAlreadySent) {
      await emailQueue.add('send', {
        to: customerEmail!,
        eventType,
        shipment: shipmentData,
        branding,
      });
    } else {
      log.info({ eventId, shipmentId }, 'skipping duplicate email');
    }
  }

  // Fan out: WhatsApp (queued)
  if (customerPhone && !isWhatsAppConfigured() && !warnedWhatsAppUnconfigured) {
    warnedWhatsAppUnconfigured = true;
    log.warn(
      'whatsapp not configured (MSG91_AUTH_KEY / MSG91_WHATSAPP_SENDER unset) — WhatsApp notifications are being skipped',
    );
  }
  if (customerPhone && isWhatsAppConfigured() && whatsappQueue && whatsappOn) {
    const waAlreadySent = await checkAndSetIdempotency(eventId, shipmentId, 'whatsapp', log);
    if (!waAlreadySent) {
      const waParams = getWhatsAppTemplateParams(eventType, shipmentData);
      if (waParams) {
        await whatsappQueue.add('send', {
          to: customerPhone,
          tenantId,
          ...waParams,
        });
      }
    } else {
      log.info({ eventId, shipmentId }, 'skipping duplicate whatsapp');
    }
  }
}

export const notificationWorker = createWorker<NotifyJobData>(
  'notification',
  notificationProcessor,
  5,
);

function getEmailSubject(eventType: EventType, shipment: ShipmentData): string {
  const ref = shipment.labelCode ?? shipment.trackingNo;
  const map: Record<EventType, string> = {
    InfoReceived: `Shipment ${ref} - Registered`,
    InTransit: `Shipment ${ref} - In Transit`,
    OutForDelivery: `Shipment ${ref} - Out for Delivery`,
    Delivered: `Shipment ${ref} - Delivered`,
    Exception: `Shipment ${ref} - Delivery Exception`,
  };
  return map[eventType] ?? `Shipment ${ref} - Status Update`;
}

const EVENT_LABELS: Record<EventType, string> = {
  InfoReceived: 'Registered',
  InTransit: 'In Transit',
  OutForDelivery: 'Out for Delivery',
  Delivered: 'Delivered',
  Exception: 'Exception',
};

function statusLabel(eventType: EventType): string {
  return EVENT_LABELS[eventType] ?? 'Updated';
}

export type EmailJobData = {
  to?: string;
  eventType?: EventType;
  shipment?: ShipmentData;
  branding?: Branding;
  invoiceId?: string;
  trackingNo?: string;
  pdfBase64?: string;
};

export async function emailProcessor(job: EmailJobData, log: Logger): Promise<void> {
  const { to, eventType, shipment, branding, invoiceId, trackingNo, pdfBase64 } = job;

  if (invoiceId && pdfBase64) {
    const [inv] = await db
      .select({
        invoiceNo: invoiceSchema.invoiceNo,
        tenantId: invoiceSchema.tenantId,
        userId: invoiceSchema.userId,
      })
      .from(invoiceSchema)
      .where(eq(invoiceSchema.id, invoiceId))
      .limit(1);

    if (!inv) {
      log.warn({ invoiceId }, 'invoice not found for email job');
      return;
    }

    const [cust] = await db
      .select({ email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, inv.userId!))
      .limit(1);

    if (!cust?.email) {
      log.warn({ userId: inv.userId }, 'no email address for invoice recipient');
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
      attachments: [
        {
          filename: `${trackingNo ?? inv.invoiceNo}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    }, log);

    await logAudit('NOTIFICATION_SENT', null, {
      channel: 'email',
      type: 'invoice',
      recipient: cust.email,
      invoiceId,
      invoiceNo: inv.invoiceNo,
      tenantId: inv.tenantId,
    });
    return;
  }

  if (!eventType || !shipment || !to) return;

  const html = await renderEmail(eventType, shipment, branding);
  const subject = getEmailSubject(eventType, shipment);
  await sendEmail({ to, subject, html }, log);

  await logAudit('NOTIFICATION_SENT', null, {
    channel: 'email',
    recipient: to,
    eventType,
    trackingNo: shipment.trackingNo,
  });
}

export const emailWorker = createWorker<EmailJobData>('email', emailProcessor, 5);

type WhatsAppJobData = {
  to: string;
  tenantId?: string;
  templateId: string;
  variables: Record<string, string>;
};

const WHATSAPP_RATE_LIMIT = parseInt(process.env.WHATSAPP_RATE_PER_MINUTE ?? '30', 10);

async function checkWhatsAppRateLimit(tenantId?: string): Promise<boolean> {
  if (!tenantId || !cacheClient) return true;
  const key = `whatsapp_rate:${tenantId}:${Math.floor(Date.now() / 60000)}`;
  const count = await cacheClient.incr(key);
  if (count === 1) await cacheClient.expire(key, 70);
  return count <= WHATSAPP_RATE_LIMIT;
}

export const whatsappWorker = createWorker<WhatsAppJobData>(
  'whatsapp',
  async (job, log) => {
    const { to, tenantId, templateId, variables } = job;
    const allowed = await checkWhatsAppRateLimit(tenantId);
    if (!allowed) {
      throw new Error(`WhatsApp rate limit exceeded for tenant ${tenantId}`);
    }
    const { sendWhatsApp } = await import('../notifications/whatsapp/provider');
    await sendWhatsApp({ to, templateId, variables });

    await logAudit('NOTIFICATION_SENT', null, {
      channel: 'whatsapp',
      recipient: to,
      templateId,
      tenantId,
    });
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
  async (job, log) => {
    const { type, invoiceId, tenantId } = job;

    if (type === 'invoice') {
      const data = await getInvoiceData(invoiceId, tenantId);
      if (!data) {
        log.warn({ invoiceId }, 'invoice not found for pdf job');
        return;
      }
      const pdf = await generateInvoicePdf(data);
      if (emailQueue) {
        await emailQueue.add('invoice', {
          invoiceId,
          trackingNo: data.trackingNo,
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
  async (_data, log) => {
    const result = await runArchive();
    log.info(
      {
        archived: result.archived,
        skeletonized: result.skeletonized,
        purged: result.purged,
        notificationsArchived: result.notificationsArchived,
        notificationsSkeletonized: result.notificationsSkeletonized,
        notificationsPurged: result.notificationsPurged,
      },
      'archive run complete',
    );
  },
  1,
);

// Register the daily repeatable job (3 AM) with retries.
async function registerArchiveRepeatable(maxRetries = 3): Promise<void> {
  if (!archiveQueue) return;
  const log = childLogger({ queue: 'archive', type: 'archive-run' });
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await archiveQueue.add(
        'archive-run',
        {},
        {
          repeat: { pattern: '0 3 * * *' },
          removeOnComplete: { age: 86400 * 7, count: 50 },
          removeOnFail: { age: 86400 * 30, count: 100 },
        },
      );
      log.info('repeatable job registered (3 AM daily)');
      return;
    } catch (err) {
      log.error({ err, attempt, maxRetries }, 'failed to register archive repeatable job');
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
}

// Producers fail fast when Redis is unreachable, so these one-shot
// registrations must wait for the shared connection instead of giving up while
// Redis is still starting. Repeatable jobs persist in Redis, so one successful
// registration per process is enough.
function whenRedisReady(run: () => Promise<void>, label: string): void {
  if (!bullConnection) return;
  const attempt = () => {
    run().catch((err) =>
      childLogger({ type: label }).error({ err }, 'repeatable job registration failed'),
    );
  };
  if (bullConnection.status === 'ready') attempt();
  else bullConnection.once('ready', attempt);
}

whenRedisReady(registerArchiveRepeatable, 'archive');

// Register periodic re-tracking (every 2 hours) with retries.
async function registerRetrackingRepeatable(maxRetries = 3): Promise<void> {
  if (!shipmentQueue) return;
  const log = childLogger({ queue: 'shipment', type: 'retrack' });
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await shipmentQueue.add(
        'retrack',
        {},
        {
          repeat: { pattern: '0 */2 * * *' },
          removeOnComplete: { age: 86400 * 7, count: 50 },
          removeOnFail: { age: 86400 * 30, count: 100 },
        },
      );
      log.info('repeatable job registered (every 2 hours)');
      return;
    } catch (err) {
      log.error({ err, attempt, maxRetries }, 'failed to register retrack repeatable job');
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
}

whenRedisReady(registerRetrackingRepeatable, 'retrack');

// Fresh shipments never tracked at all (lost create-time job) get reconciled
// every five minutes instead of waiting for the two-hourly sweep.
async function registerPendingRetrackRepeatable(maxRetries = 3): Promise<void> {
  if (!shipmentQueue) return;
  const log = childLogger({ queue: 'shipment', type: 'retrack-pending' });
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await shipmentQueue.add(
        'retrack-pending',
        {},
        {
          repeat: { pattern: '*/5 * * * *' },
          removeOnComplete: { age: 86400, count: 50 },
          removeOnFail: { age: 86400 * 7, count: 100 },
        },
      );
      log.info('repeatable job registered (every 5 minutes)');
      return;
    } catch (err) {
      log.error({ err, attempt, maxRetries }, 'failed to register pending retrack repeatable job');
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
}

whenRedisReady(async () => {
  await registerPendingRetrackRepeatable();
  // Boot-time catch-up: a shipment created just before a deploy should not wait
  // for the next five-minute tick.
  await shipmentQueue?.add('retrack-pending', {}, {
    removeOnComplete: { age: 3600, count: 10 },
  });
}, 'retrack-pending');

export async function retrackActiveShipments(): Promise<number> {
  if (!shipmentQueue) return 0;

  const rows = await db.execute<{
    id: string; tracking_no: string; tenant_id: string;
    carrier: string | null; courier_code: string | null;
  }>(sql`
    SELECT id, tracking_no, tenant_id, carrier, courier_code
    FROM shipment
    WHERE archived_at IS NULL
      AND status NOT IN ('delivered','expired')
      AND (last_tracked_at IS NULL OR last_tracked_at < NOW() - INTERVAL '6 hours')
    LIMIT 200
  `);

  let enqueued = 0;
  for (const row of rows) {
    if (!shipmentQueue) break;
    await shipmentQueue.add('track', {
      type: 'track',
      shipmentId: row.id,
      tenantId: row.tenant_id,
      trackingNo: row.tracking_no,
      courierCode: row.courier_code,
      carrier: row.carrier,
    });
    enqueued++;
  }

  return enqueued;
}

/**
 * Re-enqueue the first track for shipments that were created but never tracked.
 * A deploy or a Redis blip can drop the create-time job; without this the shipment
 * sits at `pending` until the every-2-hours sweep. `last_tracked_at` is set by the
 * first attempt, so each shipment is picked up here at most once.
 */
export async function retrackPendingShipments(): Promise<number> {
  if (!shipmentQueue) return 0;

  const rows = await db.execute<{
    id: string; tracking_no: string; tenant_id: string;
    carrier: string | null; courier_code: string | null;
  }>(sql`
    SELECT id, tracking_no, tenant_id, carrier, courier_code
    FROM shipment
    WHERE archived_at IS NULL
      AND status = 'pending'
      AND last_tracked_at IS NULL
      AND created_at < NOW() - INTERVAL '2 minutes'
      AND created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at ASC
    LIMIT 100
  `);

  let enqueued = 0;
  for (const row of rows) {
    if (!shipmentQueue) break;
    await shipmentQueue.add('track', {
      type: 'track',
      shipmentId: row.id,
      tenantId: row.tenant_id,
      trackingNo: row.tracking_no,
      courierCode: row.courier_code,
      carrier: row.carrier,
    });
    enqueued++;
  }

  return enqueued;
}

// ── Shipment Worker (tracking + invoice retries) ──

// Job data types for the shipment worker
type ShipmentTrackJobData = {
  shipmentId: string;
  tenantId: string;
  trackingNo: string;
  courierCode?: string;
  carrier?: string;
  origin?: string;
  destination?: string;
  customerName?: string;
  contactEmail?: string;
  contactPhone?: string;
  labelCode?: string;
};

type ShipmentInvoiceJobData = {
  shipmentId: string;
  tenantId: string;
  userId?: string;
  billAmount: number;
};

export const shipmentWorker = createWorker(
  'shipment',
  async (data, log) => {
    // Note: `createWorker` passes `job.data` to the processor, so `data` is the raw payload.
    // We use a `type` discriminator field set by the service to distinguish job types.

    if (data.type === 'track') {
      const trackData = data as unknown as ShipmentTrackJobData;
      const shipment = await db
        .select({ id: shipments.id, trackingNo: shipments.trackingNo, carrier: shipments.carrier })
        .from(shipments)
        .where(eq(shipments.id, trackData.shipmentId))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!shipment) {
        log.warn({ shipmentId: trackData.shipmentId }, 'track job: shipment not found');
        return;
      }

      await performTracking(
        shipment,
        {
          courierCode: trackData.courierCode,
          carrier: trackData.carrier,
          origin: trackData.origin,
          destination: trackData.destination,
          customerName: trackData.customerName,
          contactEmail: trackData.contactEmail,
          contactPhone: trackData.contactPhone,
          labelCode: trackData.labelCode,
        },
        trackData.tenantId,
        log,
      );
      return;
    }

    if (data.type === 'retrack') {
      const count = await retrackActiveShipments();
      log.info({ type: 'retrack', count }, 'enqueued track jobs');
      return;
    }

    if (data.type === 'retrack-pending') {
      const count = await retrackPendingShipments();
      log.info({ type: 'retrack-pending', count }, 'enqueued first-track jobs');
      return;
    }

    if (data.type === 'invoice') {
      const invoiceData = data as unknown as ShipmentInvoiceJobData;
      await autoCreateInvoice(
        { id: invoiceData.shipmentId, trackingNo: '' },
        invoiceData.billAmount,
        invoiceData.tenantId,
        invoiceData.userId,
        log,
      );
      return;
    }

    log.warn({ type: String(data.type) }, 'unknown shipment job type');
  },
  5,
);

export const workers = [
  notificationWorker,
  emailWorker,
  whatsappWorker,
  pdfWorker,
  archiveWorker,
  shipmentWorker,
].filter((w): w is Worker => w !== null);

export function closeWorkers(): Promise<void[]> {
  return Promise.all(workers.map((w) => w.close()));
}
