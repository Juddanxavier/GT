import { Hono } from 'hono';
import { eq, and, desc, like, sql } from 'drizzle-orm';
import { db } from '../db';
import { shipments, trackingEvents, tenants, invoices, customers } from '../db/schema';
import { requireRole, requireBranchScope, getQueryScope } from '../middleware/authorization';
import { withCache, cacheDel, cacheDelPattern } from '../cache';
import { createShipmentSchema, updateShipmentSchema } from '../validators';
import type { AppVariables } from './types';
import { getProvider } from '../shipment-providers';
import { insertEvents } from '../shipment-providers/dedup';
import { emailQueue, pdfQueue } from '../queues';
import { notifyTrackingEvents } from '../notifications/service';
import { logAudit } from '../services/audit';
import { emitToTenant } from '../realtime';

const app = new Hono<{ Variables: AppVariables }>();

app.get('/', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);

  const status = c.req.query('status');
  const customerId = c.req.query('customerId');
  const search = c.req.query('search');
  const page = Math.max(parseInt(c.req.query('page') ?? '1', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '50', 10) || 50, 1), 200);
  const offset = (page - 1) * limit;

  if (search && search.length > 100) return c.json({ error: 'Search query too long' }, 400);

  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const conditions: ReturnType<typeof eq>[] = [eq(shipments.tenantId, scope.tenantId)];
  if (scope.branchId) conditions.push(eq(shipments.branchId, scope.branchId));
  if (status) conditions.push(eq(shipments.status, status));
  if (customerId) conditions.push(eq(shipments.customerId, customerId));
  if (search) conditions.push(sql`${like(shipments.trackingNo, `%${search}%`)}`);

  const cacheKey = `shipments:list:${scope.branchId ?? 'all'}:${status ?? 'all'}:${customerId ?? 'all'}:${search ?? ''}:${page}:${limit}`;

  const { rows, total, page: pg, limit: lm } = await withCache(scope.tenantId, cacheKey, async () => {
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(shipments)
      .where(and(...conditions));

    const rows = await db
      .select()
      .from(shipments)
      .where(and(...conditions))
      .orderBy(desc(shipments.createdAt))
      .limit(limit)
      .offset(offset);

    return { rows, total: count, page, limit };
  }, 60);

  return c.json({ data: rows, total, page: pg, limit: lm });
});

app.get('/trend', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);
  const conditions = [eq(shipments.tenantId, scope.tenantId)];
  if (scope.branchId) conditions.push(eq(shipments.branchId, scope.branchId));
  const rows = await db
    .select({
      date: sql<string>`DATE(${shipments.createdAt})::text`,
      total: sql<number>`COUNT(*)::int`,
      intransit: sql<number>`COUNT(*) FILTER (WHERE ${shipments.status} = 'in_transit')::int`,
      delivered: sql<number>`COUNT(*) FILTER (WHERE ${shipments.status} = 'delivered')::int`,
      pending: sql<number>`COUNT(*) FILTER (WHERE ${shipments.status} = 'pending')::int`,
    })
    .from(shipments)
    .where(and(...conditions))
    .groupBy(sql`DATE(${shipments.createdAt})`)
    .orderBy(sql`DATE(${shipments.createdAt})`);
  return c.json({ data: rows });
});

