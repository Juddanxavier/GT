/** @format */

import { serve, type ServerType } from '@hono/node-server';
import type { Socket } from 'node:net';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { bodyLimit } from 'hono/body-limit';
import { timeout } from 'hono/timeout';
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
import { signInHandler } from './middleware/lockout';
import { isRedisConnected, queues } from './queues';
import { cacheClient, connectRedis, disconnectRedis } from './redis';
import { db } from './db';
import { tenants as tenantTable, user as userTable, branches as branchTable } from './db/schema';
import { eq, sql } from 'drizzle-orm';
import path from 'node:path';
import * as Sentry from '@sentry/hono/node';
import { getEmailProviderStatus, closeTransport } from './email/provider';

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
      console.warn('[env] SEED_SECRET is empty — superadmin seed endpoint will reject all requests. Set SEED_SECRET to enable it.');
    }
  }
}

type AppVariables = AuthVariables & TenantVariables & BranchVariables & RequestIdVariables & LoggerVariables;

const app = new Hono<{
  Variables: AppVariables;
}>();

// ── Middleware ──
// Middleware execution order matters:
// 1. CORS — must run first to set response headers before any other middleware
// 2. Compression — compresses response bodies
// 3. Request ID — assigns unique ID for logging before anything else
// 4. Request logging — captures incoming request
// 5. Security headers — sets secure defaults on all responses
// 6. Sentry — error/performance monitoring
// 6. Lockout check — runs before auth handler for sign-in
// 7. Forgot-password — runs before auth handler
// 8. Auth handler — Better Auth (owns /api/auth/*)
// 9. Session middleware — populates user context
// 10. Tenant middleware — determines tenant from user/session/header
// 11. Branch middleware — validates X-Branch-ID against tenant (depends on tenant)
// 12. Rate limiting — limits per-route requests (depends on session for authenticated limits)

const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim());
const corsOrigin = corsOrigins && corsOrigins.length > 0
  ? corsOrigins
  : process.env.NODE_ENV === 'production'
    ? [] // reject all origins in production — must set CORS_ORIGIN explicitly
    : (origin: string) => origin;

app.use(
  '/api/auth/*',
  cors({
    origin: corsOrigin,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  }),
);

app.use('*', cors({
  origin: corsOrigin,
  credentials: true,
}));

