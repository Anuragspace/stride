import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import { setSocketIO } from '../lib/events';

const checkAllowedSocketOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (/^https:\/\/[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.vercel\.app$/.test(origin)) {
    callback(null, true);
    return;
  }
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const allowed = clientUrl.split(',').map((o) => o.trim()).some((o) => origin === o || origin.startsWith(o));
  callback(null, allowed);
};

export function setupSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: checkAllowedSocketOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    // Tight memory limits
    maxHttpBufferSize: 64 * 1024, // 64KB per message
    pingTimeout: 30000,
    pingInterval: 25000,
    // Limit connection buffer to prevent memory bloat
    connectTimeout: 10000,
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
      }
    });

    socket.on('leave:canvas', (canvasId: string) => {
      if (typeof canvasId === 'string' && canvasId.length > 0) {
        socket.leave(`canvas:${canvasId}`);
      }
    });

    // ─── Workspace Chat Typing Indicators ────────────────────────────────────
    socket.on('chat:typing:start', (data: { workspaceId: string }) => {
      if (data?.workspaceId) {
        socket.to(`workspace:${data.workspaceId}`).emit('chat:typing:user_started', {
          userId,
        });
      }
    });

    socket.on('chat:typing:stop', (data: { workspaceId: string }) => {
      if (data?.workspaceId) {
        socket.to(`workspace:${data.workspaceId}`).emit('chat:typing:user_stopped', {
          userId,
        });
      }
    });

    // ─── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      socket.rooms.forEach((room) => socket.leave(room));
    });
  });

  setSocketIO(io);
  return io;
}
