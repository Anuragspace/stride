import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSocketContext } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';

interface ClientNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

const mapNotification = (n: any): ClientNotification => ({
  id: n.id,
  userId: n.userId,
  type: n.type,
  title: n.title,
  body: n.message,
  is_read: n.read,
  created_at: n.createdAt,
});

export function useNotifications() {
  const queryClient = useQueryClient();
  const queryKey = ['notifications'];
  const { socket, isConnected } = useSocketContext();
  const { user } = useAuth();

  // ─── Initial fetch ─────────────────────────────────────────────────────────
  const { data: notifications, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<ClientNotification[]> => {
      const { data } = await api.get('/notifications');
      const raw = data.data?.notifications || [];
      return raw.map(mapNotification);
    },
    staleTime: 1000 * 60, // 1 minute stale-while-revalidate
    // NO refetchInterval — socket keeps this live
  });

  // ─── Real-time: socket pushes new notifications instantly ─────────────────
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const handleNewNotification = (raw: any) => {
      const notification = mapNotification(raw);
      queryClient.setQueryData<ClientNotification[]>(queryKey, (old) => {
        if (!old) return [notification];
        // Prepend and deduplicate
        const exists = old.some((n) => n.id === notification.id);
        if (exists) return old;
        return [notification, ...old];
      });
    };

    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket, isConnected, user, queryClient]);

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.post(`/notifications/${notificationId}/read`);
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ClientNotification[]>(queryKey);
      queryClient.setQueryData<ClientNotification[]>(queryKey, (old) =>
        old?.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ClientNotification[]>(queryKey);
      queryClient.setQueryData<ClientNotification[]>(queryKey, (old) =>
        old?.map((n) => ({ ...n, is_read: true }))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
  };
}
