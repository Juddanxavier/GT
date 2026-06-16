/** @format */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { HonoAdapter } from '@bull-board/hono';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { auth } from './auth';
import { sessionMiddleware, type AuthVariables } from './middleware/auth';
import { tenantMiddleware, type TenantVariables } from './middleware/tenant';
import { requireRole } from './middleware/authorization';
import { queues } from './queues';
import { connectRedis } from './redis';
import path from 'node:path';

// Sentry initialization (must be first import)
import './instrument';

import { sentry } from '@sentry/hono/node';

type AppVariables = AuthVariables & TenantVariables;

const app = new Hono<{
  Variables: AppVariables;
}>();

// ── Middleware ──

app.use(
  '/api/auth/*',
  cors({
    origin: ['http://localhost:3000'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  }),
);

app.use('*', cors({
  origin: ['http://localhost:3000'],
  credentials: true,
}));

// Sentry error + performance monitoring
app.use('*', sentry(app));

// Auth handler
app.all('/api/auth/*', (c) => auth.handler(c.req.raw));

// Session
app.use('*', sessionMiddleware);

// Tenant (must run after session)
app.use('*', tenantMiddleware);

// ── Bull Board (job queue dashboard) ──

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
import webhooks from './routes/webhooks';
import debug from './routes/debug';
import invoicesRoute from './routes/invoices';
import dashboard from './routes/dashboard';

// ── Global error handler ──

app.onError((err, c) => {
  console.error('[api] unhandled error:', err);
  const e = err as Record<string, unknown>;
  const msg = err.message || 'Internal server error';
  const pgCode = (e as { code?: string }).code;
  const pgDetail = (e as { detail?: string }).detail;
  return c.json({
    error: msg.slice(0, 500),
    detail: pgDetail ?? null,
    code: pgCode ?? null,
  }, 500);
});

app.get('/', (c) => c.json({ message: 'ShipTrack API' }));

app.route('/api/branches', branches);
app.route('/api/customers', customers);
app.route('/api/quotations', quotations);
app.route('/api/shipments', shipments);
app.route('/api/tenants', tenants);
app.route('/api/users', users);
app.route('/webhooks', webhooks);
app.route('/api/debug', debug);
app.route('/api/invoices', invoicesRoute);
app.route('/api/dashboard', dashboard);

app.get('/api/staff/ping', requireRole('superadmin', 'tenant-admin', 'staff'), (c) => {
  return c.json({ message: 'Staff access granted' });
});

app.get('/api/me', (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);
  return c.json({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

app.get('/api/*', (c) => {
  const path = c.req.path;
  return c.json({ error: `Route not found: ${path}` }, 404);
});

// ── Start Server ──

async function main() {
  await connectRedis();

  // Start BullMQ workers (importing triggers instantiation)
  await import('./workers/index.js');
  const { startDlqMonitor } = await import('./workers/dlq-monitor.js');
  startDlqMonitor();

  const server = serve({
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
