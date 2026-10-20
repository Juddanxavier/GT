/** @format */

/**
 * Shipment service — encapsulates the shipment creation pipeline with
 * proper transaction boundaries and retryable async operations.
 *
 * Transaction 1 (sync, committed before response):
 *   INSERT shipment + labelCode UPDATE
 *
 * After commit (async, retryable via BullMQ):
 *   - Job 'track':  register with provider → track → insert events → notify → update shipment
 *   - Job 'invoice': create invoice record → queue PDF generation
 *
 * If Redis/BullMQ is unavailable, falls back to synchronous execution
 * to maintain backward compatibility.
 */

import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { invoices, shipments, tenants } from '../db/schema';
import { cacheDel, cacheDelPattern } from '../cache';
import { notifyTrackingEvents } from '../notifications/service';
import { pdfQueue, shipmentQueue } from '../queues';
import { enqueueJob } from '../queues/enqueue';
import { emitToTenant } from '../realtime';
import { getProvider } from '../shipment-providers';
import { insertEvents } from '../shipment-providers/dedup';
import type { Logger } from '../logger';

// ── Types ──

export interface CreateShipmentInput {
  trackingNo: string;
  tenantId: string;
  userId?: string;
  branchId?: string;
  courierCode?: string;
  carrier?: string;
  origin?: string;
  destination?: string;
  senderAddress?: Record<string, unknown>;
  recipientAddress?: Record<string, unknown>;
  status?: string;
  billAmount?: number;
  contactEmail?: string;
  contactPhone?: string;
  customerName?: string;
}

export interface CreateShipmentResult {
  shipment: typeof shipments.$inferSelect;
}

export class DuplicateTrackingError extends Error {
  trackingNo: string;
  constructor(trackingNo: string) {
    super(`Tracking number "${trackingNo}" already exists`);
    this.name = 'DuplicateTrackingError';
    this.trackingNo = trackingNo;
  }
}

// ── Core Creation ──

/**
 * Create a shipment in a transaction, then enqueue async operations.
 *
 * Returns as soon as the DB write is committed. Tracking and invoicing
 * happen in background jobs with automatic retry (3 attempts, exponential backoff).
 *
 * If no Redis is available, runs tracking + invoice synchronously as a fallback.
 */
export async function createShipment(
  input: CreateShipmentInput,
  log: Logger,
): Promise<CreateShipmentResult> {
  // ── Transaction 1: Core creation ──
  // This is the only synchronous DB operation. It must succeed before we respond.
  let row: typeof shipments.$inferSelect | undefined;
  let labelCode: string | undefined;

  try {
    await db.transaction(async (tx) => {
      [row] = await tx
        .insert(shipments)
        .values({
          tenantId: input.tenantId,
          trackingNo: input.trackingNo,
        userId: input.userId,
        branchId: input.branchId,
        courierCode: input.courierCode,
        carrier: input.carrier,
        origin: input.origin,
        destination: input.destination,
        senderAddress: input.senderAddress,
        recipientAddress: input.recipientAddress,
        status: input.status ?? 'pending',
        billAmount: input.billAmount ? String(input.billAmount) : undefined,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        customerName: input.customerName,
      })
      .returning();

    if (!row) throw new Error('Failed to insert shipment');

    labelCode = `GT-${row.id.slice(0, 7).toUpperCase()}`;
    // Return the updated row, not the pre-update insert result, so the create
    // response already carries labelCode.
    [row] = await tx
      .update(shipments)
      .set({ labelCode, updatedAt: new Date() })
      .where(eq(shipments.id, row.id))
      .returning();

    if (!row) throw new Error('Failed to apply label code');
    });
  } catch (err) {
    // Postgres unique_violation (23505) on the tracking number index.
    // The route pre-checks this, but a race or archived-row reuse can still hit it.
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      throw new DuplicateTrackingError(input.trackingNo);
    }
    throw err;
  }

  // The transaction returned `row` with the labelCode update applied.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const created = row!;

  // A new row changes every list page and the dashboard counts. Unscoped
  // superadmin views are cached under the "__all__" pseudo-tenant, so bust
  // that namespace too or the table keeps serving a list without the row.
  await Promise.all([
    cacheDelPattern(input.tenantId, 'shipments:list:*'),
    cacheDelPattern(input.tenantId, 'dashboard:*'),
    cacheDelPattern('__all__', 'shipments:list:*'),
    cacheDelPattern('__all__', 'dashboard:*'),
  ]);

  // ── Async operations ──
  // These are fire-and-forget from the request perspective.
  // BullMQ retries them automatically on failure (3 attempts, exponential backoff).

  if (shipmentQueue) {
    // Redis configured — enqueue background jobs. enqueueJob bounds the wait:
    // if Redis is unreachable the shipment is still returned to the caller and
    // the 2-hourly retrack sweep picks it up.
    const queued = await enqueueJob(shipmentQueue, 'track', {
      type: 'track',
      shipmentId: created.id,
      tenantId: input.tenantId,
      trackingNo: input.trackingNo,
      courierCode: input.courierCode,
      carrier: input.carrier,
      customerName: input.customerName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      labelCode,
      origin: input.origin,
      destination: input.destination,
    }, log);

    if (!queued) {
      log.error(
        { shipmentId: created.id, trackingNo: input.trackingNo },
        'tracking job not queued; shipment saved, retrack sweep will pick it up',
      );
    }

    if (input.billAmount != null && input.billAmount > 0) {
      await enqueueJob(shipmentQueue, 'invoice', {
        type: 'invoice',
        shipmentId: created.id,
        tenantId: input.tenantId,
        userId: input.userId,
        billAmount: input.billAmount,
      }, log);
    }
  } else {
    // No Redis — run synchronously (current behavior)
    await performTracking(
      created,
      {
        courierCode: input.courierCode,
        carrier: input.carrier,
        origin: input.origin,
        destination: input.destination,
        customerName: input.customerName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        labelCode,
      },
      input.tenantId,
      log,
    );

    if (input.billAmount != null && input.billAmount > 0) {
      await autoCreateInvoice(created, input.billAmount, input.tenantId, input.userId, log);
    }
  }

  emitToTenant(input.tenantId, 'dashboard:update', {});

  return { shipment: created };
}

