import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn, stringToColor } from '@/lib/utils';
import type { Label } from '@/types';
import api from '@/lib/api';

interface LabelEditorProps {
  labels: any[];
  canvasId: string;
  cardId: string;
  onChange?: (labels: any[]) => void;
}

const defaultColors = [
  '#ff0080', '#7c3aed', '#0099ff', '#00c853',
  '#ff6b00', '#ffab00', '#ff4757', '#00bcd4',
];

export function LabelEditor({ labels, canvasId, cardId, onChange }: LabelEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(defaultColors[0]);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    
    if (onChange) {
      const tempId = `temp-${Date.now()}`;
      onChange([...labels, { id: tempId, name: newLabel.trim(), color: selectedColor }]);
      setNewLabel('');
      setIsAdding(false);
    } else {
      try {
        await api.post(`/canvases/${canvasId}/cards/${cardId}/labels`, {
          name: newLabel.trim(),
          color: selectedColor,
        });
        setNewLabel('');
        setIsAdding(false);
      } catch (err) {
        console.error('Failed to add label', err);
      }
    }
  };

  const handleRemove = async (labelId: string) => {
    if (onChange) {
      onChange(labels.filter((l) => l.id !== labelId));
    } else {
      try {
        await api.delete(`/canvases/${canvasId}/cards/${cardId}/labels/${labelId}`);
      } catch (err) {
        console.error('Failed to remove label', err);
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-[6px] -ml-[4px]">
      {labels.map((label) => (
        <div key={label.id} className="group relative">
          <Badge color={label.color} size="sm">
            {label.name}
          </Badge>
          <button
            onClick={() => handleRemove(label.id)}
            className="absolute -top-[4px] -right-[4px] w-[14px] h-[14px] rounded-full bg-surface-3 border border-hairline flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-[8px] h-[8px] text-ink-subtle" />
          </button>
        </div>
      ))}

      {isAdding ? (
        <div className="flex items-center gap-[6px]">
          <input
            type="text"
            placeholder="Label name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setIsAdding(false);
            }}
            className="w-[100px] px-[6px] py-[3px] text-[11px] bg-surface-3 rounded border border-hairline text-ink placeholder:text-ink-subtle focus:outline-none"
            autoFocus
          />
          <div className="flex gap-[2px]">
            {defaultColors.slice(0, 4).map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={cn(
                  'w-[14px] h-[14px] rounded-full transition-transform duration-100',
                  selectedColor === color && 'ring-1 ring-white ring-offset-1 ring-offset-surface-2 scale-110'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <button
            onClick={handleAdd}
            className="text-[11px] text-accent hover:text-accent/80 font-medium"
          >
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="p-[4px] rounded text-ink-subtle hover:text-ink hover:bg-white/[0.05] transition-all duration-150"
        >
          <Plus className="w-[12px] h-[12px]" />
        </button>
      )}
    </div>
  );
}
