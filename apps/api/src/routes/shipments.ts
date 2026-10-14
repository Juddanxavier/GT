import { and, desc, eq, inArray, isNull, like, or, type SQL, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cacheDel, cacheDelPattern, withCache } from '../cache';
import { db } from '../db';
import { user as userTable, invoices, shipments, tenants, trackingEvents } from '../db/schema';
import { getQueryScope, requireBranchScope, requireRole } from '../middleware/authorization';
import { emitToTenant } from '../realtime';
import { cacheClient } from '../redis';
import { logAudit } from '../services/audit';
import { resolveShipmentId } from '../services/shipment-resolve';
import { createShipment, DuplicateTrackingError, regenerateInvoice } from '../services/shipment';
import { getProvider } from '../shipment-providers';
import { insertEvents } from '../shipment-providers/dedup';
import { notifyTrackingEvents } from '../notifications/service';
import { statusToEventType } from '../notifications/event-map';
import { notificationQueue } from '../queues';
import type { InternalStatus } from '@repo/types/status';
import { createShipmentSchema, updateShipmentSchema } from '../validators';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

app.get(
  '/',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);

    const status = c.req.query('status');
    const customerId = c.req.query('customerId');
    const search = c.req.query('search');
    const page = Math.max(parseInt(c.req.query('page') ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '50', 10) || 50, 1), 200);
    const offset = (page - 1) * limit;

    if (search && search.length > 100) return c.json({ error: 'Search query too long' }, 400);

    // T003: exclude archived shipments from list
    const conditions: (ReturnType<typeof eq | typeof isNull>)[] = [
      isNull(shipments.archivedAt),
    ];
    if (scope.tenantId) conditions.push(eq(shipments.tenantId, scope.tenantId));
    if (scope.branchId) conditions.push(or(eq(shipments.branchId, scope.branchId!), isNull(shipments.branchId))!);
    if (status) {
      const statuses = status.split(',').filter(Boolean);
      if (statuses.length > 0) {
        conditions.push(inArray(shipments.status, statuses));
      }
    }
    if (customerId) conditions.push(eq(shipments.userId, customerId!));
    if (search) conditions.push(sql`(${like(shipments.trackingNo, `%${search}%`)} OR ${like(shipments.carrier, `%${search}%`)} OR ${like(shipments.customerName, `%${search}%`)} OR ${like(shipments.origin, `%${search}%`)} OR ${like(shipments.destination, `%${search}%`)})`);

    const cacheKey = `shipments:list:${scope.branchId ?? 'all'}:${status ?? 'all'}:${customerId ?? 'all'}:${search ?? ''}:${page}:${limit}`;

    const cacheTenantId = scope.tenantId ?? '__all__';
    const {
      rows,
      total,
      page: pg,
      limit: lm,
      counts,
    } = await withCache(
      cacheTenantId,
      cacheKey,
      async () => {
        const [countRow] = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(shipments)
          .where(and(...conditions) as SQL | undefined);
        const count = countRow?.count ?? 0;

        const rows = await db
          .select()
          .from(shipments)
          .where(and(...conditions) as SQL | undefined)
          .orderBy(desc(shipments.createdAt))
          .limit(limit)
          .offset(offset);

        // Compute status counts from ALL matching records (ignoring status filter)
        const countConditions: (ReturnType<typeof eq | typeof isNull>)[] = [
          isNull(shipments.archivedAt),
        ];
        if (scope.tenantId) countConditions.push(eq(shipments.tenantId, scope.tenantId));
        if (scope.branchId) countConditions.push(or(eq(shipments.branchId, scope.branchId!), isNull(shipments.branchId))!);
        if (customerId) countConditions.push(eq(shipments.userId, customerId!));
        if (search) countConditions.push(sql`(${like(shipments.trackingNo, `%${search}%`)} OR ${like(shipments.carrier, `%${search}%`)} OR ${like(shipments.customerName, `%${search}%`)} OR ${like(shipments.origin, `%${search}%`)} OR ${like(shipments.destination, `%${search}%`)})`);
        // NOTE: status filter is intentionally excluded from counts
        // so KPI cards always show the full breakdown regardless of status filter

        const countRows = await db
          .select({
            status: shipments.status,
            count: sql<number>`COUNT(*)::int`,
          })
          .from(shipments)
          .where(and(...countConditions) as SQL | undefined)
          .groupBy(shipments.status);

        const counts: Record<string, number> = {};
        for (const r of countRows) {
          counts[r.status!] = r.count;
        }

        return { rows, total: count, page, limit, counts };
      },
      60,
    );

    return c.json({ data: rows, total, page: pg, limit: lm, counts });
  },
);