app.post('/', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const user = c.get('user') as { id: string; role: string; tenantId?: string; branchId?: string } | null;
  let tenantId = c.get('tenantId');

  const body = await c.req.json();
  const parsed = createShipmentSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors)
      .map(([k, v]) => `${k}: ${v?.join(', ')}`)
      .join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  if (user?.role === 'superadmin' && parsed.data.tenantId) {
    tenantId = parsed.data.tenantId;
  }

  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  // Duplicate tracking number check
  const [dup] = await db
    .select({ id: shipments.id })
    .from(shipments)
    .where(and(eq(shipments.tenantId, tenantId), eq(shipments.trackingNo, parsed.data.trackingNo)))
    .limit(1);
  if (dup) return c.json({ error: `Tracking number "${parsed.data.trackingNo}" already exists` }, 409);

  // Branch scope enforcement on creation
  const bodyBranchId = parsed.data.branchId;
  const overrideBranchId = c.get('branchId');

  if (user?.role === 'staff') {
    const allowedBranchId = user.branchId;
    if (!allowedBranchId) return c.json({ error: 'No branch assigned to your account' }, 403);
    if (bodyBranchId && bodyBranchId !== allowedBranchId) {
      return c.json({ error: 'You can only create shipments in your assigned branch' }, 403);
    }
    parsed.data.branchId = allowedBranchId;
  } else if (user?.role === 'tenant-admin' && overrideBranchId) {
    if (bodyBranchId && bodyBranchId !== overrideBranchId) {
      return c.json({ error: 'Branch override mismatch: shipment branch does not match selected branch filter' }, 403);
    }
    parsed.data.branchId = overrideBranchId;
  }

  let row: typeof shipments.$inferSelect | undefined;
  let labelCode: string | undefined;

  await db.transaction(async (tx) => {
    [row] = await tx
      .insert(shipments)
      .values({
        tenantId,
        trackingNo: parsed.data.trackingNo,
        customerId: parsed.data.customerId,
        branchId: parsed.data.branchId,
        courierCode: parsed.data.courierCode,
        carrier: parsed.data.carrier,
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        status: parsed.data.status ?? 'pending',
        billAmount: parsed.data.billAmount ? String(parsed.data.billAmount) : undefined,
        contactEmail: parsed.data.contactEmail,
        contactPhone: parsed.data.contactPhone,
        customerName: parsed.data.customerName,
      })
      .returning();

    if (!row) return c.json({ error: 'Failed to create shipment' }, 500);

    labelCode = `GT-${row.id.slice(0, 7).toUpperCase()}`;
    await tx.update(shipments).set({ labelCode, updatedAt: new Date() }).where(eq(shipments.id, row.id));
  });

  if (!row) return c.json({ error: 'Failed to create shipment' }, 500);

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
      origin: trackResult.origin ?? parsed.data.origin ?? null,
      destination: trackResult.destination ?? parsed.data.destination ?? null,
      estimatedDelivery: trackResult.estimatedDelivery ? new Date(trackResult.estimatedDelivery) : null,
      actualDelivery: trackResult.actualDelivery ? new Date(trackResult.actualDelivery) : null,
    };
    if (trackResult.events.length > 0) {
      updateData.carrier = trackResult.events[0]?.carrier || carrierName || null;
    } else if (carrierName) {
      updateData.carrier = carrierName;
    }
    await db.update(shipments).set(updateData).where(eq(shipments.id, row.id));
  } catch (err) {
    console.error('[shipments] auto-track failed:', err);
  }

  // Auto-create invoice
  if (parsed.data.billAmount != null && parsed.data.billAmount > 0) {
    try {
      const [existingInv] = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.shipmentId, row.id))
        .limit(1);

      if (!existingInv) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const shortId = row.id.slice(0, 5).toUpperCase();
        const invoiceNo = `INV-${y}${m}-${shortId}`;

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
            customerId: parsed.data.customerId ?? null,
            invoiceNo,
            amount: String(parsed.data.billAmount),
            status: 'paid',
            emailCount: 1,
            paidAt: now,
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
      }
    } catch (err) {
      console.error('[shipments] auto-invoice failed:', err);
    }
  }

  const [updated] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.id, row.id))
    .limit(1);

  // ponytail: list cache expires in 60s, no need to enumerate keys

  emitToTenant(tenantId, 'dashboard:update', {});

  return c.json({ data: updated ?? row }, 201);
});

app.get('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();

  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const conditions: ReturnType<typeof eq>[] = [eq(shipments.id, id), eq(shipments.tenantId, scope.tenantId)];
  if (scope.branchId) conditions.push(eq(shipments.branchId, scope.branchId));

  const row = await withCache(scope.tenantId, `shipments:${id}`, () =>
    db
      .select()
      .from(shipments)
      .where(and(...conditions))
      .limit(1)
      .then((r) => r[0] ?? null),
    120,
  );

  if (!row) return c.json({ error: 'Shipment not found' }, 404);
  return c.json({ data: row });
});

