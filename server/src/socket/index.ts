import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import { setSocketIO } from '../lib/events';

// Allow all Vercel deployment URLs + explicit CLIENT_URL
const isAllowedSocketOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (/^https:\/\/[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.vercel\.app$/.test(origin)) return true;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  return clientUrl.split(',').map((o) => o.trim()).some((o) => origin === o || origin.startsWith(o));
};

export function setupSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: isAllowedSocketOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    // Limit per-socket memory: reduce max buffer sizes
    maxHttpBufferSize: 1e5, // 100KB max per message (default is 1MB)
    // Ping settings — detect dead connections faster to free memory
    pingTimeout: 20000,
    pingInterval: 25000,
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
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ─── Connection handler ────────────────────────────────────────────────────

  io.on('connection', (socket) => {
    const userId = (socket as any).userId as string;

    // Auto-join user's personal room for notifications
    socket.join(`user:${userId}`);

    // ─── Room management ─────────────────────────────────────────────────────

    socket.on('join:workspace', (workspaceId: string) => {
      if (typeof workspaceId === 'string' && workspaceId.length > 0) {
        socket.join(`workspace:${workspaceId}`);
      }
    });

    socket.on('leave:workspace', (workspaceId: string) => {
      if (typeof workspaceId === 'string' && workspaceId.length > 0) {
        socket.leave(`workspace:${workspaceId}`);
      }
    });

    socket.on('join:canvas', (canvasId: string) => {
      if (typeof canvasId === 'string' && canvasId.length > 0) {
        socket.join(`canvas:${canvasId}`);
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
        socket.to(`canvas:${canvasId}`).emit('user:left_canvas', {
          userId,
          canvasId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // ─── Presence / cursor ───────────────────────────────────────────────────

    socket.on('cursor:move', (data: { canvasId: string; x: number; y: number }) => {
      if (data?.canvasId) {
        socket.to(`canvas:${data.canvasId}`).emit('cursor:update', { userId, ...data });
      }
    });

    socket.on('card:dragging', (data: { canvasId: string; cardId: string; columnId: string; position: number }) => {
      if (data?.canvasId) {
        socket.to(`canvas:${data.canvasId}`).emit('card:drag_update', { userId, ...data });
      }
    });

    // ─── Typing indicators (scoped to canvas room, not broadcast to everyone) ─

    socket.on('typing:start', (data: { cardId: string; canvasId: string }) => {
      if (data?.cardId && data?.canvasId) {
        socket.to(`canvas:${data.canvasId}`).emit('typing:user_started', {
          userId,
          cardId: data.cardId,
        });
      }
    });

    socket.on('typing:stop', (data: { cardId: string; canvasId: string }) => {
      if (data?.cardId && data?.canvasId) {
        socket.to(`canvas:${data.canvasId}`).emit('typing:user_stopped', {
          userId,
          cardId: data.cardId,
        });
      }
    });

    // ─── Disconnect ──────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      // Explicitly leave all rooms to free socket.io internal maps
      socket.rooms.forEach((room) => socket.leave(room));
    });
  });

  setSocketIO(io);
  return io;
}
