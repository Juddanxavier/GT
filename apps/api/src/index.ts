/** @format */

import { serve, type ServerType } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { HonoAdapter } from '@bull-board/hono';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { auth } from './auth';
import { sessionMiddleware, type AuthVariables } from './middleware/auth';
import { securityHeadersMiddleware } from './middleware/security-headers';
import { requestIdMiddleware, type RequestIdVariables } from './middleware/request-id';
import { globalRateLimit } from './middleware/rate-limit';
import { tenantMiddleware, type TenantVariables } from './middleware/tenant';
import { branchMiddleware, type BranchVariables } from './middleware/branch';
import { requireRole } from './middleware/authorization';
import { queues } from './queues';
import { connectRedis, disconnectRedis } from './redis';
import { db } from './db';
import { tenants as tenantTable, user as userTable, branches } from './db/schema';
import { eq } from 'drizzle-orm';
import path from 'node:path';
import * as Sentry from '@sentry/hono/node';

// Global crash handlers (before any other code)
process.on('unhandledRejection', (reason) => {
  console.error('[process] unhandledRejection:', reason);
  Sentry.captureException(reason);
});

process.on('uncaughtException', (err) => {
  console.error('[process] uncaughtException:', err);
  Sentry.captureException(err);
});

// Sentry instrumentation (must be imported early)
import './instrument';

function validateEnv(): void {
  const required = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'] as const;
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[env] Missing required variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (!process.env.TRACK_WEBHOOK_SECRET) {
    console.warn('[env] TRACK_WEBHOOK_SECRET is empty — 17TRACK webhook verification will reject all requests');
  }
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.REDIS_URL) {
      console.warn('[env] REDIS_URL is empty — job queues and real-time features will be unavailable');
    }
    if (!process.env.SEED_SECRET) {
      console.warn('[env] SEED_SECRET is empty — superadmin seed endpoint is unprotected');
    }
  }
}

type AppVariables = AuthVariables & TenantVariables & BranchVariables & RequestIdVariables;

const app = new Hono<{
  Variables: AppVariables;
}>();

// ── Middleware ──

const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? ['http://localhost:3000'];

app.use(
  '/api/auth/*',
  cors({
    origin: corsOrigins,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  }),
);

app.use('*', cors({
  origin: corsOrigins,
  credentials: true,
}));

// Request ID (before all other middleware)
app.use('*', requestIdMiddleware);

// Request logging
app.use('*', async (c, next) => {
  const start = Date.now();
  const reqId = c.get('requestId');
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'info', reqId, method: c.req.method, path: c.req.path }));
  await next();
  const ms = Date.now() - start;
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'info', reqId, status: c.res.status, ms }));
});

// Security headers
app.use('*', securityHeadersMiddleware);

// Sentry error + performance monitoring
app.use('*', Sentry.sentry(app));

// Custom forgot-password route — always returns 200 to prevent email enumeration
app.post('/api/auth/forgot-password', async (c) => {
  const { email } = await c.req.json<{ email?: string }>();

  if (!email || typeof email !== 'string') {
    return c.json({ error: 'Email is required' }, 400);
  }

  const [user] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  if (user) {
    await auth.api.requestPasswordResetEmailOTP({
      body: { email },
    });
  }

  return c.json({ data: { success: true } });
});

// Auth handler
app.all('/api/auth/*', (c) => auth.handler(c.req.raw));

// Session
app.use('*', sessionMiddleware);

// Tenant (must run after session)
app.use('*', tenantMiddleware);

// Branch validation (must run after tenant)
app.use('*', branchMiddleware);

// Rate limiting (POST/PUT/DELETE)
app.use('*', globalRateLimit());

// ── Bull Board (job queue dashboard) ──

app.use('/jobs/*', requireRole('superadmin'));

if (queues.length > 0) {
  const serverAdapter = new HonoAdapter(serveStatic);

  serverAdapter.setBasePath('/jobs');
  serverAdapter.setStaticPath('/static', path.join(process.cwd(), 'node_modules/@bull-board/ui/dist/static'));
  serverAdapter.setViewsPath(path.join(process.cwd(), 'node_modules/@bull-board/ui/dist/view'));

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });

  app.route('/jobs', serverAdapter.registerPlugin());
}

// ── Routes ──