app.get(
  '/trend',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    // T003: exclude archived shipments from trend
    const conditions: (ReturnType<typeof eq> | ReturnType<typeof isNull> | ReturnType<typeof or>)[] = [
      isNull(shipments.archivedAt),
    ];
    if (scope.tenantId) conditions.push(eq(shipments.tenantId, scope.tenantId));
    if (scope.branchId) conditions.push(or(eq(shipments.branchId, scope.branchId!), isNull(shipments.branchId))!);
    const rows = await db
      .select({
        date: sql<string>`DATE(${shipments.createdAt})::text`,
        total: sql<number>`COUNT(*)::int`,
        intransit: sql<number>`COUNT(*) FILTER (WHERE ${shipments.status} = 'in_transit')::int`,
        outfordelivery: sql<number>`COUNT(*) FILTER (WHERE ${shipments.status} = 'out_for_delivery')::int`,
        delivered: sql<number>`COUNT(*) FILTER (WHERE ${shipments.status} = 'delivered')::int`,
        pending: sql<number>`COUNT(*) FILTER (WHERE ${shipments.status} = 'pending')::int`,
        exception: sql<number>`COUNT(*) FILTER (WHERE ${shipments.status} = 'exception')::int`,
      })
      .from(shipments)
      .where(and(...conditions) as SQL | undefined)
      .groupBy(sql`DATE(${shipments.createdAt})`)
      .orderBy(sql`DATE(${shipments.createdAt})`);
    return c.json({ data: rows });
  },
);

app.post('/', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const user = c.get('user') as unknown as {
    id: string;
    role: string;
    tenantId?: string;
    branchId?: string;
  } | null;
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

  // Superadmin can create shipments for any tenant
  if (user?.role === 'superadmin' && parsed.data.tenantId) {
    tenantId = parsed.data.tenantId;
  }

  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  // Global duplicate tracking number check (cross-tenant, excludes archived)
  const [dup] = await db.execute<{ id: string }>(
    sql`SELECT id FROM shipment WHERE tracking_no = ${parsed.data.trackingNo} AND archived_at IS NULL LIMIT 1`,
  );
  if (dup?.id)
    return c.json({ error: `Tracking number "${parsed.data.trackingNo}" already exists` }, 409);

  // Branch scope enforcement on creation (route-level concern)
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
      return c.json(
        {
          error: 'Branch override mismatch: shipment branch does not match selected branch filter',
        },
        403,
      );
    }
    parsed.data.branchId = overrideBranchId;
  }

  // Validate customerId belongs to the same tenant
  if (parsed.data.customerId) {
    const [cust] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(and(eq(userTable.id, parsed.data.customerId), eq(userTable.tenantId, tenantId!), eq(userTable.role, 'customer')))
      .limit(1);
    if (!cust) {
      return c.json({ error: 'Customer not found or does not belong to this tenant' }, 400);
    }
  }

  // Delegate to service: core transaction + async tracking/invoice
  let shipment: typeof shipments.$inferSelect;
  try {
    ({ shipment } = await createShipment({
    trackingNo: parsed.data.trackingNo,
    tenantId,
    userId: parsed.data.customerId ?? undefined,
    branchId: parsed.data.branchId,
    courierCode: parsed.data.courierCode,
    carrier: parsed.data.carrier,
    origin: parsed.data.origin,
    destination: parsed.data.destination,
    status: parsed.data.status ?? 'pending',
    billAmount: parsed.data.billAmount,
    contactEmail: parsed.data.contactEmail,
    contactPhone: parsed.data.contactPhone,
    customerName: parsed.data.customerName,
    senderAddress: parsed.data.senderAddress,
    recipientAddress: parsed.data.recipientAddress,
    }, c.get('logger')));
  } catch (err) {
    if (err instanceof DuplicateTrackingError) {
      return c.json({ error: err.message }, 409);
    }
    throw err;
  }

  return c.json({ data: shipment }, 201);
});

