import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Card, CardStatus, CardPriority } from '@/types';

// ─── Helpers for mapping server <-> client data formats ────────────────────

const mapColumnNameToStatus = (name: string): string => {
  switch (name?.toLowerCase()) {
    case 'not started':
    case 'not_started':
      return 'not_started';
    case 'in progress':
    case 'in_progress':
      return 'in_progress';
    case 'on hold':
    case 'on_hold':
      return 'on_hold';
    case 'done':
      return 'done';
    default:
      return 'not_started';
  }
};

const mapPriorityToNumber = (priority: string): number => {
  switch (priority?.toLowerCase()) {
    case 'low':
      return 1;
    case 'medium':
      return 2;
    case 'high':
    case 'urgent':
      return 3;
    default:
      return 2;
  }
};

const mapPriorityToString = (priority: number | string): string => {
  if (typeof priority === 'string') return priority;
  switch (priority) {
    case 1:
      return 'low';
    case 2:
      return 'medium';
    case 3:
      return 'high';
    default:
      return 'medium';
  }
};

export const mapCardFromServer = (card: any): Card => ({
  id: card.id,
  canvasId: card.canvasId,
  columnId: card.columnId,
  title: card.title,
  description: card.description,
  status: mapColumnNameToStatus(card.column?.name || ''),
  priority: mapPriorityToNumber(card.priority),
  type: card.type || 'task',
  orderIndex: card.position,
  dueDate: card.dueDate,
  createdBy: card.created_by || '',
  createdAt: card.createdAt,
  updatedAt: card.updatedAt,
  assignees: card.assignees?.map((a: any) => ({
    cardId: a.cardId,
    userId: a.userId,
    user: {
      id: a.user.id,
      name: a.user.name,
      email: a.user.email,
      avatar_url: a.user.avatarUrl, // Normalize to camelCase/snakeCase expected by client
    },
    assignedAt: a.assignedAt,
  })) || [],
  labels: card.labels || [],
  subtasks: card.subtasks || card.subTasks || [],
});

export function useCards(canvasId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['cards', canvasId];

  const { data: cards, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<Card[]> => {
      const { data } = await api.get(`/cards?canvasId=${canvasId}`);
      const rawCards = data.data?.cards || [];
      return rawCards.map(mapCardFromServer);
    },
    enabled: !!canvasId,
  });

  const createMutation = useMutation({
    mutationFn: async (newCard: Partial<Card>) => {
      // 1. Get the canvas to find its columns
      const { data: canvasRes } = await api.get(`/canvases/${canvasId}`);
      const columns = canvasRes.data?.canvas?.columns || [];
      const targetStatus = newCard.status || 'not_started';
      const targetColumn = columns.find(
        (col: any) => mapColumnNameToStatus(col.name) === targetStatus
      );
      const columnId = targetColumn?.id || (columns[0]?.id);

      if (!columnId) throw new Error('No column found for this canvas');

      // 2. Create the card
      const payload = {
        canvasId,
        columnId,
        title: newCard.title,
        description: newCard.description,
        type: newCard.type || 'task',
        priority: mapPriorityToString(newCard.priority ?? 1),
        dueDate: newCard.dueDate,
      };

      const { data } = await api.post('/cards', payload);
      return mapCardFromServer(data.data.card);
    },
    onMutate: async (newCard) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Card[]>(queryKey);
      const optimistic: Card = {
        id: `temp-${Date.now()}`,
        canvasId: canvasId,
        title: newCard.title || '',
        status: newCard.status || 'not_started',
        priority: newCard.priority || 1,
        type: newCard.type || 'task',
        orderIndex: (previous?.length || 0) + 1,
        createdBy: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...newCard,
      } as Card;
      queryClient.setQueryData<Card[]>(queryKey, [...(previous || []), optimistic]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Card> & { id: string }) => {
      const { id, status, ...rest } = updates;
      
      let columnId: string | undefined = undefined;
      if (status) {
        // Fetch columns to find matching columnId
        const { data: canvasRes } = await api.get(`/canvases/${canvasId}`);
        const columns = canvasRes.data?.canvas?.columns || [];
        const targetColumn = columns.find(
          (col: any) => mapColumnNameToStatus(col.name) === status
        );
        columnId = targetColumn?.id;
      }

      const payload: any = {
        ...rest,
      };
      if (updates.priority !== undefined) {
        payload.priority = mapPriorityToString(updates.priority);
      }
      if (columnId) {
        payload.columnId = columnId;
      }

      const { data } = await api.patch(`/cards/${id}`, payload);
      return mapCardFromServer(data.data.card);
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Card[]>(queryKey);
      queryClient.setQueryData<Card[]>(queryKey, (old) =>
        old?.map((card) =>
          card.id === updates.id ? { ...card, ...updates, updatedAt: new Date().toISOString() } : card
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (cardId: string) => {
      await api.delete(`/cards/${cardId}`);
    },
    onMutate: async (cardId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Card[]>(queryKey);
      queryClient.setQueryData<Card[]>(queryKey, (old) =>
        old?.filter((card) => card.id !== cardId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const completeCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const { data } = await api.post(`/cards/${cardId}/complete`);
      return mapCardFromServer(data.data.card);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const reopenCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const { data } = await api.post(`/cards/${cardId}/reopen`);
      return mapCardFromServer(data.data.card);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const bulkUpdateCardsMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Card> }) => {
      await Promise.all(
        ids.map(async (id) => {
          const { status, ...rest } = updates;
          let columnId: string | undefined = undefined;
          if (status) {
            const { data: canvasRes } = await api.get(`/canvases/${canvasId}`);
            const columns = canvasRes.data?.canvas?.columns || [];
            const targetColumn = columns.find(
              (col: any) => mapColumnNameToStatus(col.name) === status
            );
            columnId = targetColumn?.id;
          }

          const payload: any = {
            ...rest,
          };
          if (updates.priority !== undefined) {
            payload.priority = mapPriorityToString(updates.priority);
          }
          if (columnId) {
            payload.columnId = columnId;
          }
          await api.patch(`/cards/${id}`, payload);
        })
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const moveCard = async (cardId: string, newStatus: CardStatus, newPosition: number) => {
    const previous = queryClient.getQueryData<Card[]>(queryKey);
    queryClient.setQueryData<Card[]>(queryKey, (old) =>
      old?.map((card) =>
        card.id === cardId
          ? { ...card, status: newStatus, orderIndex: newPosition }
          : card
      )
    );
    try {
      // Fetch columns to find matching columnId
      const { data: canvasRes } = await api.get(`/canvases/${canvasId}`);
      const columns = canvasRes.data?.canvas?.columns || [];
      const targetColumn = columns.find(
        (col: any) => mapColumnNameToStatus(col.name) === newStatus
      );
      const columnId = targetColumn?.id;
      if (!columnId) throw new Error('No matching column found');

      await api.post(`/cards/${cardId}/move`, {
        columnId,
        position: newPosition,
      });
      queryClient.invalidateQueries({ queryKey });
    } catch {
      if (previous) queryClient.setQueryData(queryKey, previous);
    }
  };

  return {
    cards,
    isLoading,
    createCard: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateCard: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteCard: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    completeCard: completeCardMutation.mutateAsync,
    reopenCard: reopenCardMutation.mutateAsync,
    bulkUpdateCards: bulkUpdateCardsMutation.mutateAsync,
    isBulkUpdating: bulkUpdateCardsMutation.isPending,
    moveCard,
  };
}

