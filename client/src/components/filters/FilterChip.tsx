import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterChipProps {
  label: string;
  value: string;
  color?: string;
  onRemove: () => void;
}

export function FilterChip({ label, value, color, onRemove }: FilterChipProps) {
  return (
    <div
      className="inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-pill bg-surface-3 border border-hairline text-[12px] group transition-all duration-150 hover:border-white/[0.12]"
    >
      {color && (
        <div
          className="w-[6px] h-[6px] rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="text-ink-subtle">{label}:</span>
      <span className="text-ink font-medium">{value}</span>
      <button
        onClick={onRemove}
        className="p-[1px] rounded-full text-ink-subtle hover:text-ink transition-colors duration-100"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-[10px] h-[10px]" />
      </button>
    </div>
  );
}
