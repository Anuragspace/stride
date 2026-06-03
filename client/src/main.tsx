import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ToastContainer } from '@/components/ui/Toast';
import App from '@/App';
import '@/index.css';

// ─── Query Client ────────────────────────────────────────────────────────────
// gcTime must be >= maxAge for persistence to be useful.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,          // 30s — serve stale, refetch in background
      gcTime: 1000 * 60 * 60 * 24,  // 24h — keep in cache (persisted to storage)
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,      // Sync fresh data after reconnecting
    },
  },
});

// ─── Session Storage Persister ───────────────────────────────────────────────
// Persists React Query cache to sessionStorage so UI renders instantly on reload.
// sessionStorage is cleared when the browser tab is closed (more secure than localStorage).
const persister = createSyncStoragePersister({
  storage: window.sessionStorage,
  key: 'stride-query-cache',
  throttleTime: 1000, // Debounce writes — at most once per second
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24h — invalidate stale persisted cache
        buster: 'stride-v2',          // Bump this string to bust cache on breaking changes
      }}
    >
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <App />
            <ToastContainer />
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </PersistQueryClientProvider>
  </React.StrictMode>
);
