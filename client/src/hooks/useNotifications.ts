import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Notification } from '@/types';

// Map server Notification structure to UI expectation
interface ClientNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const queryKey = ['notifications'];

  const { data: notifications, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<ClientNotification[]> => {
      const { data } = await api.get('/notifications');
      const rawNotifications = data.data?.notifications || [];
      return rawNotifications.map((n: any) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.message,
        is_read: n.read,
        created_at: n.createdAt,
      }));
    },
    refetchInterval: 30000, // Poll every 30s
  });

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

