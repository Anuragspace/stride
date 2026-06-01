import React, { useState, useRef, useEffect } from 'react';
import { cn, getStatusLabel, getStatusColor } from '@/lib/utils';
import type { CardStatus } from '@/types';

interface StatusPickerProps {
  value: CardStatus;
  onChange: (status: CardStatus) => void;
}

const statuses: CardStatus[] = ['not_started', 'in_progress', 'on_hold', 'done'];

export function StatusPicker({ value, onChange }: StatusPickerProps) {
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-[8px] px-[10px] py-[5px] rounded-md hover:bg-white/[0.05] transition-all duration-150 -ml-[10px]"
      >
        <div
          className="w-[8px] h-[8px] rounded-full flex-shrink-0"
          style={{ backgroundColor: getStatusColor(value) }}
        />
        <span className="text-[13px] text-ink">{getStatusLabel(value)}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-[4px] bg-surface-2 border border-hairline rounded-lg shadow-xl shadow-black/30 py-[4px] min-w-[160px] z-50 animate-fade-in">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => {
                onChange(status);
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-[8px] px-[12px] py-[7px] text-[13px] transition-colors duration-100',
                value === status ? 'text-ink bg-white/[0.05]' : 'text-ink-muted hover:text-ink hover:bg-white/[0.05]'
              )}
            >
              <div
                className="w-[8px] h-[8px] rounded-full flex-shrink-0"
                style={{ backgroundColor: getStatusColor(status) }}
              />
              {getStatusLabel(status)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
