import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketContext } from '@/contexts/SocketContext';
import { joinRoom, leaveRoom } from '@/lib/socket';
import { mapCardFromServer } from '@/hooks/useCards';
import type { Card } from '@/types';

export function useSocket(canvasId?: string) {
  const { socket, isConnected } = useSocketContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected || !canvasId) return;

    joinRoom(`canvas:${canvasId}`);

    const handleCardCreated = (rawCard: any) => {
      const card = mapCardFromServer(rawCard);
      queryClient.setQueryData<Card[]>(['cards', canvasId], (old) => {
        if (!old) return [card];
        // Don't duplicate — but replace the matching temp card if title matches
        const hasTempMatch = old.some(
          (c) => (c as any)._isPending && c.title === card.title
        );
        if (hasTempMatch) {
          // Replace temp card with the real server card
          return old.map((c) =>
            (c as any)._isPending && c.title === card.title ? card : c
          );
        }
        if (old.some((c) => c.id === card.id)) return old;
        return [...old, card];
      });
    };

    const handleCardUpdated = (rawCard: any) => {
      const card = mapCardFromServer(rawCard);
      queryClient.setQueryData<Card[]>(['cards', canvasId], (old) => {
        if (!old) return [card];
        // Only update if id matches an existing real card (not a temp)
        if (!old.some((c) => c.id === card.id)) return [...old, card];
        return old.map((c) => (c.id === card.id ? card : c));
      });
      // Also update individual card cache if it exists
      if (queryClient.getQueryData(['card', card.id])) {
        queryClient.setQueryData(['card', card.id], card);
      }
    };

    const handleCardDeleted = ({ cardId }: { cardId: string }) => {
      queryClient.setQueryData<Card[]>(['cards', canvasId], (old) =>
        old?.filter((c) => c.id !== cardId)
      );
    };

    const handleCardMoved = (rawCard: any) => {
      const card = mapCardFromServer(rawCard);
      queryClient.setQueryData<Card[]>(['cards', canvasId], (old) =>
        old?.map((c) => (c.id === card.id ? card : c))
      );
    };

    socket.on('card:created', handleCardCreated);
    socket.on('card:updated', handleCardUpdated);
    socket.on('card:deleted', handleCardDeleted);
    socket.on('card:moved', handleCardMoved);

    return () => {
      leaveRoom(`canvas:${canvasId}`);
      socket.off('card:created', handleCardCreated);
      socket.off('card:updated', handleCardUpdated);
      socket.off('card:deleted', handleCardDeleted);
      socket.off('card:moved', handleCardMoved);
    };
  }, [socket, isConnected, canvasId, queryClient]);

  return { isConnected };
}
