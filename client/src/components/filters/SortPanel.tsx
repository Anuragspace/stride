import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { SortState, SortField, SortDirection } from '@/types';

interface SortPanelProps {
  sort: SortState;
  onSortChange: (sort: SortState) => void;
}

const sortOptions: { field: SortField; label: string }[] = [
  { field: 'created_at', label: 'Date Created' },
  { field: 'updated_at', label: 'Last Updated' },
  { field: 'priority', label: 'Priority' },
  { field: 'due_date', label: 'Due Date' },
  { field: 'title', label: 'Title' },
  { field: 'status', label: 'Status' },
];

export function SortPanel({ sort, onSortChange }: SortPanelProps) {
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
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        leftIcon={<ArrowUpDown className="w-[13px] h-[13px]" />}
      >
        Sort
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-[6px] w-[200px] bg-surface-2 border border-hairline rounded-xl shadow-xl shadow-black/30 z-50 py-[4px]"
          >
            {sortOptions.map((option) => (
              <button
                key={option.field}
                onClick={() => {
                  const direction: SortDirection =
                    sort.field === option.field && sort.direction === 'asc' ? 'desc' : 'asc';
                  onSortChange({ field: option.field, direction });
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-[8px] px-[12px] py-[7px] text-[12px] transition-colors duration-100',
                  sort.field === option.field ? 'text-ink bg-white/[0.05]' : 'text-ink-muted hover:text-ink hover:bg-white/[0.05]'
                )}
              >
                <span className="flex-1 text-left">{option.label}</span>
                {sort.field === option.field && (
                  <span className="text-[10px] text-accent">
                    {sort.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