app.get(
  '/:id',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const { id } = c.req.param();

    if (!scope.tenantId && !c.get('user')) return c.json({ error: 'Tenant required' }, 400);

    const resolvedId = await resolveShipmentId(id!, scope);
    if (!resolvedId) return c.json({ error: 'Shipment not found' }, 404);

    // T002: match either explicit branch or unassigned (NULL)
    const conditions: (ReturnType<typeof eq> | ReturnType<typeof or>)[] = [
      eq(shipments.id, resolvedId),
    ];
    if (scope.tenantId) conditions.push(eq(shipments.tenantId, scope.tenantId));
    if (scope.branchId) conditions.push(or(eq(shipments.branchId, scope.branchId!), isNull(shipments.branchId))!);

    const cacheTenantId = scope.tenantId ?? '__all__';
    const row = await withCache(
      cacheTenantId,
      `shipments:${resolvedId}`,
      () =>
        db
          .select()
          .from(shipments)
          .where(and(...conditions) as SQL | undefined)
          .limit(1)
          .then((r) => r[0] ?? null),
      120,
    );

    if (!row) return c.json({ error: 'Shipment not found' }, 404);
    return c.json({ data: row });
  },
);

app.patch(
  '/:id',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const { id } = c.req.param();
    const user = c.get('user') as unknown as Record<string, unknown> | null;
    if (!scope.tenantId && !user) return c.json({ error: 'Tenant required' }, 400);

    const resolvedId = await resolveShipmentId(id!, scope);
    if (!resolvedId) return c.json({ error: 'Shipment not found' }, 404);

    const body = await c.req.json();
    const parsed = updateShipmentSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const fields = Object.entries(flat.fieldErrors)
        .map(([k, v]) => `${k}: ${v?.join(', ')}`)
        .join('; ');
      return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
    }

    // Field-level permissions by role
    const role = (user as Record<string, unknown> | null)?.role as string;
    const allowedFields: Record<string, string[]> = {
      staff: [
        'customerId',
        'customerName',
        'contactEmail',
        'contactPhone',
        'origin',
        'destination',
        'senderAddress',
        'recipientAddress',
      ],
      'tenant-admin': [
        'customerId',
        'customerName',
        'contactEmail',
        'contactPhone',
        'branchId',
        'origin',
        'destination',
        'senderAddress',
        'recipientAddress',
        'status',
        'billAmount',
      ],
      superadmin: [
        'customerId',
        'customerName',
        'contactEmail',
        'contactPhone',
        'branchId',
        'origin',
        'destination',
        'senderAddress',
        'recipientAddress',
        'status',
        'billAmount',
      ],
    };
    const allowed = allowedFields[role] ?? [];
    const filteredData = Object.fromEntries(
      Object.entries(parsed.data).filter(([key]) => allowed.includes(key)),
    );

    // T002: use or(eq, isNull) instead of COALESCE so NULL-branch shipments can be found
    const findConditions: (ReturnType<typeof eq> | ReturnType<typeof or>)[] = [eq(shipments.id, resolvedId)];
    if (scope.tenantId) findConditions.push(eq(shipments.tenantId, scope.tenantId!));
    if (scope.branchId) findConditions.push(or(eq(shipments.branchId, scope.branchId!), isNull(shipments.branchId))!);

    const [existing] = await db
      .select()
      .from(shipments)
      .where(and(...findConditions) as SQL | undefined)
      .limit(1);

    if (!existing) return c.json({ error: 'Shipment not found' }, 404);

    // Validate customerId belongs to the same tenant
    if (filteredData.customerId) {
      const [cust] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(and(eq(userTable.id, filteredData.customerId as string), eq(userTable.tenantId, scope.tenantId!), eq(userTable.role, 'customer')))
        .limit(1);
      if (!cust) {
        return c.json({ error: 'Customer not found or does not belong to this tenant' }, 400);
      }
    }

    // Bill amount permission check: staff cannot edit billAmount once set
    if (filteredData.billAmount !== undefined && role === 'staff') {
      if (existing.billAmount !== null) {
        return c.json({ error: 'Only admins can edit bill amount after creation' }, 403);
      }
    }

    const updateData: Record<string, unknown> = { ...filteredData, updatedAt: new Date() };
    const [row] = await db
      .update(shipments)
      .set(updateData)
      .where(and(...findConditions) as SQL | undefined)
      .returning();

    if (!row) return c.json({ error: 'Shipment not found' }, 404);

    await cacheDel(scope.tenantId!, `shipments:${row.id}`);
    await cacheDel(scope.tenantId!, `shipments:${row.id}:tracking`);
    await cacheDelPattern(scope.tenantId!, 'shipments:list:*');
    await cacheDelPattern(scope.tenantId!, 'dashboard:*');

    // Sync invoice userId when shipment customerId changes
    if ('customerId' in filteredData && existing.userId !== filteredData.customerId) {
      const newUserId = filteredData.customerId;
      await db
        .update(invoices)
        .set({ userId: (typeof newUserId === 'string' ? newUserId : null), updatedAt: new Date() })
        .where(and(eq(invoices.shipmentId, row.id), eq(invoices.tenantId, scope.tenantId!)));
      await cacheDelPattern(scope.tenantId!, 'invoices:*');

      // Sync shipment customerName when userId changes
      if (typeof newUserId === 'string') {
        const [cust] = await db
          .select({ name: userTable.name, email: userTable.email, phone: userTable.phone })
          .from(userTable)
          .where(eq(userTable.id, newUserId))
          .limit(1);

        // Update shipment customerName to match
        if (cust) {
          await db
            .update(shipments)
            .set({ customerName: cust.name, updatedAt: new Date() })
            .where(eq(shipments.id, row.id));
          row.customerName = cust.name;
        }

        if (cust && (cust.email || cust.phone)) {
          const eventType = statusToEventType(row.status as InternalStatus);
          if (eventType && notificationQueue) {
            await notificationQueue.add('notify', {
              shipmentId: row.id,
              eventId: `assigned:${newUserId}:${Date.now()}`,
              eventType,
              tenantId: scope.tenantId!,
              trackingNo: row.trackingNo,
              labelCode: row.labelCode ?? undefined,
              carrier: row.carrier ?? undefined,
              origin: row.origin ?? undefined,
              destination: row.destination ?? undefined,
              estimatedDelivery: row.estimatedDelivery?.toISOString() ?? undefined,
              customerName: cust.name ?? undefined,
              customerEmail: cust.email ?? undefined,
              customerPhone: cust.phone ?? undefined,
            });

            await logAudit('NOTIFICATION_SENT', c.get('user')?.id ?? null, {
              channel: 'notification_queue',
              type: 'customer_assigned',
              shipmentId: row.id,
              trackingNo: row.trackingNo,
              customerId: newUserId,
              eventType,
              tenantId: scope.tenantId,
            }, c);
          }
        }
      }
    }

    // Regenerate invoice when billAmount changes (admin only)
    if ('billAmount' in filteredData && Number(filteredData.billAmount) !== Number(existing.billAmount)) {
      if (role === 'tenant-admin' || role === 'superadmin') {
        const newAmount = Number(filteredData.billAmount) || 0;
        await regenerateInvoice(row.id, newAmount, scope.tenantId!, row.userId ?? undefined, c.get('logger'));
      }
    }

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(filteredData)) {
      const oldVal = (existing as Record<string, unknown>)[key];
      const newVal = filteredData[key];
      if (String(oldVal) !== String(newVal)) {
        changes[key] = { from: oldVal, to: newVal };
      }
    }

    if (Object.keys(changes).length > 0) {
      logAudit(
        'SHIPMENT_UPDATED',
        c.get('user')?.id ?? null,
        {
          shipmentId: row.id,
          trackingNo: row.trackingNo,
          tenantId: scope.tenantId,
          changes,
        },
        c,
      );
    }

    emitToTenant(scope.tenantId!, 'dashboard:update', {});

    return c.json({ data: row });
  },
);