// ── Async: Tracking (register + track + events + notify + update) ──

export interface TrackingJobData {
  shipmentId: string;
  tenantId: string;
  trackingNo: string;
  courierCode?: string;
  carrier?: string;
  customerName?: string;
  contactEmail?: string;
  contactPhone?: string;
  labelCode?: string;
  origin?: string;
  destination?: string;
}

/**
 * Register shipment with the tracking provider, fetch initial tracking data,
 * insert deduplicated events, trigger notifications, and update the shipment record.
 *
 * This is designed to run as a BullMQ job with automatic retry.
 */
export async function performTracking(
  shipment: { id: string; trackingNo: string; carrier?: string | null },
  extra: {
    courierCode?: string;
    carrier?: string;
    origin?: string;
    destination?: string;
    customerName?: string;
    contactEmail?: string;
    contactPhone?: string;
    labelCode?: string;
  },
  tenantId: string,
  log: Logger,
): Promise<void> {
  try {
    const provider = getProvider();
    const courierCode = extra.courierCode;
    const carrierName = extra.carrier;

    // 1. Register with tracking provider (17TRACK auto-detects carrier from tracking number)
    if (provider.registerShipment) {
      const [tenant] = await db
        .select({ name: tenants.name, country: tenants.country })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      await provider.registerShipment({
        trackingNo: shipment.trackingNo,
        orderNo: extra.labelCode,
        courierCode,
        customerName: extra.customerName ?? undefined,
        email: extra.contactEmail ?? undefined,
        phone: extra.contactPhone ?? undefined,
        companyName: tenant?.name ?? undefined,
        countryName: tenant?.country ?? undefined,
      }, log);
    }

    // 2. Fetch tracking data (17TRACK auto-detects carrier)
    const trackResult = await provider.track(
      shipment.trackingNo,
      undefined,
      log,
    );

    // 3. Insert deduplicated events
    const inserted = await insertEvents(shipment.id, tenantId, trackResult.events);

    // 4. Trigger notifications for new events
    if (inserted > 0) {
      notifyTrackingEvents(shipment.id, tenantId, trackResult.events, trackResult.currentStatus, log);
    }

    // Admin-entered origin/destination win; carrier metadata only fills gaps.
    // Read the current row because job data can predate an admin edit.
    const [current] = await db
      .select({ origin: shipments.origin, destination: shipments.destination })
      .from(shipments)
      .where(eq(shipments.id, shipment.id))
      .limit(1);

    // 5. Update shipment with tracking data
    const updateData: Record<string, unknown> = {
      status: trackResult.currentStatus,
      trackingProvider: provider.name,
      lastTrackedAt: new Date(),
      trackingRegistered: inserted > 0,
      updatedAt: new Date(),
      origin: current?.origin ?? extra.origin ?? trackResult.origin ?? null,
      destination: current?.destination ?? extra.destination ?? trackResult.destination ?? null,
      estimatedDelivery: trackResult.estimatedDelivery
        ? new Date(trackResult.estimatedDelivery)
        : null,
      actualDelivery: trackResult.actualDelivery ? new Date(trackResult.actualDelivery) : null,
    };

    if (trackResult.events.length > 0) {
      updateData.carrier = trackResult.events[0]?.carrier || carrierName || null;
    } else if (carrierName) {
      updateData.carrier = carrierName;
    }

    await db.update(shipments).set(updateData).where(eq(shipments.id, shipment.id));

    // Invalidate caches so list and detail pages reflect the updated status/tracking
    await cacheDel(tenantId, `shipments:${shipment.id}`);
    await cacheDel(tenantId, `shipments:${shipment.id}:tracking`);
    await cacheDelPattern(tenantId, 'shipments:list:*');
    await cacheDelPattern(tenantId, 'dashboard:*');
  } catch (err) {
    // Log and rethrow — BullMQ will retry with backoff
    log.error({ err, shipmentId: shipment.id, trackingNo: shipment.trackingNo }, 'tracking failed');
    throw err;
  }
}