import branches from './routes/branches';
import customers from './routes/customers';
import quotations from './routes/quotations';
import shipments from './routes/shipments';
import tenants from './routes/tenants';
import users from './routes/users';
import onboard from './routes/onboard';
import webhooks from './routes/webhooks';
import debug from './routes/debug';
import invoicesRoute from './routes/invoices';
import dashboard from './routes/dashboard';
import reports from './routes/reports';
import searchRoute from './routes/search';
import { runArchive } from './services/archive';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { closeTransport } from './email/provider';

// ── Global error handler ──

app.onError((err, c) => {
  const requestId = c.get('requestId');
  console.error(`[api] unhandled error (requestId=${requestId}):`, err);
  Sentry.captureException(err, {
    contexts: { request: { request_id: requestId } },
  });
  return c.json({ error: 'Internal server error', requestId }, 500);
});

// Seed super admin (one-time, protected by SEED_SECRET)
app.post('/api/seed/superadmin', async (c) => {
  const secret = c.req.header('X-Seed-Secret');
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const email = 'juddan2008@gmail.com';
  const [existing] = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, email)).limit(1);
  if (existing) return c.json({ message: 'Super admin already exists' });
  await auth.api.createUser({
    body: { email, password: 'B7a90sfd@12', name: 'Super Admin', role: 'superadmin' },
  });
  return c.json({ message: 'Super admin created' });
});

// Seed tenants + all demo data (protected by SEED_SECRET)
app.post('/api/seed/tenant', async (c) => {
  const secret = c.req.header('X-Seed-Secret');
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // ── Tenants ──
  const existingTenants = await db.select().from(tenantTable);
  const gajan = existingTenants.find((t) => t.slug === 'gajan-traders') ?? (await db.insert(tenantTable).values({ name: 'Gajan Traders', slug: 'gajan-traders', country: 'India' }).returning())[0];
  const lanka = existingTenants.find((t) => t.slug === 'lanka-mahal') ?? (await db.insert(tenantTable).values({ name: 'Lanka Mahal', slug: 'lanka-mahal', country: 'Sri Lanka' }).returning())[0];

  // ── Branches ──
  await db.delete(branches);
  const [mumbaiHq, delhi, chennai] = await db.insert(branches).values([
    { name: 'Mumbai HQ', tenantId: gajan.id, phone: '+91-22-12345678', email: 'mumbai@gajantraders.com', address: '123 Business District, Mumbai' },
    { name: 'Delhi Branch', tenantId: gajan.id, phone: '+91-11-87654321', email: 'delhi@gajantraders.com', address: '456 Connaught Place, New Delhi' },
    { name: 'Chennai Branch', tenantId: gajan.id, phone: '+91-44-23456789', email: 'chennai@gajantraders.com', address: '789 Anna Salai, Chennai' },
  ]).returning();
  const [colomboHq, kandy, jaffna] = await db.insert(branches).values([
    { name: 'Colombo HQ', tenantId: lanka.id, phone: '+94-11-2345678', email: 'colombo@lankamahal.lk', address: '1 Galle Road, Colombo 03' },
    { name: 'Kandy Branch', tenantId: lanka.id, phone: '+94-81-3456789', email: 'kandy@lankamahal.lk', address: '45 Peradeniya Road, Kandy' },
    { name: 'Jaffna Branch', tenantId: lanka.id, phone: '+94-21-4567890', email: 'jaffna@lankamahal.lk', address: '78 Hospital Road, Jaffna' },
  ]).returning();

  // ── Users ──
  const usersData = [
    { name: 'Gajan Admin', email: 'admin@gajantraders.com', password: 'Admin@123', role: 'tenant-admin', tenantId: gajan.id, branchId: mumbaiHq.id },
    { name: 'Gajan Staff Mumbai', email: 'staff-mumbai@gajantraders.com', password: 'Staff@123', role: 'staff', tenantId: gajan.id, branchId: mumbaiHq.id },
    { name: 'Gajan Staff Delhi', email: 'staff-delhi@gajantraders.com', password: 'Staff@123', role: 'staff', tenantId: gajan.id, branchId: delhi.id },
    { name: 'Gajan Staff Chennai', email: 'staff-chennai@gajantraders.com', password: 'Staff@123', role: 'staff', tenantId: gajan.id, branchId: chennai.id },
    { name: 'Lanka Admin', email: 'admin@lankamahal.lk', password: 'Admin@123', role: 'tenant-admin', tenantId: lanka.id, branchId: colomboHq.id },
    { name: 'Lanka Staff Colombo', email: 'staff-colombo@lankamahal.lk', password: 'Staff@123', role: 'staff', tenantId: lanka.id, branchId: colomboHq.id },
    { name: 'Lanka Staff Kandy', email: 'staff-kandy@lankamahal.lk', password: 'Staff@123', role: 'staff', tenantId: lanka.id, branchId: kandy.id },
    { name: 'Lanka Staff Jaffna', email: 'staff-jaffna@lankamahal.lk', password: 'Staff@123', role: 'staff', tenantId: lanka.id, branchId: jaffna.id },
  ];
  for (const u of usersData) {
    const [existing] = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, u.email)).limit(1);
    if (existing) continue;
    await auth.api.createUser({
      body: { email: u.email, password: u.password, name: u.name, role: u.role, data: { tenantId: u.tenantId, branchId: u.branchId } },
    });
  }

  return c.json({ message: 'Seed complete: tenants, branches, users created' });
});

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => c.json({ message: 'ShipTrack API' }));