app.delete('/:id', requireRole('superadmin', 'tenant-admin'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  if (!scope.tenantId && !c.get('user')) return c.json({ error: 'Tenant required' }, 400);

  const resolvedId = await resolveShipmentId(id!, scope);
  if (!resolvedId) return c.json({ error: 'Shipment not found' }, 404);

  // T002: match either explicit branch or unassigned
  const shipmentScope: (ReturnType<typeof eq> | ReturnType<typeof or>)[] = [
    eq(shipments.id, resolvedId),
  ];
  if (scope.tenantId) shipmentScope.push(eq(shipments.tenantId, scope.tenantId));
  if (scope.branchId) shipmentScope.push(or(eq(shipments.branchId, scope.branchId!), isNull(shipments.branchId))!);

  // Soft-delete: set archivedAt on shipment and related invoices instead of hard-deleting
  const now = new Date();

  // First check the shipment exists (ignore archivedAt so we can distinguish "not found" from "already deleted")
  const [existing] = await db
    .select({ id: shipments.id, trackingNo: shipments.trackingNo, archivedAt: shipments.archivedAt })
    .from(shipments)
    .where(and(...shipmentScope) as SQL | undefined)
    .limit(1);

  if (!existing) return c.json({ error: 'Shipment not found' }, 404);

  const cacheTenant = scope.tenantId ?? '__all__';

  // Idempotent: already archived → nothing to do
  if (existing.archivedAt) {
    await cacheDel(cacheTenant, `shipments:${existing.id}`);
    await cacheDel(cacheTenant, `shipments:${existing.id}:tracking`);
    await cacheDel(cacheTenant, `invoices:shipment:${existing.id}`);
    await cacheDelPattern(cacheTenant, 'shipments:list:*');
    await cacheDelPattern(cacheTenant, 'dashboard:*');
    await cacheDelPattern(cacheTenant, 'invoices:list*');
    return c.json({ data: existing });
  }

  const invoiceConditions: (ReturnType<typeof eq>)[] = [eq(invoices.shipmentId, resolvedId)];
  if (scope.tenantId) invoiceConditions.push(eq(invoices.tenantId, scope.tenantId));
  await db
    .update(invoices)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(...invoiceConditions) as SQL | undefined);

  // Cascade archive: tracking events
  await db
    .update(trackingEvents)
    .set({ archivedAt: now })
    .where(and(eq(trackingEvents.shipmentId, resolvedId), eq(trackingEvents.tenantId, scope.tenantId!), isNull(trackingEvents.archivedAt)) as SQL | undefined);

  const [row] = await db
    .update(shipments)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(...shipmentScope) as SQL | undefined)
    .returning();

  if (!row) return c.json({ error: 'Shipment not found' }, 404);
  await cacheDel(cacheTenant, `shipments:${row.id}`);
  await cacheDel(cacheTenant, `shipments:${row.id}:tracking`);
  await cacheDel(cacheTenant, `invoices:shipment:${row.id}`);
  await cacheDelPattern(cacheTenant, 'shipments:list:*');
  await cacheDelPattern(cacheTenant, 'dashboard:*');
  await cacheDelPattern(cacheTenant, 'invoices:list*');
  logAudit(
    'SHIPMENT_DELETED',
    c.get('user')?.id ?? null,
    {
      shipmentId: row.id,
      trackingNo: row.trackingNo,
      tenantId: scope.tenantId,
    },
    c,
  );
  emitToTenant(scope.tenantId ?? '__all__', 'dashboard:update', {});
  return c.json({ data: row });
});

