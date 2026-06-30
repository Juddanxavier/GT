/** @format */

/**
 * Public (unauthenticated) endpoint for customers to claim a shipment
 * by verifying ownership via tracking number + email (or phone).
 *
 * POST /api/track/claim
 *   Body: { trackingNo, email?, phone?, name?, tenant? }
 *
 * Flow:
 *   1. Look up shipment by trackingNo (optionally scoped to a tenant slug)
 *   2. Verify the provided email/phone matches the shipment's contactEmail/contactPhone
 *   3. Find or create a customer record with that contact info
 *   4. Update the shipment's customerId to link it to the customer
 *   5. Return the shipment details (public-safe subset)
 */

import { and, eq, type SQL } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db';
import { customers, shipments, tenants } from '../db/schema';
import { cacheDel, cacheDelPattern } from '../cache';
import { notificationQueue } from '../queues';
import { statusToEventType } from '../notifications/event-map';
import { logAudit } from '../services/audit';
import type { InternalStatus } from '../shipment-providers/types';

const app = new Hono();

const claimSchema = z.object({
  trackingNo: z.string().min(1).max(255),
  email: z.string().email().max(255).optional(),
  phone: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(255).optional(),
  tenant: z.string().min(1).max(100).optional(),
});

app.post('/claim', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = claimSchema.safeParse(body);

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors)
      .map(([k, v]) => `${k}: ${v?.join(', ')}`)
      .join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const { trackingNo, email, phone, name, tenant: tenantSlug } = parsed.data;

  // Require at least one contact method
  if (!email && !phone) {
    return c.json({ error: 'Either email or phone is required to claim a shipment' }, 400);
  }

  // Build the shipment lookup
  const conditions: ReturnType<typeof eq>[] = [eq(shipments.trackingNo, trackingNo!)];
  let tenantId: string | null = null;

  if (tenantSlug) {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug!))
      .limit(1);

    if (!tenant) return c.json({ error: 'Tenant not found' }, 404);
    tenantId = tenant.id;
    conditions.push(eq(shipments.tenantId, tenant.id));
  }

  // Find the shipment
  const [ship] = await db
    .select({
      id: shipments.id,
      trackingNo: shipments.trackingNo,
      status: shipments.status,
      carrier: shipments.carrier,
      origin: shipments.origin,
      destination: shipments.destination,
      contactEmail: shipments.contactEmail,
      contactPhone: shipments.contactPhone,
      customerId: shipments.customerId,
      tenantId: shipments.tenantId,
    })
    .from(shipments)
    .where(and(...conditions) as SQL | undefined)
    .limit(1);

  if (!ship) return c.json({ error: 'Shipment not found' }, 404);

  // Verify the claim — the provided email or phone must match the shipment's contact info
  const providedEmail = email?.toLowerCase().trim();
  const storedEmail = ship.contactEmail?.toLowerCase().trim();
  const stripNonDigit = (s: string) => s.replace(/\D/g, '');
  const providedPhone = phone ? stripNonDigit(phone) : undefined;
  const storedPhone = ship.contactPhone ? stripNonDigit(ship.contactPhone) : undefined;

  const emailMatch = providedEmail && storedEmail && providedEmail === storedEmail;
  const phoneMatch = providedPhone && storedPhone && providedPhone === storedPhone;

  if (!emailMatch && !phoneMatch) {
    return c.json({
      error: 'The provided email/phone does not match the contact information on this shipment',
    }, 403);
  }

  // Already linked to a customer — no-op
  if (ship.customerId) {
    return c.json({
      data: {
        trackingNo: ship.trackingNo,
        status: ship.status,
        carrier: ship.carrier,
        origin: ship.origin,
        destination: ship.destination,
        message: 'This shipment is already linked to your account',
      },
    });
  }

  // Use the matched info for the customer lookup
  const matchedEmail = emailMatch ? ship.contactEmail : undefined;
  const matchedPhone = phoneMatch ? ship.contactPhone : undefined;
  const effectiveTenantId = tenantId ?? ship.tenantId;

  // Find or create the customer
  const customerConditions: ReturnType<typeof eq>[] = [
    eq(customers.tenantId, effectiveTenantId),
  ];
  if (matchedEmail) {
    customerConditions.push(eq(customers.email, matchedEmail!));
  } else if (matchedPhone) {
    customerConditions.push(eq(customers.phone, matchedPhone!));
  }

  let [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(...customerConditions) as SQL | undefined)
    .limit(1);

  if (!customer) {
    // Create a new customer record from the shipment contact info
    [customer] = await db
      .insert(customers)
      .values({
        name: name ?? ship.contactEmail ?? ship.contactPhone ?? 'Claimed Customer',
        email: matchedEmail ?? null,
        phone: matchedPhone ?? null,
        tenantId: effectiveTenantId,
      })
      .returning({ id: customers.id });
  }

  if (!customer) {
    return c.json({ error: 'Failed to create or find customer' }, 500);
  }

  // Link the shipment to the customer
  await db
    .update(shipments)
    .set({ customerId: customer.id, updatedAt: new Date() })
    .where(eq(shipments.id, ship.id));

  // Invalidate caches
  await cacheDel(effectiveTenantId, `shipments:${ship.id}`);
  await cacheDel(effectiveTenantId, `shipments:${ship.id}:tracking`);
  await cacheDelPattern(effectiveTenantId, 'shipments:list:*');

  // Trigger notification for newly claimed customer
  if (matchedEmail || matchedPhone) {
    const eventType = statusToEventType(ship.status as InternalStatus);
    if (eventType && notificationQueue) {
      const customerName = name ?? ship.contactEmail ?? ship.contactPhone ?? undefined;
      await notificationQueue.add('notify', {
        shipmentId: ship.id,
        eventId: `claimed:${customer.id}:${Date.now()}`,
        eventType,
        tenantId: effectiveTenantId,
        trackingNo: ship.trackingNo,
        labelCode: undefined,
        carrier: ship.carrier ?? undefined,
        origin: ship.origin ?? undefined,
        destination: ship.destination ?? undefined,
        customerName,
        customerEmail: matchedEmail ?? undefined,
        customerPhone: matchedPhone ?? undefined,
      });

      await logAudit('NOTIFICATION_SENT', null, {
        channel: 'notification_queue',
        type: 'customer_claimed',
        shipmentId: ship.id,
        trackingNo: ship.trackingNo,
        customerId: customer.id,
        eventType,
        tenantId: effectiveTenantId,
      });
    }
  }

  return c.json({
    data: {
      trackingNo: ship.trackingNo,
      status: ship.status,
      carrier: ship.carrier,
      origin: ship.origin,
      destination: ship.destination,
      message: 'Shipment successfully linked to your account. You will now receive tracking updates.',
    },
  });
});

export default app;
