import { Hono } from 'hono';
import { eq, and, desc, like, sql } from 'drizzle-orm';
import { db } from '../db';
import { shipments, trackingEvents, tenants, invoices, customers } from '../db/schema';
import { requireRole } from '../middleware/authorization';
import { createShipmentSchema, updateShipmentSchema } from '../validators';
import type { AppVariables } from './types';
import { getProvider } from '../shipment-providers';
import { insertEvents } from '../shipment-providers/dedup';
import { emailQueue, pdfQueue } from '../queues';
import { notifyTrackingEvents } from '../notifications/service';
import { emitToTenant } from '../realtime';

const app = new Hono<{ Variables: AppVariables }>();

app.get('/', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const status = c.req.query('status');
  const customerId = c.req.query('customerId');
  const search = c.req.query('search');

  const conditions = [eq(shipments.tenantId, tenantId)];
  if (status) conditions.push(eq(shipments.status, status));
  if (customerId) conditions.push(eq(shipments.customerId, customerId));
  if (search) conditions.push(sql`${like(shipments.trackingNo, `%${search}%`)}`);

  const rows = await db
    .select()
    .from(shipments)
    .where(and(...conditions))
    .orderBy(desc(shipments.createdAt));

  return c.json({ data: rows });
});

app.post('/detect', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const { trackingNo } = await c.req.json<{ trackingNo?: string }>();
  if (!trackingNo) return c.json({ error: 'trackingNo required' }, 400);

  const provider = getProvider();
  let detected: { key: string; name: string } | null = null;
  try {
    detected = await provider.detectCarrier(trackingNo);
  } catch { /* ignore */ }

  return c.json({ data: { detected } });
});

app.post('/', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const parsed = createShipmentSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors)
      .map(([k, v]) => `${k}: ${v?.join(', ')}`)
      .join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const [row] = await db
    .insert(shipments)
    .values({ ...parsed.data, tenantId } as never)
    .returning();

  if (!row) return c.json({ error: 'Failed to create shipment' }, 500);

  const labelCode = `GT-${row.id.slice(0, 7).toUpperCase()}`;
  await db.update(shipments).set({ labelCode, updatedAt: new Date() }).where(eq(shipments.id, row.id));

  try {
    const provider = getProvider();
    const courierCode = parsed.data.courierCode;
    const carrierName = parsed.data.carrier;

    if (provider.registerShipment && courierCode) {
      const [tenant] = await db
        .select({ name: tenants.name, country: tenants.country })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      await provider.registerShipment({
        trackingNo: row.trackingNo,
        orderNo: labelCode,
        courierCode,
        customerName: parsed.data.customerName ?? undefined,
        email: parsed.data.contactEmail ?? undefined,
        phone: parsed.data.contactPhone ?? undefined,
        companyName: tenant?.name ?? undefined,
        countryName: tenant?.country ?? undefined,
      });
    }

    const trackResult = await provider.track(row.trackingNo, courierCode ?? carrierName ?? undefined);
    const inserted = await insertEvents(row.id, tenantId, trackResult.events);

    if (inserted > 0) {
      notifyTrackingEvents(row.id, tenantId, trackResult.events, trackResult.currentStatus);
    }

    const updateData: Record<string, unknown> = {
      status: trackResult.currentStatus,
      trackingProvider: provider.name,
      lastTrackedAt: new Date(),
      trackingRegistered: inserted > 0,
      updatedAt: new Date(),
      payload: trackResult.events,
      origin: trackResult.origin ?? parsed.data.origin ?? null,
      destination: trackResult.destination ?? parsed.data.destination ?? null,
      estimatedDelivery: trackResult.estimatedDelivery ? new Date(trackResult.estimatedDelivery) : null,
      actualDelivery: trackResult.actualDelivery ? new Date(trackResult.actualDelivery) : null,
    };
    if (trackResult.events.length > 0) {
      updateData.carrier = trackResult.events[0]!.carrier || carrierName || null;
    } else if (carrierName) {
      updateData.carrier = carrierName;
    }
    await db.update(shipments).set(updateData).where(eq(shipments.id, row.id));
  } catch (err) {
    console.error('[shipments] auto-track failed:', err);
  }

  // Auto-create invoice
  try {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const shortId = row.id.slice(0, 5).toUpperCase();
    const invoiceNo = `INV-${y}${m}-${shortId}`;
    const amount = parsed.data.billAmount ?? 0;

    const [tenantRow] = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const [inv] = await db
      .insert(invoices)
      .values({
        tenantId,
        shipmentId: row.id,
        customerId: parsed.data.customerId ?? '',
        invoiceNo,
        amount: String(amount),
        status: 'paid',
        emailCount: 1,
        paidAt: now,
        lastEmailSentAt: now,
      } as never)
      .returning();

    if (inv && pdfQueue) {
      await pdfQueue.add('invoice', {
        type: 'invoice',
        invoiceId: inv.id,
        tenantId,
      });
    }
  } catch (err) {
    console.error('[shipments] auto-invoice failed:', err);
  }

  const [updated] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.id, row.id))
    .limit(1);

  emitToTenant(tenantId, 'dashboard:update', {}).catch(() => {});

  return c.json({ data: updated ?? row }, 201);
});