app.post(
  '/:id/restore',
  requireRole('superadmin', 'tenant-admin'),
  requireBranchScope(),
  async (c) => {
    const { id } = c.req.param();
    const scope = getQueryScope(c);

    const resolvedId = await resolveShipmentId(id!, scope);
    if (!resolvedId) return c.json({ error: 'Shipment not found' }, 404);

    const [shipment] = await db
      .select({ id: shipments.id, trackingNo: shipments.trackingNo, archivedAt: shipments.archivedAt })
      .from(shipments)
      .where(and(eq(shipments.id, resolvedId), eq(shipments.tenantId, scope.tenantId!)))
      .limit(1);

    if (!shipment) return c.json({ error: 'Shipment not found' }, 404);
    if (!shipment.archivedAt) return c.json({ error: 'Shipment is not archived' }, 400);

    await db
      .update(shipments)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(eq(shipments.id, resolvedId));

    await cacheDel(scope.tenantId!, `shipments:${resolvedId}`);
    await cacheDelPattern(scope.tenantId!, 'shipments:list:*');
    await cacheDelPattern(scope.tenantId!, 'dashboard:*');

    logAudit('SHIPMENT_UPDATED', c.get('user')?.id ?? null, {
      shipmentId: shipment.id,
      trackingNo: shipment.trackingNo,
      tenantId: scope.tenantId,
      changes: { archivedAt: { from: shipment.archivedAt.toISOString(), to: null } },
    }, c);

    emitToTenant(scope.tenantId!, 'shipment:restored', { id });

    return c.json({ success: true });
  },
);

