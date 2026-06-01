import React, { useState, useRef, useEffect } from 'react';
import { cn, getTypeLabel } from '@/lib/utils';
import type { CardType } from '@/types';

interface TypePickerProps {
  value: CardType;
  onChange: (type: CardType) => void;
}

const types: { value: CardType; icon: string }[] = [
  { value: 'task', icon: '📋' },
  { value: 'bug', icon: '🐛' },
  { value: 'feature', icon: '✨' },
  { value: 'design', icon: '🎨' },
  { value: 'research', icon: '🔬' },
];

export function TypePicker({ value, onChange }: TypePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentType = types.find((t) => t.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-[8px] px-[10px] py-[5px] rounded-md hover:bg-white/[0.05] transition-all duration-150 -ml-[10px]"
      >
        <span className="text-[14px]">{currentType?.icon}</span>
        <span className="text-[13px] text-ink">{getTypeLabel(value)}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-[4px] bg-surface-2 border border-hairline rounded-lg shadow-xl shadow-black/30 py-[4px] min-w-[150px] z-50 animate-fade-in">
          {types.map((type) => (
            <button
              key={type.value}
              onClick={() => {
                onChange(type.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-[8px] px-[12px] py-[7px] text-[13px] transition-colors duration-100',
                value === type.value ? 'text-ink bg-white/[0.05]' : 'text-ink-muted hover:text-ink hover:bg-white/[0.05]'
              )}
            >
              <span className="text-[14px]">{type.icon}</span>
              {getTypeLabel(type.value)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
