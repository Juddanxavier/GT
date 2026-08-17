/** @format */

/**
 * Public (unauthenticated) tracking endpoint for customers to look up
 * their shipment by tracking number.
 *
 * GET /api/track/:trackingNo
 *   - Optional ?tenant=slug to scope to a specific tenant
 *   - Returns shipment details + tracking events
 *   - No sensitive data exposed (no billAmount, customerId, contact info)
 *
 * Cached at 60s TTL to reduce DB load on a frequently-hit public endpoint.
 */

import { and, desc, eq, type SQL } from 'drizzle-orm';
import { Hono } from 'hono';
import { withCache } from '../cache';
import { db } from '../db';
import { shipments, tenants, trackingEvents } from '../db/schema';
import { globalRateLimit } from '../middleware/rate-limit';
import type { TenantVariables } from '../middleware/tenant';

const app = new Hono<{ Variables: TenantVariables }>();

app.get(
  '/:trackingNo',
  globalRateLimit({ windowSeconds: 60, maxRequests: 30, keyPrefix: 'public-track' }),
  async (c) => {
    const trackingNo = c.req.param('trackingNo');
    if (!trackingNo || trackingNo.length > 255) {
      return c.json({ error: 'Invalid tracking number' }, 400);
    }

    const tenantSlug = c.req.query('tenant');
    const resolvedTenantId = (c.get('tenantId') as string | null) ?? null;

    // Explicit ?tenant= slug wins; otherwise scope to the tenant resolved from
    // the request domain. With neither present (e.g. localhost dev), fall back
    // to a global lookup.
    let tenantId: string | null = resolvedTenantId;
    if (tenantSlug) {
      const [tenant] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.slug, tenantSlug!))
        .limit(1);
      if (!tenant) return c.json({ error: 'Shipment not found' }, 404);
      tenantId = tenant.id;
    }

    // Cache key includes effective tenant scope so one tenant's result can
    // never be served to another.
    const cacheKey = `public:track:${trackingNo}:${tenantId ?? ''}`;

    const data = await withCache<unknown | null>(
      'global', // Fixed key — not tenant-specific (trackingNo is the discriminator)
      cacheKey,
      async () => {
        // Build the shipment lookup condition
        const conditions: ReturnType<typeof eq>[] = [eq(shipments.trackingNo, trackingNo!)];
        if (tenantId) {
          conditions.push(eq(shipments.tenantId, tenantId));
        }

      const row = await db
        .select({
          id: shipments.id,
          trackingNo: shipments.trackingNo,
          status: shipments.status,
          carrier: shipments.carrier,
          origin: shipments.origin,
          destination: shipments.destination,
          estimatedDelivery: shipments.estimatedDelivery,
          actualDelivery: shipments.actualDelivery,
          lastTrackedAt: shipments.lastTrackedAt,
          userId: shipments.userId,
          tenantId: shipments.tenantId,
        })
        .from(shipments)
        .where(and(...conditions) as SQL | undefined)
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!row) return null;

      // Fetch tracking events (public-safe subset)
      const events = await db
        .select({
          status: trackingEvents.status,
          subStatus: trackingEvents.subStatus,
          description: trackingEvents.description,
          location: trackingEvents.location,
          carrier: trackingEvents.carrier,
          eventTime: trackingEvents.eventTime,
        })
        .from(trackingEvents)
        .where(
          and(
            eq(trackingEvents.shipmentId, row.id),
            eq(trackingEvents.tenantId, row.tenantId),
          ) as SQL | undefined,
        )
        .orderBy(desc(trackingEvents.eventTime));

      return {
        trackingNo: row.trackingNo,
        status: row.status,
        carrier: row.carrier,
        origin: row.origin,
        destination: row.destination,
        estimatedDelivery: row.estimatedDelivery,
        actualDelivery: row.actualDelivery,
        lastTrackedAt: row.lastTrackedAt,
        claimed: !!row.userId,
        events,
      };
    },
    60,
  );

  if (!data) return c.json({ error: 'Shipment not found' }, 404);

  return c.json({ data });
});

export default app;