app.put(
  '/:id/assign',
  requireRole('superadmin', 'tenant-admin'),
  requireBranchScope(),
  async (c) => {
    const { id } = c.req.param();
    if (!id) return c.json({ error: 'Invalid shipment ID' }, 400);
    const scope = getQueryScope(c);
    const body = await c.req.json().catch(() => ({}));
    const { customerId } = body as { customerId?: string | null };

    if (customerId !== undefined && customerId !== null && typeof customerId !== 'string') {
      return c.json({ error: 'customerId must be a valid UUID or null' }, 400);
    }

    const resolvedId = await resolveShipmentId(id, scope);
    if (!resolvedId) return c.json({ error: 'Shipment not found' }, 404);

    const [shipment] = await db
      .select({ id: shipments.id, trackingNo: shipments.trackingNo, userId: shipments.userId, status: shipments.status, contactEmail: shipments.contactEmail, contactPhone: shipments.contactPhone })
      .from(shipments)
      .where(and(eq(shipments.id, resolvedId), eq(shipments.tenantId, scope.tenantId!)))
      .limit(1);

    if (!shipment) return c.json({ error: 'Shipment not found' }, 404);
    if (shipment.userId === customerId) return c.json({ data: { id } });

    let customerName: string | null = null;
    let newContactEmail: string | null = shipment.contactEmail;
    let newContactPhone: string | null = shipment.contactPhone;

    if (customerId) {
      const [cust] = await db
        .select({ id: userTable.id, name: userTable.name, email: userTable.email, phone: userTable.phone })
        .from(userTable)
        .where(and(eq(userTable.id, customerId), eq(userTable.tenantId, scope.tenantId!), eq(userTable.role, 'customer')))
        .limit(1);
      if (!cust) return c.json({ error: 'Customer not found or does not belong to this tenant' }, 400);
      customerName = cust.name;
      // Use customer profile contact — clear shipment-level overrides
      newContactEmail = null;
      newContactPhone = null;
    }

    await db
      .update(shipments)
      .set({
        userId: customerId ?? null,
        customerName,
        contactEmail: customerId ? null : newContactEmail,
        contactPhone: customerId ? null : newContactPhone,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, resolvedId));

    await cacheDel(scope.tenantId!, `shipments:${resolvedId}`);
    await cacheDelPattern(scope.tenantId!, 'shipments:list:*');
    await cacheDelPattern(scope.tenantId!, 'dashboard:*');

    logAudit('SHIPMENT_UPDATED', c.get('user')?.id ?? null, {
      shipmentId: shipment.id,
      trackingNo: shipment.trackingNo,
      tenantId: scope.tenantId,
      changes: {
        customerId: { from: shipment.userId, to: customerId ?? null },
      },
    }, c);

    // Notify the new customer
    if (customerId && customerId !== shipment.userId) {
      const eventType = statusToEventType(shipment.status as InternalStatus);
      if (eventType && notificationQueue) {
        await notificationQueue.add('notify', {
          shipmentId: shipment.id,
          eventId: `assigned:${customerId}:${Date.now()}`,
          eventType,
          tenantId: scope.tenantId,
          trackingNo: shipment.trackingNo,
          labelCode: undefined,
          carrier: undefined,
          origin: undefined,
          destination: undefined,
          customerName: customerName ?? undefined,
          customerEmail: undefined,
          customerPhone: undefined,
        });
      }
    }

    emitToTenant(scope.tenantId!, 'dashboard:update', {});
    return c.json({ data: { id } });
  },
);

