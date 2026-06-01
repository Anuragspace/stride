import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { WorkspaceMember } from '@/types';

export function useWorkspace() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id;

  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`);
      return data.data?.members || [];
    },
    enabled: !!workspaceId,
  });

  return {
    workspace,
    members,
    isLoadingMembers,
  };
}
