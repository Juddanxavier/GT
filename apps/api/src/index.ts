/** @format */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from './auth';
import { sessionMiddleware, type AuthVariables } from './middleware/auth';

const app = new Hono<{
  Variables: AuthVariables;
}>();

// Global CORS
app.use('*', cors({
  origin: ['http://localhost:3000'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// Logging middleware to debug auth routes
app.use('/api/auth/*', async (c, next) => {
  console.log(`[auth-request] ${c.req.method} ${c.req.raw.url}`);
  await next();
  console.log(`[auth-response] ${c.res.status}`);
});

// Better Auth handler
app.all('/api/auth/*', (c) => auth.handler(c.req.raw));

// Session middleware
app.use('*', sessionMiddleware);

// Health check
app.get('/', (c) => {
  return c.json({ message: 'ShipTrack API' });
});

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3001,
});
