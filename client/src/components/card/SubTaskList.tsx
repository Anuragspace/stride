import React, { useState } from 'react';
import { Plus, Check, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import type { SubTask } from '@/types';

interface SubTaskListProps {
  subtasks: SubTask[];
  cardId: string;
  canvasId: string;
}

export function SubTaskList({ subtasks, cardId, canvasId }: SubTaskListProps) {
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const completedCount = subtasks.filter((s) => s.completed).length;
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  const addSubtask = async () => {
    if (!newTitle.trim()) return;
    try {
      await api.post(`/canvases/${canvasId}/cards/${cardId}/subtasks`, {
        title: newTitle.trim(),
      });
      setNewTitle('');
    } catch (err) {
      console.error('Failed to add subtask', err);
    }
  };

  const toggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    try {
      await api.patch(`/canvases/${canvasId}/cards/${cardId}/subtasks/${subtaskId}`, {
        completed: !isCompleted,
      });
    } catch (err) {
      console.error('Failed to toggle subtask', err);
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    try {
      await api.delete(`/canvases/${canvasId}/cards/${cardId}/subtasks/${subtaskId}`);
    } catch (err) {
      console.error('Failed to delete subtask', err);
    }
  };

  return (
    <div className="space-y-[10px]">
      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="flex items-center gap-[10px]">
          <div className="flex-1 h-[4px] bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[11px] text-ink-subtle font-medium">
            {completedCount}/{subtasks.length}
          </span>
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-[2px]">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="group flex items-center gap-[8px] px-[8px] py-[6px] rounded-md hover:bg-white/[0.03] transition-colors duration-100"
          >
            <button
              onClick={() => toggleSubtask(subtask.id, subtask.completed)}
              className={cn(
                'w-[16px] h-[16px] rounded border flex items-center justify-center flex-shrink-0 transition-all duration-150',
                subtask.completed
                  ? 'bg-accent border-accent'
                  : 'border-ink-subtle/40 hover:border-accent'
              )}
            >
              {subtask.completed && <Check className="w-[10px] h-[10px] text-white" />}
            </button>
            <span
              className={cn(
                'text-[13px] flex-1',
                subtask.completed && 'line-through text-ink-subtle'
              )}
            >
              {subtask.title}
            </span>
            <button
              onClick={() => deleteSubtask(subtask.id)}
              className="opacity-0 group-hover:opacity-100 p-[3px] rounded text-ink-subtle hover:text-danger transition-all duration-150"
            >
              <Trash2 className="w-[11px] h-[11px]" />
            </button>
          </div>
        ))}
      </div>

      {/* Add subtask */}
      {isAdding ? (
        <div className="flex items-center gap-[8px]">
          <input
            type="text"
            placeholder="Subtask title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addSubtask();
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNewTitle('');
              }
            }}
            className="flex-1 px-[8px] py-[6px] text-[13px] bg-surface-2 border border-hairline rounded-md text-ink placeholder:text-ink-subtle focus:outline-none focus:border-white/[0.16]"
            autoFocus
          />
          <button
            onClick={addSubtask}
            className="text-[12px] text-accent font-medium hover:text-accent/80"
          >
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-[6px] text-[12px] text-ink-subtle hover:text-ink transition-colors duration-150"
        >
          <Plus className="w-[12px] h-[12px]" />
          Add subtask
        </button>
      )}
    </div>
  );
}