app.get(
  '/:id/tracking',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const { id } = c.req.param();

    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const resolvedId = await resolveShipmentId(id!, scope);
    if (!resolvedId) return c.json({ error: 'Shipment not found' }, 404);

    // T002: match either explicit branch or unassigned
    const findConditions: (ReturnType<typeof eq> | ReturnType<typeof or>)[] = [
      eq(shipments.id, resolvedId),
      eq(shipments.tenantId, scope.tenantId!),
    ];
    if (scope.branchId) findConditions.push(or(eq(shipments.branchId, scope.branchId!), isNull(shipments.branchId))!);

    const data = await withCache(
      scope.tenantId!,
      `shipments:${resolvedId}:tracking`,
      async () => {
        const [shipment] = await db
          .select({
            id: shipments.id,
            status: shipments.status,
            trackingRegistered: shipments.trackingRegistered,
            lastTrackedAt: shipments.lastTrackedAt,
            trackingProvider: shipments.trackingProvider,
          })
          .from(shipments)
          .where(and(...findConditions) as SQL | undefined)
          .limit(1);

        if (!shipment) return null;

        const events = await db
          .select()
          .from(trackingEvents)
          .where(
            and(eq(trackingEvents.shipmentId, resolvedId), eq(trackingEvents.tenantId, scope.tenantId!)) as
              | SQL
              | undefined,
          )
          .orderBy(desc(trackingEvents.eventTime));

        return { shipment, events };
      },
      60,
    );

    if (!data) return c.json({ error: 'Shipment not found' }, 404);

    return c.json({ data: { shipment: data.shipment, events: data.events } });
  },
);

