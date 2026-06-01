import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Canvas } from '@/types';

export function useCanvases() {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();
  const workspaceId = workspace?.id;
  const queryKey = ['canvases', workspaceId];

  const { data: canvases, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<Canvas[]> => {
      const { data } = await api.get(`/canvases?workspaceId=${workspaceId}`);
      const rawCanvases = data.data?.canvases || [];
      return rawCanvases.map((c: any) => ({
        ...c,
        is_starred: c.isStarred || c.is_starred || false,
      }));
    },
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: async (newCanvas: {
      name: string;
      icon?: string;
      visibility?: 'public' | 'private';
      defaultView?: 'board' | 'table' | 'list' | 'calendar';
    }) => {
      console.log('Posting canvas creation:', { ...newCanvas, workspaceId });
      const { data } = await api.post('/canvases', { ...newCanvas, workspaceId });
      return data.data?.canvas as Canvas;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Canvas> & { id: string }) => {
      const { data } = await api.patch(`/canvases/${id}`, updates);
      return data.data?.canvas;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Canvas[]>(queryKey);
      queryClient.setQueryData<Canvas[]>(queryKey, (old) =>
        old?.map((c) => (c.id === id ? { ...c, ...updates } : c))
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

  const deleteMutation = useMutation({
    mutationFn: async (canvasId: string) => {
      await api.delete(`/canvases/${canvasId}`);
    },
    onMutate: async (canvasId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Canvas[]>(queryKey);
      queryClient.setQueryData<Canvas[]>(queryKey, (old) =>
        old?.filter((c) => c.id !== canvasId)
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

  const toggleStar = async (canvasId: string, isStarred: boolean) => {
    await updateMutation.mutateAsync({ id: canvasId, isStarred });
  };

  return {
    canvases,
    isLoading,
    createCanvas: createMutation.mutateAsync,
    isCreatingCanvas: createMutation.isPending,
    updateCanvas: updateMutation.mutateAsync,
    deleteCanvas: deleteMutation.mutateAsync,
    toggleStar,
  };
}

export function useCanvas(canvasId: string) {
  const queryKey = ['canvas', canvasId];

  const { data: canvas, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<Canvas> => {
      const { data } = await api.get(`/canvases/${canvasId}`);
      return data.data.canvas;
    },
    enabled: !!canvasId,
  });

  return {
    canvas,
    isLoading,
  };
}

