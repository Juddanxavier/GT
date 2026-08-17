import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { cacheClient, bullConnection } from './redis';
import { auth } from './auth';
import { db } from './db';
import { branches } from './db/schema';
import { eq, and } from 'drizzle-orm';
import { cacheGet, cacheSet } from './cache';

let io: SocketIOServer | null = null;

const BRANCH_CACHE_TTL = 300;

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) {
      const key = part.slice(0, i).trim();
      const val = part.slice(i + 1).trim();
      if (key && val) cookies[key] = val;
    }
  }
  return cookies;
}

async function branchExistsInTenant(branchId: string, tenantId: string): Promise<boolean> {
  const cacheKey = `socket:branch:${branchId}:tenant:${tenantId}`;
  const cached = await cacheGet<string | null>(null, cacheKey);
  if (cached === 'valid') return true;
  if (cached === 'invalid') return false;

  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.id, branchId), eq(branches.tenantId, tenantId)))
    .limit(1);

  const valid = !!branch;
  await cacheSet(null, cacheKey, valid ? 'valid' : 'invalid', BRANCH_CACHE_TTL);
  return valid;
}

export function createRealtimeServer(httpServer: Parameters<typeof SocketIOServer['prototype']['attach']>[0]): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',').map((s) => s.trim()),
      credentials: true,
    },
    path: '/socket.io',
  });

  // Redis adapter for horizontal scaling
  if (cacheClient && bullConnection) {
    const pubClient = cacheClient;
    const subClient = bullConnection.duplicate();
    subClient.on('error', () => {}); // suppress — connection errors handled upstream
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[realtime] Redis adapter attached');
  }

  // Authenticate every connection via Better Auth session cookie
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) return next(new Error('Authentication required'));

      const cookies = parseCookies(cookieHeader);
      const sessionToken = cookies['better-auth.session_token'];
      if (!sessionToken) return next(new Error('Session token not found'));

      const headers = new Headers();
      headers.set('cookie', cookieHeader);

      const session = await auth.api.getSession({ headers });
      if (!session) return next(new Error('Session expired or invalid'));

      const user = session.user as unknown as {
        id: string;
        role: string;
        tenantId?: string;
        branchId?: string;
      };

      socket.data.user = user;
      socket.data.session = session.session;
      next();
    } catch (error) {
      console.error('[realtime] auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as unknown as {
      id: string;
      role: string;
      tenantId?: string;
      branchId?: string;
    } | undefined;

    if (!user) {
      socket.disconnect();
      return;
    }

    // Join tenant room based on authenticated session, not query param
    if (user.tenantId) {
      socket.join(`tenant:${user.tenantId}`);
    }

    // Join personal room so per-user events (notifications) reach this user
    socket.join(`user:${user.id}`);

    // Staff always join their assigned branch room
    if (user.role === 'staff' && user.branchId && user.tenantId) {
      socket.join(`tenant:${user.tenantId}:branch:${user.branchId}`);
    }

    // Join branch on explicit request (tenant-admin only)
    socket.on('join:branch', async (branchId: string, callback?: (response: { error?: string }) => void) => {
      if (typeof branchId !== 'string' || !branchId) {
        callback?.({ error: 'Invalid branch ID' });
        return;
      }

      if (user.role === 'superadmin') {
        // Superadmin can join any branch — no tenant context needed
        // They must provide tenantId for branch resolution
        const tenantId = branchId.split(':')[0] ?? user.tenantId;
        if (tenantId) {
          socket.join(`tenant:${tenantId}:branch:${branchId}`);
          callback?.({});
        } else {
          callback?.({ error: 'Tenant context required' });
        }
        return;
      }

      if (user.role !== 'tenant-admin') {
        callback?.({ error: 'Only tenant-admins can switch branches' });
        return;
      }

      if (!user.tenantId) {
        callback?.({ error: 'No tenant assigned' });
        return;
      }

      const belongs = await branchExistsInTenant(branchId, user.tenantId);
      if (!belongs) {
        callback?.({ error: 'Branch not found in your organization' });
        return;
      }

      socket.join(`tenant:${user.tenantId}:branch:${branchId}`);
      callback?.({});
    });

    socket.on('disconnect', () => {
      console.log(`[realtime] socket ${socket.id} disconnected`);
    });
  });

  console.log('[realtime] server initialized');
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

// Helper: emit to all clients in a tenant room
export function emitToTenant(tenantId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`tenant:${tenantId}`).emit(event, data);
}

// Helper: emit to a single user (e.g. their in-app notifications)
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

// Helper: emit to a specific branch within a tenant
export function emitToBranch(tenantId: string, branchId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`tenant:${tenantId}:branch:${branchId}`).emit(event, data);
}

// Helper: emit to all connected clients (use sparingly — for global events)
export function emitGlobal(event: string, data: unknown): void {
  if (!io) return;
  io.emit(event, data);
}
