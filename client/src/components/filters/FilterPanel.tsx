import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import { cn, getStatusLabel, getStatusColor, getPriorityLabel, getPriorityColor, getTypeLabel } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { FilterState, CardStatus, CardPriority, CardType } from '@/types';

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const statuses: CardStatus[] = ['not_started', 'in_progress', 'on_hold', 'done'];
const priorities: CardPriority[] = [1, 2, 3];
const types: CardType[] = ['task', 'bug', 'feature', 'design', 'research'];

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeFilterCount = [
    filters.status?.length || 0,
    filters.priority?.length || 0,
    filters.type?.length || 0,
  ].reduce((a, b) => a + b, 0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K] extends (infer T)[] | undefined ? T : never
  ) => {
    const current = (filters[key] as unknown[]) || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: updated.length > 0 ? updated : undefined });
  };

  return (
    <div ref={ref} className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        leftIcon={<Filter className="w-[13px] h-[13px]" />}
      >
        Filter
        {activeFilterCount > 0 && (
          <span className="ml-[4px] min-w-[16px] h-[16px] px-[4px] rounded-full bg-accent text-[10px] text-white flex items-center justify-center font-semibold">
            {activeFilterCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-[6px] w-[280px] bg-surface-2 border border-hairline rounded-xl shadow-xl shadow-black/30 z-50"
          >
            <div className="p-[12px] space-y-[16px]">
              {/* Status */}
              <div>
                <h4 className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-[8px]">
                  Status
                </h4>
                <div className="flex flex-wrap gap-[4px]">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      onClick={() => toggleFilter('status', status)}
                      className={cn(
                        'flex items-center gap-[6px] px-[10px] py-[5px] rounded-md text-[12px] border transition-all duration-100',
                        filters.status?.includes(status)
                          ? 'border-accent/40 bg-accent/10 text-ink'
                          : 'border-hairline text-ink-muted hover:text-ink hover:border-white/[0.12]'
                      )}
                    >
                      <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: getStatusColor(status) }} />
                      {getStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <h4 className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-[8px]">
                  Priority
                </h4>
                <div className="flex flex-wrap gap-[4px]">
                  {priorities.map((priority) => (
                    <button
                      key={priority}
                      onClick={() => toggleFilter('priority', priority)}
                      className={cn(
                        'px-[10px] py-[5px] rounded-md text-[12px] border transition-all duration-100',
                        filters.priority?.includes(priority)
                          ? 'border-accent/40 bg-accent/10 text-ink'
                          : 'border-hairline text-ink-muted hover:text-ink hover:border-white/[0.12]'
                      )}
                    >
                      {getPriorityLabel(priority)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <h4 className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mb-[8px]">
                  Type
                </h4>
                <div className="flex flex-wrap gap-[4px]">
                  {types.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleFilter('type', type)}
                      className={cn(
                        'px-[10px] py-[5px] rounded-md text-[12px] border transition-all duration-100',
                        filters.type?.includes(type)
                          ? 'border-accent/40 bg-accent/10 text-ink'
                          : 'border-hairline text-ink-muted hover:text-ink hover:border-white/[0.12]'
                      )}
                    >
                      {getTypeLabel(type)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clear all */}
            {activeFilterCount > 0 && (
              <div className="px-[12px] py-[10px] border-t border-hairline">
                <button
                  onClick={() => onFiltersChange({})}
                  className="text-[12px] text-accent hover:text-accent/80 font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
