import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io('/', {
      autoConnect: false,
      withCredentials: true,
      auth: {
        token: getAccessToken(),
      },
      // Try WebSocket first; fall back to polling if WS is blocked
      transports: ['websocket', 'polling'],
      // Reconnection settings — handles Render OOM restarts gracefully
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 20000,
    });

    // Refresh auth token on reconnect (token may have changed since disconnect)
    socket.on('reconnect_attempt', () => {
      if (socket && socket.auth && typeof socket.auth === 'object') {
        (socket.auth as Record<string, unknown>).token = getAccessToken();
      }
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (s.auth && typeof s.auth === 'object') {
    (s.auth as Record<string, unknown>).token = getAccessToken();
  }
  if (!s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

export const joinRoom = (room: string) => {
  if (!socket) return;
  if (room.startsWith('canvas:')) {
    socket.emit('join:canvas', room.replace('canvas:', ''));
  } else if (room.startsWith('workspace:')) {
    socket.emit('join:workspace', room.replace('workspace:', ''));
  } else {
    socket.emit('join', room);
  }
};

export const leaveRoom = (room: string) => {
  if (!socket) return;
  if (room.startsWith('canvas:')) {
    socket.emit('leave:canvas', room.replace('canvas:', ''));
  } else if (room.startsWith('workspace:')) {
    socket.emit('leave:workspace', room.replace('workspace:', ''));
  } else {
    socket.emit('leave', room);
  }
};