app.patch('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  const user = c.get('user');
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const parsed = updateShipmentSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors)
      .map(([k, v]) => `${k}: ${v?.join(', ')}`)
      .join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  if ((user as Record<string, unknown> | null)?.role === 'staff' && parsed.data.billAmount !== undefined) {
    return c.json({ error: 'Only admins can change bill amount' }, 403);
  }

  // Field-level permissions by role
  const role = (user as Record<string, unknown> | null)?.role as string;
  const allowedFields: Record<string, string[]> = {
    staff: ['customerId', 'customerName', 'contactEmail', 'contactPhone', 'origin', 'destination', 'status'],
    'tenant-admin': ['customerId', 'customerName', 'contactEmail', 'contactPhone', 'branchId', 'origin', 'destination', 'status', 'billAmount'],
    superadmin: ['customerId', 'customerName', 'contactEmail', 'contactPhone', 'branchId', 'origin', 'destination', 'status', 'billAmount', 'tenantId'],
  };
  const allowed = allowedFields[role] ?? [];
  const filteredData = Object.fromEntries(
    Object.entries(parsed.data).filter(([key]) => allowed.includes(key))
  );

  const findConditions: ReturnType<typeof eq>[] = [eq(shipments.id, id)];
  if (scope.tenantId) findConditions.push(eq(shipments.tenantId, scope.tenantId));
  if (scope.branchId) findConditions.push(eq(shipments.branchId, scope.branchId));

  const [existing] = await db
    .select()
    .from(shipments)
    .where(and(...findConditions))
    .limit(1);

  if (!existing) return c.json({ error: 'Shipment not found' }, 404);

  const updateData: Record<string, unknown> = { ...filteredData, updatedAt: new Date() };
  const [row] = await db
    .update(shipments)
    .set(updateData)
    .where(and(...findConditions))
    .returning();

  if (!row) return c.json({ error: 'Shipment not found' }, 404);

  await cacheDel(scope.tenantId, `shipments:${row.id}`);
  await cacheDel(scope.tenantId, `shipments:${row.id}:tracking`);
  await cacheDelPattern(scope.tenantId, 'shipments:list:*');
  await cacheDelPattern(scope.tenantId, 'dashboard:*');

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(filteredData)) {
    const oldVal = (existing as Record<string, unknown>)[key];
    const newVal = filteredData[key];
    if (String(oldVal) !== String(newVal)) {
      changes[key] = { from: oldVal, to: newVal };
    }
  }

  if (Object.keys(changes).length > 0) {
    logAudit('SHIPMENT_UPDATED', c.get('user')?.id ?? null, {
      shipmentId: row.id,
      trackingNo: row.trackingNo,
      tenantId: scope.tenantId,
      changes,
    }, c);
  }

  emitToTenant(scope.tenantId, 'dashboard:update', {});

  return c.json({ data: row });
});

app.delete('/:id', requireRole('superadmin', 'tenant-admin'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const shipmentScope = [eq(shipments.id, id), eq(shipments.tenantId, scope.tenantId)];
  if (scope.branchId) shipmentScope.push(eq(shipments.branchId, scope.branchId));

  await db.delete(invoices).where(and(eq(invoices.shipmentId, id), eq(invoices.tenantId, scope.tenantId)));
  const [row] = await db.delete(shipments).where(and(...shipmentScope)).returning();

  if (!row) return c.json({ error: 'Shipment not found' }, 404);
  await cacheDel(scope.tenantId, `shipments:${row.id}`);
  await cacheDel(scope.tenantId, `shipments:${row.id}:tracking`);
  await cacheDel(scope.tenantId, `invoices:shipment:${row.id}`);
  await cacheDelPattern(scope.tenantId, 'shipments:list:*');
  await cacheDelPattern(scope.tenantId, 'dashboard:*');
  await cacheDelPattern(scope.tenantId, 'invoices:list*');
  logAudit('SHIPMENT_DELETED', c.get('user')?.id ?? null, {
    shipmentId: row.id,
    trackingNo: row.trackingNo,
    tenantId: scope.tenantId,
  }, c);
  emitToTenant(scope.tenantId, 'dashboard:update', {});
  return c.json({ data: row });
});

