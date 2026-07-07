// Socket.IO real-time client for the admin app
// Connection and notification listeners are in app/(dashboard)/layout.tsx
// This module re-exports the socket utilities for use elsewhere.

export { getSocket, connectSocket, disconnectSocket } from './socket';