app.post(
  '/:id/track',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const { id } = c.req.param();
    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    // Rate limit: 1 track per 60 seconds per shipment (D-15 — confirmed adequate per user decision)
    if (cacheClient) {
      try {
        const cooldownKey = `track:cooldown:${id}`;
        const cooled = await cacheClient.get(cooldownKey);
        if (cooled) return c.json({ error: 'Please wait before tracking again' }, 429);
        await cacheClient.set(cooldownKey, '1', 'EX', 60);
      } catch {
        c.get('logger').warn('track cooldown redis unavailable, proceeding without cooldown');
      }
    }

    const resolvedId = await resolveShipmentId(id!, scope);
    if (!resolvedId) return c.json({ error: 'Shipment not found' }, 404);

    // T002: match either explicit branch or unassigned
    const findConditions: (ReturnType<typeof eq> | ReturnType<typeof or>)[] = [eq(shipments.id, resolvedId)];
    if (scope.tenantId) findConditions.push(eq(shipments.tenantId, scope.tenantId!));
    if (scope.branchId) findConditions.push(or(eq(shipments.branchId, scope.branchId!), isNull(shipments.branchId))!);

    const [shipment] = await db
      .select({
        id: shipments.id,
        trackingNo: shipments.trackingNo,
        carrier: shipments.carrier,
        origin: shipments.origin,
        destination: shipments.destination,
      })
      .from(shipments)
      .where(and(...findConditions) as SQL | undefined)
      .limit(1);

    if (!shipment) return c.json({ error: 'Shipment not found' }, 404);

    try {
      const provider = getProvider();
      const result = await provider.track(shipment.trackingNo, shipment.carrier ?? undefined, c.get('logger'));
      const inserted = await insertEvents(shipment.id, scope.tenantId, result.events);

      if (inserted > 0) {
        notifyTrackingEvents(shipment.id, scope.tenantId, result.events, result.currentStatus, c.get('logger'));
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
      await cacheDel(scope.tenantId!, `shipments:${shipment.id}`);
      await cacheDel(scope.tenantId!, `shipments:${shipment.id}:tracking`);

      return c.json({ data: { newEvents: inserted, currentStatus: result.currentStatus } });
    } catch (err) {
      c.get('logger').error({ err, shipmentId: shipment.id, trackingNo: shipment.trackingNo }, 'track failed');
      return c.json({ error: 'Tracking failed' }, 500);
    }
  },
);

app.post('/:id/stop-tracking', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const resolvedId = await resolveShipmentId(id!, scope);
  if (!resolvedId) return c.json({ error: 'Shipment not found' }, 404);

  // T002: match either explicit branch or unassigned
  const findConditions: (ReturnType<typeof eq> | ReturnType<typeof or>)[] = [
    eq(shipments.id, resolvedId),
    eq(shipments.tenantId, scope.tenantId!),
  ];
  if (scope.branchId) findConditions.push(or(eq(shipments.branchId, scope.branchId!), isNull(shipments.branchId))!);

  const [shipment] = await db
    .select({ id: shipments.id, trackingNo: shipments.trackingNo, carrier: shipments.carrier })
    .from(shipments)
    .where(and(...findConditions) as SQL | undefined)
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
      .where(eq(trackingEvents.shipmentId, resolvedId))
      .orderBy(desc(trackingEvents.eventTime))
      .limit(1);

    const ok = await provider.stopTracking({
      trackingNo: shipment.trackingNo,
      carrierCode: lastEvent?.carrierCode ?? undefined,
      carrier: shipment.carrier ?? undefined,
    }, c.get('logger'));

    if (!ok) return c.json({ error: 'Failed to stop tracking' }, 500);

    await db
      .update(shipments)
      .set({ trackingRegistered: false, updatedAt: new Date() })
      .where(eq(shipments.id, resolvedId));

    await cacheDel(scope.tenantId!, `shipments:${resolvedId}`);
    await cacheDel(scope.tenantId!, `shipments:${resolvedId}:tracking`);
    return c.json({ data: { stopped: true } });
  } catch (err) {
    c.get('logger').error({ err, shipmentId: resolvedId }, 'stop tracking failed');
    return c.json({ error: 'Failed to stop tracking' }, 500);
  }
});

export default app;