// Body size limit (before anything that reads the body)
app.use('*', bodyLimit({ maxSize: 5 * 1024 * 1024, onError: (c) => errorResponse(c, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 5 MB limit', 413) }));

// Content-Type validation for write methods (POST/PUT/PATCH)
app.use('*', async (c, next) => {
  const method = c.req.method;
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const ct = c.req.header('Content-Type') ?? '';
    if (!ct.includes('application/json') && !ct.includes('multipart/form-data')) {
      return errorResponse(c, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json', 415);
    }
  }
  await next();
});

// Request timeout
app.use('*', timeout(60000));

// Compression (before request ID to compress before logging)
app.use('*', compress());

// Request ID (before all other middleware)
app.use('*', requestIdMiddleware);

// Request logging
app.use('*', async (c, next) => {
  const start = Date.now();
  const reqId = c.get('requestId');
  const log = childLogger({ reqId });
  c.set('logger', log);
  log.info({ method: c.req.method, path: c.req.path }, 'incoming request');
  await next();
  const ms = Date.now() - start;
  const user = c.get('user') as { id?: string; tenantId?: string; role?: string } | null;
  const tenantId = c.get('tenantId');
  log.info({
    status: c.res.status, ms,
    userId: user?.id,
    tenantId: tenantId || user?.tenantId,
    role: user?.role,
  }, 'response');
});

// Security headers
app.use('*', securityHeadersMiddleware);

// Sentry error + performance monitoring
app.use('*', Sentry.sentry(app));

// ── Public Routes (no auth/session required — registered before session middleware) ──

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness check (DB + Redis)
app.get('/api/ready', async (c) => {
  const checks: Record<string, string> = {};
  let allReady = true;

  try {
    await db.execute(sql`SELECT 1`);
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    allReady = false;
  }

  checks.redis = isRedisConnected() ? 'ok' : 'disconnected';
  if (!isRedisConnected()) allReady = false;

  return c.json({ status: allReady ? 'ok' : 'degraded', checks }, allReady ? 200 : 503);
});

// Seed super admin (one-time, protected by SEED_SECRET)
app.post('/api/seed/superadmin', async (c) => {
  const secret = c.req.header('X-Seed-Secret');
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return errorResponse(c, 'UNAUTHORIZED', 'Unauthorized', 401);
  }
  const email = process.env.SEED_SUPERADMIN_EMAIL || 'juddan2008@gmail.com';
  const password = process.env.SEED_SUPERADMIN_PASSWORD;
  if (!password) {
    return errorResponse(c, 'CONFIG_ERROR', 'SEED_SUPERADMIN_PASSWORD environment variable is required', 500);
  }
  const [existing] = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, email)).limit(1);
  if (existing) return c.json({ message: 'Super admin already exists' });
  await (auth.api as any).createUser({
    body: { email, password, name: process.env.SEED_SUPERADMIN_NAME || 'Super Admin', role: 'superadmin' },
  });
  return c.json({ message: 'Super admin created' });
});

// Seed tenants + all demo data (protected by SEED_SECRET)
app.post('/api/seed/tenant', async (c) => {
  const secret = c.req.header('X-Seed-Secret');
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return errorResponse(c, 'UNAUTHORIZED', 'Unauthorized', 401);
  }

  // ── Tenants ──
  const existingTenants = await db.select().from(tenantTable);
  const gajan = existingTenants.find((t) => t.slug === 'gajan-traders') ?? (await db.insert(tenantTable).values({ name: 'Gajan Traders', slug: 'gajan-traders', country: 'India' }).returning())[0]!;
  const lanka = existingTenants.find((t) => t.slug === 'lanka-mahal') ?? (await db.insert(tenantTable).values({ name: 'Lanka Mahal', slug: 'lanka-mahal', country: 'Sri Lanka' }).returning())[0]!;

  // ── Branches ──
  await db.delete(branchTable);
  const gBranches = await db.insert(branchTable).values([
    { name: 'Mumbai HQ', tenantId: gajan!.id, phone: '+91-22-12345678', email: 'mumbai@gajantraders.com', address: '123 Business District, Mumbai' },
    { name: 'Delhi Branch', tenantId: gajan!.id, phone: '+91-11-87654321', email: 'delhi@gajantraders.com', address: '456 Connaught Place, New Delhi' },
    { name: 'Chennai Branch', tenantId: gajan!.id, phone: '+91-44-23456789', email: 'chennai@gajantraders.com', address: '789 Anna Salai, Chennai' },
  ]).returning();
  const mumbaiHq = gBranches[0]!;
  const delhi = gBranches[1]!;
  const chennai = gBranches[2]!;

  const lBranches = await db.insert(branchTable).values([
    { name: 'Colombo HQ', tenantId: lanka!.id, phone: '+94-11-2345678', email: 'colombo@lankamahal.lk', address: '1 Galle Road, Colombo 03' },
    { name: 'Kandy Branch', tenantId: lanka!.id, phone: '+94-81-3456789', email: 'kandy@lankamahal.lk', address: '45 Peradeniya Road, Kandy' },
    { name: 'Jaffna Branch', tenantId: lanka!.id, phone: '+94-21-4567890', email: 'jaffna@lankamahal.lk', address: '78 Hospital Road, Jaffna' },
  ]).returning();
  const colomboHq = lBranches[0]!;
  const kandy = lBranches[1]!;
  const jaffna = lBranches[2]!;

  // ── Users ──
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
  const seedStaffPassword = process.env.SEED_STAFF_PASSWORD || 'Staff@123';
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn('[seed] SEED_ADMIN_PASSWORD not set — using default password. Set it in production!');
  }
  if (!process.env.SEED_STAFF_PASSWORD) {
    console.warn('[seed] SEED_STAFF_PASSWORD not set — using default password. Set it in production!');
  }

  const usersData = [
    { name: 'Gajan Admin', email: 'admin@gajantraders.com', password: seedAdminPassword, role: 'tenant-admin', tenantId: gajan!.id, branchId: mumbaiHq.id },
    { name: 'Gajan Staff Mumbai', email: 'staff-mumbai@gajantraders.com', password: seedStaffPassword, role: 'staff', tenantId: gajan!.id, branchId: mumbaiHq.id },
    { name: 'Gajan Staff Delhi', email: 'staff-delhi@gajantraders.com', password: seedStaffPassword, role: 'staff', tenantId: gajan!.id, branchId: delhi.id },
    { name: 'Gajan Staff Chennai', email: 'staff-chennai@gajantraders.com', password: seedStaffPassword, role: 'staff', tenantId: gajan!.id, branchId: chennai.id },
    { name: 'Lanka Admin', email: 'admin@lankamahal.lk', password: seedAdminPassword, role: 'tenant-admin', tenantId: lanka!.id, branchId: colomboHq.id },
    { name: 'Lanka Staff Colombo', email: 'staff-colombo@lankamahal.lk', password: seedStaffPassword, role: 'staff', tenantId: lanka!.id, branchId: colomboHq.id },
    { name: 'Lanka Staff Kandy', email: 'staff-kandy@lankamahal.lk', password: seedStaffPassword, role: 'staff', tenantId: lanka!.id, branchId: kandy.id },
    { name: 'Lanka Staff Jaffna', email: 'staff-jaffna@lankamahal.lk', password: seedStaffPassword, role: 'staff', tenantId: lanka!.id, branchId: jaffna.id },
  ];
  for (const u of usersData) {
    const [existing] = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, u.email)).limit(1);
    if (existing) continue;
    await (auth.api as any).createUser({
      body: { email: u.email, password: u.password, name: u.name, role: u.role, data: { tenantId: u.tenantId, branchId: u.branchId } },
    });
  }

  return c.json({ message: 'Seed complete: tenants, branches, users created' });
});

