import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { cacheClient, bullConnection } from './redis';

let io: SocketIOServer | null = null;

export function createRealtimeServer(httpServer: Parameters<typeof SocketIOServer['prototype']['attach']>[0]): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true,
    },
    path: '/socket.io',
  });

  // Redis adapter for horizontal scaling
  if (cacheClient && bullConnection) {
    const pubClient = cacheClient;
    const subClient = bullConnection.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[realtime] Redis adapter attached');
  }

  io.on('connection', (socket) => {
    const tenantId = socket.handshake.query.tenantId as string | undefined;

    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
      console.log(`[realtime] socket ${socket.id} joined tenant:${tenantId}`);
    }

    socket.on('join:branch', (branchId: string) => {
      if (tenantId) {
        socket.join(`tenant:${tenantId}:branch:${branchId}`);
      }
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
  io?.to(`tenant:${tenantId}`).emit(event, data);
}

// Helper: emit to a specific branch within a tenant
export function emitToBranch(tenantId: string, branchId: string, event: string, data: unknown): void {
  io?.to(`tenant:${tenantId}:branch:${branchId}`).emit(event, data);
}

// Helper: emit to all connected clients (use sparingly — for global events)
export function emitGlobal(event: string, data: unknown): void {
  io?.emit(event, data);
}