app.get('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const [row] = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId)))
    .limit(1);

  if (!row) return c.json({ error: 'Shipment not found' }, 404);
  return c.json({ data: row });
});

app.patch('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const user = c.get('user');
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const parsed = updateShipmentSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors)
      .map(([k, v]) => `${k}: ${v?.join(', ')}`)
      .join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  if (user?.role === 'staff' && parsed.data.billAmount !== undefined) {
    return c.json({ error: 'Only admins can change bill amount' }, 403);
  }

  const [existing] = await db
    .select({ trackingNo: shipments.trackingNo, carrier: shipments.carrier })
    .from(shipments)
    .where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId)))
    .limit(1);

  if (!existing) return c.json({ error: 'Shipment not found' }, 404);

  const trackingChanged = parsed.data.trackingNo && parsed.data.trackingNo !== existing.trackingNo;
  const carrierChanged = parsed.data.carrier && parsed.data.carrier !== existing.carrier;

  const updateData = { ...parsed.data, updatedAt: new Date() } as never;
  const [row] = await db
    .update(shipments)
    .set(updateData)
    .where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId)))
    .returning();

  if (!row) return c.json({ error: 'Shipment not found' }, 404);

  if (trackingChanged || carrierChanged) {
    try {
      const provider = getProvider();
      const trackingNo = parsed.data.trackingNo ?? existing.trackingNo;
      const carrier = parsed.data.carrier ?? existing.carrier ?? undefined;

      if (provider.registerShipment) {
        const courierCode = parsed.data.courierCode;
        if (courierCode) {
          const [tenant] = await db
            .select({ name: tenants.name, country: tenants.country })
            .from(tenants)
            .where(eq(tenants.id, tenantId))
            .limit(1);

          await provider.registerShipment({
            trackingNo,
            orderNo: row.labelCode ?? undefined,
            courierCode,
            customerName: row.customerId ?? undefined,
            companyName: tenant?.name ?? undefined,
            countryName: tenant?.country ?? undefined,
          });
        }
      }

      const trackResult = await provider.track(trackingNo, carrier);
      const inserted = await insertEvents(row.id, tenantId, trackResult.events);

      if (inserted > 0) {
        notifyTrackingEvents(row.id, tenantId, trackResult.events, trackResult.currentStatus);
      }

      const trackUpdate: Record<string, unknown> = {
        status: trackResult.currentStatus,
        lastTrackedAt: new Date(),
        trackingRegistered: inserted > 0,
        updatedAt: new Date(),
        payload: trackResult.events,
        origin: trackResult.origin ?? row.origin ?? null,
        destination: trackResult.destination ?? row.destination ?? null,
        estimatedDelivery: trackResult.estimatedDelivery ? new Date(trackResult.estimatedDelivery) : null,
        actualDelivery: trackResult.actualDelivery ? new Date(trackResult.actualDelivery) : null,
      };
      if (trackResult.events.length > 0) {
        trackUpdate.carrier = trackResult.events[0]!.carrier || carrier || null;
      }
      await db.update(shipments).set(trackUpdate).where(eq(shipments.id, row.id));
    } catch (err) {
      console.error('[shipments] re-track on edit failed:', err);
    }
  }

  const [final] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.id, row.id))
    .limit(1);

  emitToTenant(tenantId, 'dashboard:update', {}).catch(() => {});

  return c.json({ data: final ?? row });
});