app.get('/:id/tracking', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();

  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const findConditions: ReturnType<typeof eq>[] = [eq(shipments.id, id), eq(shipments.tenantId, scope.tenantId)];
  if (scope.branchId) findConditions.push(eq(shipments.branchId, scope.branchId));

  const data = await withCache(scope.tenantId, `shipments:${id}:tracking`, async () => {
    const [shipment] = await db
      .select({
        id: shipments.id,
        status: shipments.status,
        trackingRegistered: shipments.trackingRegistered,
        lastTrackedAt: shipments.lastTrackedAt,
        trackingProvider: shipments.trackingProvider,
      })
      .from(shipments)
      .where(and(...findConditions))
      .limit(1);

    if (!shipment) return null;

    const events = await db
      .select()
      .from(trackingEvents)
      .where(and(
        eq(trackingEvents.shipmentId, id),
        eq(trackingEvents.tenantId, scope.tenantId),
      ))
      .orderBy(desc(trackingEvents.eventTime));

    return { shipment, events };
  }, 60);

  if (!data) return c.json({ error: 'Shipment not found' }, 404);

  return c.json({ data: { shipment: data.shipment, events: data.events } });
});
app.post('/:id/track', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  // Rate limit: 1 track per 60 seconds per shipment
  if (cacheClient) {
    try {
      const cooldownKey = `track:cooldown:${id}`;
      const cooled = await cacheClient.get(cooldownKey);
      if (cooled) return c.json({ error: 'Please wait before tracking again' }, 429);
      await cacheClient.set(cooldownKey, '1', 'EX', 60);
    } catch {
      console.warn('[track] rate-limit redis unavailable, proceeding without cooldown');
    }
  }

  const findConditions: ReturnType<typeof eq>[] = [eq(shipments.id, id)];
  if (scope.tenantId) findConditions.push(eq(shipments.tenantId, scope.tenantId));
  if (scope.branchId) findConditions.push(eq(shipments.branchId, scope.branchId));

  const [shipment] = await db
    .select({
      id: shipments.id,
      trackingNo: shipments.trackingNo,
      carrier: shipments.carrier,
      origin: shipments.origin,
      destination: shipments.destination,
    })
    .from(shipments)
    .where(and(...findConditions))
    .limit(1);

  if (!shipment) return c.json({ error: 'Shipment not found' }, 404);

  try {
    const provider = getProvider();
    const result = await provider.track(shipment.trackingNo, shipment.carrier ?? undefined);
    const inserted = await insertEvents(shipment.id, scope.tenantId, result.events);

    if (inserted > 0) {
      notifyTrackingEvents(shipment.id, scope.tenantId, result.events, result.currentStatus);
    }

    const updateFields: Record<string, unknown> = {
      status: result.currentStatus,
      lastTrackedAt: new Date(),
      trackingRegistered: true,
      updatedAt: new Date(),
      origin: result.origin ?? shipment.origin ?? null,
      destination: result.destination ?? shipment.destination ?? null,
      estimatedDelivery: result.estimatedDelivery ? new Date(result.estimatedDelivery) : null,
      actualDelivery: result.actualDelivery ? new Date(result.actualDelivery) : null,
    };
    if (result.events.length > 0) {
      updateFields.carrier = result.events[0]?.carrier || shipment.carrier || null;
    }
    await db.update(shipments).set(updateFields).where(eq(shipments.id, shipment.id));
    await cacheDel(scope.tenantId, `shipments:${shipment.id}`);
    await cacheDel(scope.tenantId, `shipments:${shipment.id}:tracking`);

    return c.json({ data: { newEvents: inserted, currentStatus: result.currentStatus } });
  } catch (err) {
    console.error('[shipments] track failed:', err);
    return c.json({ error: 'Tracking failed' }, 500);
  }
});

app.post('/:id/stop-tracking', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const findConditions: ReturnType<typeof eq>[] = [eq(shipments.id, id), eq(shipments.tenantId, scope.tenantId)];
  if (scope.branchId) findConditions.push(eq(shipments.branchId, scope.branchId));

  const [shipment] = await db
    .select({ id: shipments.id, trackingNo: shipments.trackingNo, carrier: shipments.carrier })
    .from(shipments)
    .where(and(...findConditions))
    .limit(1);

  if (!shipment) return c.json({ error: 'Shipment not found' }, 404);

  const provider = getProvider();
  if (!provider.stopTracking) {
    return c.json({ error: `${provider.name} does not support stop tracking` }, 400);
  }

  try {
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

    await cacheDel(scope.tenantId, `shipments:${id}`);
    await cacheDel(scope.tenantId, `shipments:${id}:tracking`);
    return c.json({ data: { stopped: true } });
  } catch (err) {
    console.error('[shipments] stop-tracking failed:', err);
    return c.json({ error: 'Failed to stop tracking' }, 500);
  }
});

export default app;