// Public tracking endpoints (no auth required)
app.route('/api/track', publicTrack);
app.route('/api/track', claimShipment);

// Webhooks (no auth — verified via webhook secret)
app.route('/webhooks', webhooks);

// Debug routes (non-production only)
if (process.env.NODE_ENV !== 'production') {
  app.route('/api/debug', debug);
}

// Root API info
app.get('/', (c) => c.json({ message: 'ShipTrack API' }));

// Lockout check + forward to auth handler
app.post('/api/auth/sign-in/email', signInHandler);

// Forgot-password with email existence check + rate limiting
app.post('/api/auth/forgot-password', async (c) => {
  const parsed = forgotPasswordSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '), 400);
  const { email, redirectTo } = parsed.data!;

  // Rate limit: 3 requests per 5 minutes per email
  // (Better Auth's built-in rate limiter is bypassed by this custom handler)
  if (cacheClient) {
    try {
      const key = `forgot-pw:${email.toLowerCase().trim()}`;
      const count = await cacheClient.incr(key);
      if (count === 1) {
        await cacheClient.expire(key, 300);
      }
      if (count > 3) {
        return errorResponse(c, 'RATE_LIMITED', 'Too many password reset requests. Please try again later.', 429);
      }
    } catch (err) {
      console.error('[forgot-password] Redis rate limit error:', err instanceof Error ? err.message : err);
    }
  } else {
    console.warn('[forgot-password] Redis unavailable — rate limiting disabled!');
  }

  const [user] = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, email)).limit(1);
  if (user) {
    await auth.api.requestPasswordReset({ body: { email, redirectTo: redirectTo || '/reset-password' } });
  }
  return c.json({ success: true });
});

// Auth handler
app.all('/api/auth/*', (c) => auth.handler(c.req.raw));

// Session
app.use('*', sessionMiddleware);

// Tenant (must run after session)
app.use('*', tenantMiddleware);

// Branch validation (must run after tenant)
app.use('*', branchMiddleware);

// Rate limiting for API routes (auth routes use Better Auth's built-in rate limiter)
app.use('*', globalRateLimit());

// ── Bull Board (job queue dashboard) ──

// CSRF check for Bull Board: reject non-GET cross-origin requests
app.use('/jobs/*', async (c, next) => {
  if (!['GET', 'HEAD'].includes(c.req.method)) {
    const origin = c.req.header('Origin');
    if (origin && !origin.startsWith(new URL(c.req.url).origin)) {
      return errorResponse(c, 'FORBIDDEN', 'Cross-origin request rejected', 403);
    }
  }
  await next();
});

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
import invitations from './routes/invitations';
import onboard from './routes/onboard';
import webhooks from './routes/webhooks';
import debug from './routes/debug';
import invoicesRoute from './routes/invoices';
import dashboard from './routes/dashboard';
import reports from './routes/reports';
import searchRoute from './routes/search';
import notificationsRoute from './routes/notifications';
import publicTrack from './routes/public-track';
import claimShipment from './routes/claim-shipment';
import auditLogsRoute from './routes/audit-logs';
import { runArchive } from './services/archive';
import { logAudit } from './services/audit';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { errorResponse } from './error-response';
import { forgotPasswordSchema } from './validators';
import { childLogger, logger } from './logger';
import type { LoggerVariables } from './logger';
// ── Global error handler ──

app.onError((err, c) => {
  const requestId = c.get('requestId');
  const log = c.get('logger') ?? logger;
  log.error({ err, requestId }, 'Unhandled error');
  Sentry.captureException(err, {
    contexts: { request: { request_id: requestId } },
  });
  return errorResponse(c, 'INTERNAL_ERROR', 'Internal server error', 500);
});

// Email diagnostics (requires authentication)
app.get('/api/diagnostics/email', sessionMiddleware, (c) => {
  const user = c.get('user');
  if (!user) return errorResponse(c, 'AUTH_REQUIRED', 'Not authenticated', 401);
  const email = getEmailProviderStatus();
  return c.json({
    email,
    redis: {
      connected: isRedisConnected(),
      urlConfigured: !!process.env.REDIS_URL,
    },
    bullMq: {
      activeQueues: queues.length,
      queueNames: queues.map((q) => q.name),
    },
    env: {
      nodeEnv: process.env.NODE_ENV,
      zeptomailApiKey: !!process.env.ZEPTOMAIL_API_KEY,
      zeptomailPass: !!process.env.ZEPTOMAIL_PASS,
      redisUrl: !!process.env.REDIS_URL,
    },
  });
});

