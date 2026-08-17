import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db';
import { tenants, branches, user, shipments, quotations, invoices } from '../db/schema';
import { errorResponse } from '../error-response';
import { requireRole } from '../middleware/authorization';
import { fireNotificationSchema } from '../validators';
import { notificationQueue } from '../queues';
import { logAudit } from '../services/audit';

const app = new Hono();

// ── Seed Verification ──
// GET /api/debug/seed-status — checks that all expected seed data exists
// Superadmin only; routes are mounted only when ENABLE_DEBUG=true

app.get('/seed-status', requireRole('superadmin'), async (c) => {
  const report: Record<string, unknown> = {};
  let allOk = true;

  // 1. Tenants
  const allTenants = await db.select().from(tenants);
  const gajan = allTenants.find((t) => t.slug === 'gajan-traders');
  const lanka = allTenants.find((t) => t.slug === 'lanka-mahal');
  report.tenants = {
    total: allTenants.length,
    gajan_traders: gajan ? { id: gajan.id, country: gajan.country } : null,
    lanka_mahal: lanka ? { id: lanka.id, country: lanka.country } : null,
  };
  if (!gajan) { allOk = false; report.tenants = { ...report.tenants as object, error: 'MISSING: gajan-traders' }; }
  if (!lanka) { allOk = false; report.tenants = { ...report.tenants as object, error: 'MISSING: lanka-mahal' }; }

  // 2. Branches per tenant
  if (gajan) {
    const gBranches = await db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.tenantId, gajan.id));
    report.gajan_branches = { count: gBranches.length, names: gBranches.map((b) => b.name) };
    if (gBranches.length === 0) { allOk = false; report.gajan_branches = { ...report.gajan_branches as object, error: 'MISSING: no branches for gajan-traders' }; }
  }
  if (lanka) {
    const lBranches = await db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.tenantId, lanka.id));
    report.lanka_branches = { count: lBranches.length, names: lBranches.map((b) => b.name) };
    if (lBranches.length === 0) { allOk = false; report.lanka_branches = { ...report.lanka_branches as object, error: 'MISSING: no branches for lanka-mahal' }; }
  }

  // 3. Users
  const allUsers = await db.select({ id: user.id, name: user.name, email: user.email, role: user.role }).from(user);
  report.users = {
    total: allUsers.length,
    by_role: {
      superadmin: allUsers.filter((u) => u.role === 'superadmin').length,
      tenant_admin: allUsers.filter((u) => u.role === 'tenant-admin').length,
      staff: allUsers.filter((u) => u.role === 'staff').length,
      customer: allUsers.filter((u) => u.role === 'customer').length,
    },
    sample: allUsers.slice(0, 5).map((u) => ({ name: u.name, email: u.email, role: u.role })),
  };

  // 4. Customer users per tenant
  if (gajan) {
    const [gCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(user).where(and(eq(user.tenantId, gajan.id), eq(user.role, 'customer')));
    report.gajan_customers = gCount?.count ?? 0;
  }
  if (lanka) {
    const [lCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(user).where(and(eq(user.tenantId, lanka.id), eq(user.role, 'customer')));
    report.lanka_customers = lCount?.count ?? 0;
  }

  // 5. Shipments per tenant
  if (gajan) {
    const [gCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(shipments).where(eq(shipments.tenantId, gajan.id));
    report.gajan_shipments = gCount?.count ?? 0;
  }
  if (lanka) {
    const [lCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(shipments).where(eq(shipments.tenantId, lanka.id));
    report.lanka_shipments = lCount?.count ?? 0;
  }

  // 6. Quotations per tenant
  if (gajan) {
    const [qCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(quotations).where(eq(quotations.tenantId, gajan.id));
    report.gajan_quotations = qCount?.count ?? 0;
  }
  if (lanka) {
    const [qCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(quotations).where(eq(quotations.tenantId, lanka.id));
    report.lanka_quotations = qCount?.count ?? 0;
  }

  // 7. Invoices per tenant
  if (gajan) {
    const [iCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(invoices).where(eq(invoices.tenantId, gajan.id));
    report.gajan_invoices = iCount?.count ?? 0;
  }
  if (lanka) {
    const [iCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(invoices).where(eq(invoices.tenantId, lanka.id));
    report.lanka_invoices = iCount?.count ?? 0;
  }

  report.ok = allOk;
  return c.json({ data: report });
});

app.post('/fire-notification', requireRole('superadmin'), async (c) => {
  const parsed = fireNotificationSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '), 400);
  const { shipmentId, eventType } = parsed.data!;

  const ship = await db
    .select({
      id: shipments.id,
      trackingNo: shipments.trackingNo,
      tenantId: shipments.tenantId,
    })
    .from(shipments)
    .where(eq(shipments.id, shipmentId))
    .limit(1);

  if (!ship.length) {
    return c.json({ error: 'Shipment not found' }, 404);
  }

  if (!notificationQueue) {
    return c.json({ error: 'Redis/BullMQ not available' }, 503);
  }

  await notificationQueue.add('notify', {
    shipmentId: ship[0]!.id,
    eventId: `manual:${Date.now()}`,
    eventType,
    tenantId: ship[0]!.tenantId,
    trackingNo: ship[0]!.trackingNo,
  });

  const currentUser = (c as any).get('user') as { id: string } | undefined;
  await logAudit('NOTIFICATION_SENT', currentUser?.id ?? null, {
    channel: 'email',
    queue: 'notification',
    type: 'debug_manual',
    shipmentId,
    eventType,
    tenantId: ship[0]!.tenantId,
  }, c);

  return c.json({ message: `Notification queued for ${shipmentId} (${eventType})` });
});

export default app;
