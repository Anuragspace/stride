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
  completed: card.completed || false,
  assignees: card.assignees?.map((a: any) => ({
    cardId: a.cardId,
    userId: a.userId,
    user: {
      id: a.user.id,
      name: a.user.name,
      email: a.user.email,
      avatarUrl: a.user.avatarUrl,
      avatar_url: a.user.avatarUrl,
      createdAt: a.user.createdAt || new Date().toISOString(),
    },
    assignedAt: a.assignedAt,
  })) || [],
  labels: card.labels || [],
  subtasks: card.subtasks || card.subTasks || [],
});

// ─── Column cache: avoid re-fetching canvas on every card mutation ──────────

function useCanvasColumns(canvasId: string) {
  return useQuery({
    queryKey: ['canvas-columns', canvasId],
    queryFn: async () => {
      const { data } = await api.get(`/canvases/${canvasId}`);
      return (data.data?.canvas?.columns || []) as Array<{ id: string; name: string }>;
    },
    enabled: !!canvasId,
    staleTime: 1000 * 60 * 5, // 5 minutes — columns rarely change
    gcTime: 1000 * 60 * 30,   // keep in cache 30 minutes
  });
}

export function useCards(canvasId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['cards', canvasId];

  // Pre-load columns into cache (used by mutations without extra fetch)
  const { data: canvasColumns = [] } = useCanvasColumns(canvasId);

  const { data: cards, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<Card[]> => {
      const { data } = await api.get(`/cards?canvasId=${canvasId}`);
      const rawCards = data.data?.cards || [];
      return rawCards.map(mapCardFromServer);
    },
    enabled: !!canvasId,
    staleTime: 1000 * 30, // 30 seconds — serve from cache, refetch silently
  });

  // ─── Helper: resolve columnId from status without extra HTTP call ─────────
  const resolveColumnId = (status: string): string | undefined => {
    const col = canvasColumns.find(
      (c) => mapColumnNameToStatus(c.name) === status
    );
    return col?.id;
  };

  const createMutation = useMutation({
    mutationFn: async (newCard: Partial<Card>) => {
      // Use cached columns — no extra HTTP call
      const targetStatus = newCard.status || 'not_started';
      const columnId =
        resolveColumnId(targetStatus) ?? canvasColumns[0]?.id;

      if (!columnId) throw new Error('No column found for this canvas');

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

      // Build fully-shaped optimistic card — renders immediately on board
      const optimistic: Card = {
        id: `temp-${Date.now()}`,
        canvasId,
        title: newCard.title || '',
        status: newCard.status || 'not_started',
        priority: newCard.priority || 1,
        type: newCard.type || 'task',
        orderIndex: (previous?.length || 0) + 1,
        createdBy: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignees: [],
        labels: [],
        subtasks: [],
        completed: false,
        _isPending: true,
        ...newCard,
      } as Card & { _isPending?: boolean };

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

      // Use cached columns — no extra HTTP call
      let columnId: string | undefined = undefined;
      if (status) {
        columnId = resolveColumnId(status);
      }

      const payload: any = { ...rest };
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

      const mappedUpdates = { ...updates };
      if ((updates as any).position !== undefined) {
        (mappedUpdates as any).orderIndex = (updates as any).position;
      }
      if (updates.assignees) {
        mappedUpdates.assignees = (updates.assignees as any[]).map((u: any) => {
          if (u.user) {
            return {
              cardId: u.cardId || updates.id,
              userId: u.userId,
              user: {
                id: u.user.id,
                name: u.user.name,
                email: u.user.email,
                avatarUrl: u.user.avatarUrl || u.user.avatar_url,
                avatar_url: u.user.avatarUrl || u.user.avatar_url,
                createdAt: u.user.createdAt || new Date().toISOString(),
              },
              assignedAt: u.assignedAt || new Date().toISOString(),
            };
          }
          return {
            cardId: updates.id,
            userId: u.id,
            user: {
              id: u.id,
              name: u.name,
              email: u.email,
              avatarUrl: u.avatarUrl || u.avatar_url,
              avatar_url: u.avatarUrl || u.avatar_url,
              createdAt: new Date().toISOString(),
            },
            assignedAt: new Date().toISOString(),
          };
        }) as any;
      }

      queryClient.setQueryData<Card[]>(queryKey, (old) =>
        old?.map((card) =>
          card.id === updates.id
            ? { ...card, ...mappedUpdates, updatedAt: new Date().toISOString() }
            : card
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
      // Remove immediately — 0ms perceived deletion
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
    onMutate: async (cardId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Card[]>(queryKey);
      queryClient.setQueryData<Card[]>(queryKey, (old) =>
        old?.map((card) =>
          card.id === cardId
            ? { ...card, completed: true, completedAt: new Date().toISOString() }
            : card
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

  const reopenCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const { data } = await api.post(`/cards/${cardId}/reopen`);
      return mapCardFromServer(data.data.card);
    },
    onMutate: async (cardId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Card[]>(queryKey);
      queryClient.setQueryData<Card[]>(queryKey, (old) =>
        old?.map((card) =>
          card.id === cardId ? { ...card, completed: false, completedAt: null } : card
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

  const bulkUpdateCardsMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Card> }) => {
      // Single bulk request — resolves columnId from cache, no extra fetches
      const { status, ...rest } = updates;
      const columnId = status ? resolveColumnId(status) : undefined;

      const payload: any = { ...rest };
      if (updates.priority !== undefined) {
        payload.priority = mapPriorityToString(updates.priority);
      }
      if (columnId) {
        payload.columnId = columnId;
      }

      await Promise.all(ids.map((id) => api.patch(`/cards/${id}`, payload)));
    },
    onMutate: async ({ ids, updates }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Card[]>(queryKey);
      queryClient.setQueryData<Card[]>(queryKey, (old) =>
        old?.map((card) =>
          ids.includes(card.id) ? { ...card, ...updates } : card
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (payload: {
      updates: { id: string; position: number; assigneeIds?: string[] }[];
      optimisticCards?: Card[];
    }) => {
      const { data } = await api.post('/cards/reorder', { updates: payload.updates });
      const rawCards = data.data?.cards || [];
      return rawCards.map(mapCardFromServer);
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Card[]>(queryKey);

      if (payload.optimisticCards) {
        queryClient.setQueryData<Card[]>(queryKey, payload.optimisticCards);
      } else {
        queryClient.setQueryData<Card[]>(queryKey, (old) => {
          if (!old) return [];
          return old.map((card) => {
            const update = payload.updates.find((u) => u.id === card.id);
            if (!update) return card;
            return {
              ...card,
              orderIndex: update.position,
              updatedAt: new Date().toISOString(),
            };
          });
        });
      }
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
      const columnId = resolveColumnId(newStatus);
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
    reorderCards: reorderMutation.mutateAsync,
  };
}
