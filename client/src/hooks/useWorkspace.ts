import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSocketContext } from '@/contexts/SocketContext';
import type { WorkspaceMember, Invite } from '@/types';

export function useWorkspace() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id;
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocketContext();

  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`);
      return data.data?.members || [];
    },
    enabled: !!workspaceId,
  });

  const { data: invites, isLoading: isLoadingInvites } = useQuery({
    queryKey: ['workspace-invites', workspaceId],
    queryFn: async (): Promise<Invite[]> => {
      const { data } = await api.get(`/workspaces/${workspaceId}/invites`);
      return data.data?.invites || [];
    },
    enabled: !!workspaceId,
  });

  useEffect(() => {
    if (!socket || !isConnected || !workspaceId) return;

    // Join workspace room to receive broadcasts
    socket.emit('join:workspace', workspaceId);

    const handleWorkspaceEvent = (event: any) => {
      if (
        event.type === 'member.joined' ||
        event.type === 'member.role_changed' ||
        event.type === 'member.left'
      ) {
        queryClient.invalidateQueries({
          queryKey: ['workspace-members', workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ['workspace-invites', workspaceId],
        });
      }
    };

    socket.on('event', handleWorkspaceEvent);
    socket.on('events:batch', (batch: any[]) => batch.forEach(handleWorkspaceEvent));

    return () => {
      socket.emit('leave:workspace', workspaceId);
      socket.off('event', handleWorkspaceEvent);
      socket.off('events:batch');
    };
  }, [socket, isConnected, workspaceId, queryClient]);

  return {
    workspace,
    members,
    isLoadingMembers,
    invites,
    isLoadingInvites,
  };
}
