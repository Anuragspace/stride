import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useAuth } from './AuthContext';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = React.useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const socket = connectSocket();
      socketRef.current = socket;

      const onConnect = () => setIsConnected(true);
      const onDisconnect = () => setIsConnected(false);
      const onConnectError = (err: Error) => {
        console.error('[Socket] Connection error:', err.message);
        if (
          err.message.includes('Authentication required') ||
          err.message.includes('Invalid or expired token')
        ) {
          console.warn('[Socket] Auth error, disconnecting socket to prevent polling flood');
          socket.disconnect();
        }
      };

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('connect_error', onConnectError);

      if (socket.connected) {
        setIsConnected(true);
      }

      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('connect_error', onConnectError);
        disconnectSocket();
        setIsConnected(false);
      };
    } else {
      disconnectSocket();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextValue {
  return useContext(SocketContext);
}
