import React from 'react';
import { Star } from 'lucide-react';
import { cn, getPriorityLabel, getPriorityColor } from '@/lib/utils';
import type { CardPriority } from '@/types';

interface PriorityPickerProps {
  value: CardPriority;
  onChange: (priority: CardPriority) => void;
}

export function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  const priorities: CardPriority[] = [1, 2, 3];

  return (
    <div className="flex items-center gap-[6px] -ml-[4px]">
      {priorities.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            'flex items-center gap-[4px] px-[8px] py-[4px] rounded-md text-[12px] font-medium transition-all duration-150 border',
            value === p
              ? 'border-white/[0.12] bg-white/[0.05]'
              : 'border-transparent hover:bg-white/[0.04]'
          )}
          title={getPriorityLabel(p)}
        >
          <div className="flex gap-[1px]">
            {Array.from({ length: p }).map((_, i) => (
              <Star
                key={i}
                className="w-[10px] h-[10px] fill-current"
                style={{ color: value === p ? getPriorityColor(p) : '#666666' }}
              />
            ))}
          </div>
          <span
            className="text-[11px]"
            style={{ color: value === p ? getPriorityColor(p) : '#666666' }}
          >
            {getPriorityLabel(p)}
          </span>
        </button>
      ))}
    </div>
  );
}
