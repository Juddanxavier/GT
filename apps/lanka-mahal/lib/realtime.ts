import { io, type Socket } from 'socket.io-client';
import { getQueryClient } from '@/lib/query-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(tenantId: string): Socket {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, {
    query: { tenantId },
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });

  // ponytail: customer toast UI not implemented yet — events are logged to console
  socket.on('tracking:updated', (data: { shipmentId: string; trackingNo: string; status: string }) => {
    console.log('[realtime] tracking:updated', data);
  });

  // In-app notifications: refresh bell badge + list live
  socket.on('notification:new', () => {
    const qc = getQueryClient();
    qc.invalidateQueries({ queryKey: ['unread-count'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
