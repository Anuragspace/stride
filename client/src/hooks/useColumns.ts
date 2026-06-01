import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useColumns(canvasId: string) {
  const queryClient = useQueryClient();
  const canvasQueryKey = ['canvas', canvasId];
  const canvasesQueryKey = ['canvases'];

  const createColumnMutation = useMutation({
    mutationFn: async (newColumn: { name: string; color?: string; wipLimit?: number | null }) => {
      const { data } = await api.post(`/canvases/${canvasId}/columns`, newColumn);
      return data.data.column;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: canvasQueryKey });
      queryClient.invalidateQueries({ queryKey: canvasesQueryKey });
    },
  });

  const updateColumnMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string; wipLimit?: number | null }) => {
      const { data } = await api.patch(`/canvases/${canvasId}/columns/${id}`, updates);
      return data.data.column;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: canvasQueryKey });
      queryClient.invalidateQueries({ queryKey: canvasesQueryKey });
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      await api.delete(`/canvases/${canvasId}/columns/${columnId}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: canvasQueryKey });
      queryClient.invalidateQueries({ queryKey: canvasesQueryKey });
    },
  });

  const reorderColumnsMutation = useMutation({
    mutationFn: async (columns: { id: string; position: number }[]) => {
      const { data } = await api.put(`/canvases/${canvasId}/columns/reorder`, { columns });
      return data.data.columns;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: canvasQueryKey });
    },
  });

  return {
    createColumn: createColumnMutation.mutateAsync,
    isCreatingColumn: createColumnMutation.isPending,
    updateColumn: updateColumnMutation.mutateAsync,
    isUpdatingColumn: updateColumnMutation.isPending,
    deleteColumn: deleteColumnMutation.mutateAsync,
    isDeletingColumn: deleteColumnMutation.isPending,
    reorderColumns: reorderColumnsMutation.mutateAsync,
  };
}
