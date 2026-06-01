import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import { setSocketIO } from '../lib/events';

export function setupSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ─── Authentication middleware ──────────────────────────────────────────────

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      (socket as any).userEmail = payload.email;
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  // ─── Connection handler ────────────────────────────────────────────────────

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    console.log(`[Socket.io] User connected: ${userId} (socket: ${socket.id})`);

    // Auto-join user's personal room for notifications
    socket.join(`user:${userId}`);

    // ─── Room management ────────────────────────────────────────────────────

    socket.on('join:workspace', (workspaceId: string) => {
      if (typeof workspaceId === 'string' && workspaceId.length > 0) {
        socket.join(`workspace:${workspaceId}`);
        console.log(`[Socket.io] User ${userId} joined workspace:${workspaceId}`);
      }
    });

    socket.on('leave:workspace', (workspaceId: string) => {
      if (typeof workspaceId === 'string' && workspaceId.length > 0) {
        socket.leave(`workspace:${workspaceId}`);
        console.log(`[Socket.io] User ${userId} left workspace:${workspaceId}`);
      }
    });

    socket.on('join:canvas', (canvasId: string) => {
      if (typeof canvasId === 'string' && canvasId.length > 0) {
        socket.join(`canvas:${canvasId}`);
        console.log(`[Socket.io] User ${userId} joined canvas:${canvasId}`);

        // Notify others in the canvas
        socket.to(`canvas:${canvasId}`).emit('user:joined_canvas', {
          userId,
          canvasId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on('leave:canvas', (canvasId: string) => {
      if (typeof canvasId === 'string' && canvasId.length > 0) {
        socket.leave(`canvas:${canvasId}`);
        console.log(`[Socket.io] User ${userId} left canvas:${canvasId}`);

        socket.to(`canvas:${canvasId}`).emit('user:left_canvas', {
          userId,
          canvasId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // ─── Presence / cursor (optional real-time collaboration features) ──────

    socket.on('cursor:move', (data: { canvasId: string; x: number; y: number }) => {
      if (data.canvasId) {
        socket.to(`canvas:${data.canvasId}`).emit('cursor:update', {
          userId,
          ...data,
        });
      }
    });

    socket.on('card:dragging', (data: { canvasId: string; cardId: string; columnId: string; position: number }) => {
      if (data.canvasId) {
        socket.to(`canvas:${data.canvasId}`).emit('card:drag_update', {
          userId,
          ...data,
        });
      }
    });

    // ─── Typing indicators ──────────────────────────────────────────────────

    socket.on('typing:start', (data: { cardId: string }) => {
      if (data.cardId) {
        socket.broadcast.emit('typing:user_started', {
          userId,
          cardId: data.cardId,
        });
      }
    });

    socket.on('typing:stop', (data: { cardId: string }) => {
      if (data.cardId) {
        socket.broadcast.emit('typing:user_stopped', {
          userId,
          cardId: data.cardId,
        });
      }
    });

    // ─── Disconnect ─────────────────────────────────────────────────────────

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] User disconnected: ${userId} (reason: ${reason})`);
    });
  });

  // Register the Socket.io instance with the event service
  setSocketIO(io);

  return io;
}