// ── Async: Invoice creation ──

export interface InvoiceJobData {
  shipmentId: string;
  tenantId: string;
  userId?: string;
  billAmount: number;
}

/**
 * Auto-create an invoice for a shipment when billAmount is set.
 * Runs as a BullMQ job with retry.
 *
 * Fixes T001: emailCount starts at 0 (not 1) since no email is sent.
 */
export async function autoCreateInvoice(
  shipment: { id: string; trackingNo: string },
  billAmount: number,
  tenantId: string,
  userId: string | undefined,
  log: Logger,
): Promise<void> {
  try {
    // Check for existing invoice (idempotency)
    const [existingInv] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.shipmentId, shipment.id))
      .limit(1);

    if (existingInv) return;

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const shortId = shipment.id.slice(0, 5).toUpperCase();
    const invoiceNo = `INV-${y}${m}-${shortId}`;

    const [_tenantRow] = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const [inv] = await db
      .insert(invoices)
      .values({
        tenantId,
        shipmentId: shipment.id,
        userId: userId ?? null,
        invoiceNo,
        amount: String(billAmount),
        // New invoices start unpaid; paidAt is set when payment is recorded.
        status: 'unpaid',
        emailCount: 0, // Fixed: no email sent on auto-creation
        lastEmailSentAt: now,
      })
      .returning();

    if (inv && pdfQueue) {
      await pdfQueue.add('invoice', {
        type: 'invoice',
        invoiceId: inv.id,
        tenantId,
      });
    }
  } catch (err) {
    log.error({ err, shipmentId: shipment.id }, 'invoice creation failed');
    throw err;
  }
}

/**
 * Regenerate invoice when an admin edits a shipment's billAmount.
 * Updates the existing invoice amount and re-queues PDF generation.
 * If no invoice exists and billAmount > 0, creates one.
 */
export async function regenerateInvoice(
  shipmentId: string,
  billAmount: number,
  tenantId: string,
  userId: string | undefined,
  log: Logger,
): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: invoices.id, invoiceNo: invoices.invoiceNo })
      .from(invoices)
      .where(eq(invoices.shipmentId, shipmentId))
      .limit(1);

    if (existing) {
      await db
        .update(invoices)
        .set({ amount: String(billAmount), updatedAt: new Date() })
        .where(eq(invoices.id, existing.id));

      await cacheDelPattern(tenantId, 'invoices:*');

      if (pdfQueue) {
        await pdfQueue.add('invoice', {
          type: 'invoice',
          invoiceId: existing.id,
          tenantId,
        });
      }
    } else if (billAmount > 0) {
      await autoCreateInvoice(
        { id: shipmentId, trackingNo: '' },
        billAmount,
        tenantId,
        userId,
        log,
      );
    }
  } catch (err) {
    log.error({ err, shipmentId }, 'invoice regeneration failed');
  }
}
