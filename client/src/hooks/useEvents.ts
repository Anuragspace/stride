import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSocketContext } from '@/contexts/SocketContext';
import type { Event } from '@/types';

const mapEventFromServer = (event: any): any => {
  const typeParts = (event.type || '').split('.');
  const entityType = typeParts[0] || 'activity';
  const action = typeParts[1] || 'done';

  const user = event.actor ? {
    id: event.actor.id,
    name: event.actor.name,
    email: event.actor.email,
    avatar_url: event.actor.avatarUrl,
  } : null;

  return {
    id: event.id,
    workspaceId: event.workspaceId,
    canvasId: event.canvasId,
    cardId: event.cardId,
    type: event.type,
    created_at: event.createdAt || new Date().toISOString(),
    createdAt: event.createdAt,
    user,
    action,
    entity_type: entityType,
    card: event.card,
    canvas: event.canvas,
  };
};

export function useEvents(canvasIdOrParams?: string | { canvasId?: string; cardId?: string }) {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id;

  // Resolve params
  let canvasId: string | undefined = undefined;
  let cardId: string | undefined = undefined;

  if (typeof canvasIdOrParams === 'string') {
    canvasId = canvasIdOrParams;
  } else if (canvasIdOrParams) {
    canvasId = canvasIdOrParams.canvasId;
    cardId = canvasIdOrParams.cardId;
  }

  const isCardDraft = cardId === 'new';

  const queryKey = React.useMemo(() => {
    return cardId && !isCardDraft
      ? ['events', 'card', cardId]
      : canvasId
      ? ['events', 'canvas', canvasId]
      : ['events', 'workspace', workspaceId];
  }, [cardId, isCardDraft, canvasId, workspaceId]);

  const { data: events, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<Event[]> => {
      let url = '';
      if (cardId && !isCardDraft) {
        url = `/events?cardId=${cardId}`;
      } else if (canvasId) {
        url = `/events/canvas/${canvasId}`;
      } else if (workspaceId) {
        url = `/events/workspace/${workspaceId}`;
      } else {
        return [];
      }
      const { data } = await api.get(url);
      const rawEvents = data.data?.events || [];
      return rawEvents.map(mapEventFromServer);
    },
    enabled: (cardId && !isCardDraft) ? true : (canvasId ? !!canvasId : !!workspaceId),
  });

  const { socket, isConnected } = useSocketContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected || isCardDraft) return;

    // Join room to receive broadcasts
    if (canvasId) {
      socket.emit('join:canvas', canvasId);
    } else if (workspaceId) {
      socket.emit('join:workspace', workspaceId);
    }

    const handleNewEvent = (newEvent: any) => {
      const mapped = mapEventFromServer(newEvent);

      // If we are scoped to a specific card, ignore events for other cards
      if (cardId && newEvent.cardId !== cardId) return;

      queryClient.setQueryData<Event[]>(queryKey, (old) => {
        if (!old) return [mapped];
        if (old.some((e) => e.id === mapped.id)) return old;
        return [mapped, ...old];
      });
    };

    socket.on('event', handleNewEvent);

    return () => {
      if (canvasId) {
        socket.emit('leave:canvas', canvasId);
      } else if (workspaceId) {
        socket.emit('leave:workspace', workspaceId);
      }
      socket.off('event', handleNewEvent);
    };
  }, [socket, isConnected, canvasId, workspaceId, cardId, queryKey, queryClient, isCardDraft]);

  return {
    events: events || [],
    isLoading,
  };
}