app.route('/api/branches', branches);
app.route('/api/customers', customers);
app.route('/api/quotations', quotations);
app.route('/api/shipments', shipments);
app.route('/api/tenants', tenants);
app.route('/api/users', users);
app.route('/api/invitations', invitations);
app.route('/api/onboard', onboard);
app.route('/api/invoices', invoicesRoute);
app.route('/api/dashboard', dashboard);
app.route('/api/reports', reports);
app.route('/api/search', searchRoute);
app.route('/api/notifications', notificationsRoute);

// Audit log viewer
app.route('/api/audit-logs', auditLogsRoute);

// Manual archive trigger (protected)
app.post('/api/cron/archive', requireRole('superadmin'), async (c) => {
  const result = await runArchive();
  const user = c.get('user');
  await logAudit('ARCHIVE_RUN', user?.id ?? null, {
    archived: result.archived,
    skeletonized: result.skeletonized,
    purged: result.purged,
    notificationsArchived: result.notificationsArchived,
    notificationsSkeletonized: result.notificationsSkeletonized,
    notificationsPurged: result.notificationsPurged,
    trigger: 'manual',
  }, c);
  return c.json({ data: result });
});

app.get('/api/staff/ping', requireRole('superadmin', 'tenant-admin', 'staff'), (c) => {
  return c.json({ message: 'Staff access granted' });
});

app.get('/api/me', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse(c, 'AUTH_REQUIRED', 'Not authenticated', 401);
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
  return errorResponse(c, 'ROUTE_NOT_FOUND', `Route not found: ${c.req.path}`, 404);
});

// ── Start Server ──

let server: ServerType;
const sockets = new Set<Socket>();

async function main() {
  validateEnv();

  await connectRedis();

  // Run DB migrations on startup
  await migrate(db, { migrationsFolder: './src/db/migrations' });

  // Ensure default tenants exist
  const existingTenants = await db.select().from(tenantTable);
  if (!existingTenants.find((t) => t.slug === 'gajan-traders')) {
    await db.insert(tenantTable).values({ name: 'Gajan Traders', slug: 'gajan-traders', country: 'India' });
  }
  if (!existingTenants.find((t) => t.slug === 'lanka-mahal')) {
    await db.insert(tenantTable).values({ name: 'Lanka Mahal', slug: 'lanka-mahal', country: 'Sri Lanka' });
  }

  // Start BullMQ workers (importing triggers instantiation)
  await import('./workers/index.js');
  const { startDlqMonitor } = await import('./workers/dlq-monitor.js');
  startDlqMonitor();

  // Run archive on startup to catch up (non-blocking — runs in background)
  runArchive()
    .then((result) => {
      console.log(
        `[archive] startup run — archived ${result.archived}, skeletonized ${result.skeletonized}, purged ${result.purged}, notifications ${result.notificationsArchived}/${result.notificationsSkeletonized}/${result.notificationsPurged}`,
      );
    })
    .catch((err: Error) => {
      console.error('[archive] startup run failed:', err.message);
    });

  server = serve({
    fetch: app.fetch,
    port: Number(process.env.PORT) || 3001,
  });

  // Track active connections for graceful shutdown
  server.on('connection', (socket: Socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  // Wire Socket.IO into the HTTP server
  const { createRealtimeServer } = await import('./realtime.js');
  createRealtimeServer(server);

  console.log(`[api] server running on http://localhost:${Number(process.env.PORT) || 3001}`);
}

if (!process.env.VITEST) {
  main().catch((err) => {
    console.error('[api] failed to start:', err);
    process.exit(1);
  });
}

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`[api] received ${signal}, shutting down gracefully...`);

  // Force exit after 10s if shutdown hangs
  const forceExit = setTimeout(() => {
    console.error('[api] shutdown timed out — force exiting');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  // Stop accepting new connections + destroy idle sockets
  if (server) {
    server.close();
    for (const socket of sockets) {
      if (!socket.destroyed) socket.destroy();
    }
  }

  try {
    const { closeWorkers } = await import('./workers/index.js');
    await closeWorkers();
  } catch (err) {
    console.error('[api] error closing workers:', err);
  }

  try {
    const { closeQueues } = await import('./queues/index.js');
    await closeQueues();
  } catch (err) {
    console.error('[api] error closing queues:', err);
  }

  // Close Socket.IO
  try {
    const { getIO } = await import('./realtime.js');
    getIO()?.close();
  } catch { /* realtime may not be initialized */ }

  // Close email transport
  closeTransport();

  // Disconnect Redis last (workers/queues depend on it)
  await disconnectRedis();

  clearTimeout(forceExit);
  console.log('[api] shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