app.delete('/:id', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const [row] = await db
    .delete(shipments)
    .where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId)))
    .returning();

  if (!row) return c.json({ error: 'Shipment not found' }, 404);
  emitToTenant(tenantId, 'dashboard:update', {}).catch(() => {});
  return c.json({ data: row });
});

app.get('/:id/tracking', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const [shipment] = await db
    .select({
      id: shipments.id,
      status: shipments.status,
      trackingRegistered: shipments.trackingRegistered,
      lastTrackedAt: shipments.lastTrackedAt,
      trackingProvider: shipments.trackingProvider,
    })
    .from(shipments)
    .where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId)))
    .limit(1);

  if (!shipment) return c.json({ error: 'Shipment not found' }, 404);

  const events = await db
    .select()
    .from(trackingEvents)
    .where(and(
      eq(trackingEvents.shipmentId, id),
      eq(trackingEvents.tenantId, tenantId),
    ))
    .orderBy(desc(trackingEvents.eventTime));

  return c.json({ data: { shipment, events } });
});

app.get('/:id/detect-carrier', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const [shipment] = await db
    .select({ trackingNo: shipments.trackingNo })
    .from(shipments)
    .where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId)))
    .limit(1);

  if (!shipment) return c.json({ error: 'Shipment not found' }, 404);

  try {
    const provider = getProvider();
    const carrier = await provider.detectCarrier(shipment.trackingNo);
    return c.json({ data: carrier });
  } catch (err) {
    console.error('[shipments] detect-carrier failed:', err);
    return c.json({ error: 'Carrier detection failed' }, 500);
  }
});

app.post('/:id/track', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const [shipment] = await db
    .select({
      id: shipments.id,
      trackingNo: shipments.trackingNo,
      carrier: shipments.carrier,
      origin: shipments.origin,
      destination: shipments.destination,
    })
    .from(shipments)
    .where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId)))
    .limit(1);

  if (!shipment) return c.json({ error: 'Shipment not found' }, 404);

  try {
    const provider = getProvider();
    const result = await provider.track(shipment.trackingNo, shipment.carrier ?? undefined);
    const inserted = await insertEvents(shipment.id, tenantId, result.events);

    if (inserted > 0) {
      notifyTrackingEvents(shipment.id, tenantId, result.events, result.currentStatus);
    }

    const updateFields: Record<string, unknown> = {
      status: result.currentStatus,
      lastTrackedAt: new Date(),
      trackingRegistered: true,
      updatedAt: new Date(),
      payload: result.events,
      origin: result.origin ?? shipment.origin ?? null,
      destination: result.destination ?? shipment.destination ?? null,
      estimatedDelivery: result.estimatedDelivery ? new Date(result.estimatedDelivery) : null,
      actualDelivery: result.actualDelivery ? new Date(result.actualDelivery) : null,
    };
    if (result.events.length > 0) {
      updateFields.carrier = result.events[0]!.carrier;
    }
    await db.update(shipments).set(updateFields).where(eq(shipments.id, shipment.id));

    return c.json({ data: { newEvents: inserted, currentStatus: result.currentStatus } });
  } catch (err) {
    console.error('[shipments] track failed:', err);
    return c.json({ error: 'Tracking failed' }, 500);
  }
});

app.post('/:id/stop-tracking', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const [shipment] = await db
    .select({ id: shipments.id, trackingNo: shipments.trackingNo, carrier: shipments.carrier })
    .from(shipments)
    .where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId)))
    .limit(1);

  if (!shipment) return c.json({ error: 'Shipment not found' }, 404);

  const provider = getProvider();
  if (!provider.stopTracking) {
    return c.json({ error: `${provider.name} does not support stop tracking` }, 400);
  }

  const [lastEvent] = await db
    .select({ carrierCode: trackingEvents.carrierCode })
    .from(trackingEvents)
    .where(eq(trackingEvents.shipmentId, id))
    .orderBy(desc(trackingEvents.eventTime))
    .limit(1);

  const ok = await provider.stopTracking({
    trackingNo: shipment.trackingNo,
    carrierCode: lastEvent?.carrierCode ?? undefined,
    carrier: shipment.carrier ?? undefined,
  });

  if (!ok) return c.json({ error: 'Failed to stop tracking' }, 500);

  await db.update(shipments)
    .set({ trackingRegistered: false, updatedAt: new Date() })
    .where(eq(shipments.id, id));

  return c.json({ data: { stopped: true } });
});

export default app;
