/** @format */

/**
 * Public (unauthenticated) endpoint for customers to claim a shipment
 * by verifying ownership via tracking number + email (or phone).
 *
 * POST /api/track/claim
 *   Body: { trackingNo, email?, phone?, name?, tenant? }
 *
 * POST /api/track/claim/init
 *   Body: { trackingNo }
 *   Initiates OTP-based claim: sends 6-digit OTP to shipment's contact email.
 *
 * POST /api/track/claim/verify-otp
 *   Body: { trackingNo, otpCode }
 *   Verifies OTP and links shipment to matching customer.
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
import { user, shipments, tenants } from '../db/schema';
import { cacheDel, cacheDelPattern } from '../cache';
import { createUser } from '../auth-api';
import { notificationQueue } from '../queues';
import { statusToEventType } from '../notifications/event-map';
import { sendEmail } from '../email/provider';
import { logAudit } from '../services/audit';
import { generateOtp, verifyOtp, maskEmail } from '../services/otp';
import { globalRateLimit } from '../middleware/rate-limit';
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
      userId: shipments.userId,
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
  if (ship.userId) {
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

  // Find or create the user (customer)
  const matchConditions: ReturnType<typeof eq>[] = [eq(user.tenantId, effectiveTenantId)];
  if (matchedEmail) {
    matchConditions.push(eq(user.email, matchedEmail!));
  } else if (matchedPhone) {
    matchConditions.push(eq(user.phone, matchedPhone!));
  }

  let [matchedUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(...matchConditions) as SQL | undefined)
    .limit(1);

  if (!matchedUser) {
    // Create a new user account from the shipment contact info
    const randomPwd = crypto.randomUUID();
    const created = await createUser({ email: matchedEmail ?? `${ship.trackingNo?.toLowerCase()}@claim.gajantraders.com`, password: randomPwd, name: name ?? ship.contactEmail ?? ship.contactPhone ?? 'Claimed Customer', role: 'customer', tenantId: effectiveTenantId, data: { phone: matchedPhone } });
    matchedUser = { id: created.user.id };
  } else if (matchedPhone) {
    // Update phone on existing user
    await db.update(user).set({ phone: matchedPhone }).where(eq(user.id, matchedUser.id));
  }

  if (!matchedUser) {
    return c.json({ error: 'Failed to create or find user account' }, 500);
  }

  // Link the shipment to the user
  await db
    .update(shipments)
    .set({ userId: matchedUser.id, customerName: name, updatedAt: new Date() })
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
        eventId: `claimed:${matchedUser.id}:${Date.now()}`,
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
        userId: matchedUser.id,
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

// ── OTP-based claim flow ──

app.post('/claim/init', globalRateLimit({ windowSeconds: 600, maxRequests: 3, keyPrefix: 'claim-otp' }), async (c) => {
  const { trackingNo } = await c.req.json().catch(() => ({}));
  if (!trackingNo || typeof trackingNo !== 'string' || trackingNo.length > 255) {
    return c.json({ error: 'Valid trackingNo is required' }, 400);
  }

  // Find shipment
  const [ship] = await db
    .select({
      id: shipments.id,
      trackingNo: shipments.trackingNo,
      contactEmail: shipments.contactEmail,
      userId: shipments.userId,
      tenantId: shipments.tenantId,
    })
    .from(shipments)
    .where(eq(shipments.trackingNo, trackingNo))
    .limit(1);

  if (!ship) return c.json({ error: 'Shipment not found' }, 404);
  if (ship.userId) return c.json({ error: 'Shipment already claimed' }, 409);

  const email = ship.contactEmail;
  if (!email) return c.json({ error: 'No contact email on record for this shipment' }, 400);

  const otp = generateOtp(trackingNo, email);
  try {
    const brandColor = '#059669';
    await sendEmail({
      to: email,
      subject: `Your OTP for tracking ${trackingNo}`,
      html: `<div style="font-family:Inter,system-ui,sans-serif;padding:32px;max-width:480px;margin:0 auto">
        <div style="text-align:center;margin-bottom:24px">
          <div style="width:48px;height:48px;background:${brandColor};border-radius:12px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;color:white;font-size:24px;font-weight:700">GT</div>
        </div>
        <h2 style="font-size:20px;font-weight:600;margin:0 0 8px">Verify your shipment claim</h2>
        <p style="color:#52525b;font-size:14px;line-height:1.5;margin:0 0 20px">Use the code below to claim tracking number <strong>${trackingNo}</strong>:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:10px;text-align:center;padding:20px;background:#f4f4f5;border-radius:12px;margin:0 0 20px;color:#18181b">${otp}</div>
        <p style="color:#71717a;font-size:13px;margin:0 0 4px">This code expires in 10 minutes.</p>
        <p style="color:#a1a1aa;font-size:12px;margin:0">If you did not request this, please ignore this email.</p>
      </div>`,
    });
  } catch (err) {
    console.error('[claim] failed to send OTP email:', err);
    return c.json({ error: 'Failed to send verification code' }, 500);
  }

  return c.json({ message: 'OTP sent to your email', email: maskEmail(email) });
});

app.post('/claim/verify-otp', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = z.object({ trackingNo: z.string().min(1).max(255), otpCode: z.string().length(6) }).safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Valid trackingNo and otpCode (6 digits) are required' }, 400);
  }

  const { trackingNo, otpCode } = parsed.data;

  if (!verifyOtp(trackingNo, otpCode)) {
    return c.json({ error: 'Invalid or expired OTP' }, 400);
  }

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
      userId: shipments.userId,
      tenantId: shipments.tenantId,
    })
    .from(shipments)
    .where(eq(shipments.trackingNo, trackingNo))
    .limit(1);

  if (!ship) return c.json({ error: 'Shipment not found' }, 404);
  if (ship.userId) return c.json({ error: 'Shipment already claimed' }, 409);

  // Find or create user by contact email
  const effectiveTenantId = ship.tenantId;
  const matchedEmail = ship.contactEmail;

  let [matchedUser] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(and(eq(user.tenantId, effectiveTenantId), eq(user.email, matchedEmail!)))
    .limit(1);

  if (!matchedUser) {
    const randomPwd = crypto.randomUUID();
    const created = await createUser({ email: matchedEmail ?? 'claimed@claim.gajantraders.com', password: randomPwd, name: matchedEmail ?? 'Claimed Customer', role: 'customer', tenantId: effectiveTenantId, data: { phone: ship.contactPhone } });
    matchedUser = { id: created.user.id, name: created.user.name };
  }

  if (!matchedUser) return c.json({ error: 'Failed to create or find user account' }, 500);

  await db
    .update(shipments)
    .set({ userId: matchedUser.id, customerName: matchedUser.name, updatedAt: new Date() })
    .where(eq(shipments.id, ship.id));

  await cacheDel(effectiveTenantId, `shipments:${ship.id}`);
  await cacheDel(effectiveTenantId, `shipments:${ship.id}:tracking`);
  await cacheDelPattern(effectiveTenantId, 'shipments:list:*');

  logAudit('NOTIFICATION_SENT', null, {
    channel: 'claim',
    type: 'customer_claimed_otp',
    shipmentId: ship.id,
    trackingNo: ship.trackingNo,
    userId: matchedUser.id,
    tenantId: effectiveTenantId,
  });

  return c.json({
    data: {
      trackingNo: ship.trackingNo,
      status: ship.status,
      carrier: ship.carrier,
      message: 'Shipment successfully claimed via OTP verification',
    },
  });
});

// ── Resend OTP ──
app.post('/claim/resend-otp', globalRateLimit({ windowSeconds: 600, maxRequests: 3, keyPrefix: 'claim-otp' }), async (c) => {
  const { trackingNo } = await c.req.json().catch(() => ({}));
  if (!trackingNo || typeof trackingNo !== 'string' || trackingNo.length > 255) {
    return c.json({ error: 'Valid trackingNo is required' }, 400);
  }

  const [ship] = await db
    .select({ contactEmail: shipments.contactEmail, userId: shipments.userId })
    .from(shipments)
    .where(eq(shipments.trackingNo, trackingNo))
    .limit(1);

  if (!ship) return c.json({ error: 'Shipment not found' }, 404);
  if (ship.userId) return c.json({ error: 'Shipment already claimed' }, 409);

  const email = ship.contactEmail;
  if (!email) return c.json({ error: 'No contact email on record for this shipment' }, 400);

  const otp = generateOtp(trackingNo, email);
  const brandColor = '#059669';
  try {
    await sendEmail({
      to: email,
      subject: `Your OTP for tracking ${trackingNo}`,
      html: `<div style="font-family:Inter,system-ui,sans-serif;padding:32px;max-width:480px;margin:0 auto">
        <div style="text-align:center;margin-bottom:24px">
          <div style="width:48px;height:48px;background:${brandColor};border-radius:12px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;color:white;font-size:24px;font-weight:700">GT</div>
        </div>
        <h2 style="font-size:20px;font-weight:600;margin:0 0 8px">Your OTP code (resend)</h2>
        <p style="color:#52525b;font-size:14px;line-height:1.5;margin:0 0 20px">Use the code below to claim tracking number <strong>${trackingNo}</strong>:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:10px;text-align:center;padding:20px;background:#f4f4f5;border-radius:12px;margin:0 0 20px;color:#18181b">${otp}</div>
        <p style="color:#71717a;font-size:13px;margin:0 0 4px">This code expires in 10 minutes.</p>
        <p style="color:#a1a1aa;font-size:12px;margin:0">If you did not request this, please ignore this email.</p>
      </div>`,
    });
  } catch (err) {
    console.error('[claim] failed to resend OTP email:', err);
    return c.json({ error: 'Failed to send verification code' }, 500);
  }

  return c.json({ message: 'OTP resent to your email', email: maskEmail(email) });
});

export default app;