app.route('/api/branches', branches);
app.route('/api/customers', customers);
app.route('/api/quotations', quotations);
app.route('/api/shipments', shipments);
app.route('/api/tenants', tenants);
app.route('/api/users', users);
app.route('/api/onboard', onboard);
app.route('/webhooks', webhooks);
if (process.env.NODE_ENV !== 'production') {
  app.route('/api/debug', debug);
}
app.route('/api/invoices', invoicesRoute);
app.route('/api/dashboard', dashboard);
app.route('/api/reports', reports);
app.route('/api/search', searchRoute);

// Manual archive trigger (protected)
app.post('/api/cron/archive', requireRole('superadmin'), async (c) => {
  const result = await runArchive();
  return c.json({
    data: {
      archived: result.archived,
      skeletonized: result.skeletonized,
      purged: result.purged,
    },
  });
});

app.get('/api/staff/ping', requireRole('superadmin', 'tenant-admin', 'staff'), (c) => {
  return c.json({ message: 'Staff access granted' });
});

app.get('/api/me', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);
  const u = user as Record<string, unknown>;
  const tenantId = u.tenantId as string | undefined;
  let tenantCountry: string | null = null;
  if (tenantId) {
    const [t] = await db.select({ country: tenantTable.country }).from(tenantTable).where(eq(tenantTable.id, tenantId)).limit(1);
    if (t) tenantCountry = t.country;
  }
  return c.json({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: u.role as string | undefined,
      tenantId,
      tenantName: u.tenantName as string | undefined,
      tenantCountry,
    },
  });
});

app.get('/api/*', (c) => {
  const path = c.req.path;
  return c.json({ error: `Route not found: ${path}` }, 404);
});

// ── Start Server ──

let server: ServerType;

async function main() {
  validateEnv();

  await connectRedis();

  // Run DB migrations on startup
  await migrate(db, { migrationsFolder: './src/db/migrations' });

  // Start BullMQ workers (importing triggers instantiation)
  await import('./workers/index.js');
  const { startDlqMonitor } = await import('./workers/dlq-monitor.js');
  startDlqMonitor();

  server = serve({
    fetch: app.fetch,
    port: Number(process.env.PORT) || 3001,
  });

  // Wire Socket.IO into the HTTP server
  const { createRealtimeServer } = await import('./realtime.js');
  createRealtimeServer(server);

  console.log(`[api] server running on http://localhost:${Number(process.env.PORT) || 3001}`);
}

main().catch((err) => {
  console.error('[api] failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`[api] received ${signal}, shutting down gracefully...`);

  // Stop accepting new connections
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // Close BullMQ workers (drain running jobs)
  const { closeWorkers } = await import('./workers/index.js');
  await closeWorkers();

  // Close BullMQ queues
  const { closeQueues } = await import('./queues/index.js');
  await closeQueues();

  // Close Socket.IO
  const { getIO } = await import('./realtime.js');
  getIO()?.close();

  // Close email transport
  closeTransport();

  // Disconnect Redis last (workers/queues depend on it)
  await disconnectRedis();

  console.log('[api] shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
