import React from 'react';
import {
  LayoutGrid, CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { SortPanel } from '@/components/filters/SortPanel';
import { FilterChip } from '@/components/filters/FilterChip';
import { getStatusLabel, getStatusColor, getPriorityLabel, getTypeLabel } from '@/lib/utils';
import type { ViewMode, FilterState, SortState } from '@/types';

interface CanvasToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
}

const views: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'board', icon: <LayoutGrid className="w-[14px] h-[14px]" />, label: 'Board' },
  { mode: 'calendar', icon: <CalendarDays className="w-[14px] h-[14px]" />, label: 'Calendar' },
];

export function CanvasToolbar({
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
}: CanvasToolbarProps) {
  return (
    <div className="px-[24px] py-[10px] flex flex-col gap-[8px] border-b border-hairline flex-shrink-0">
      <div className="flex items-center gap-[12px]">
        {/* View tabs */}
        <div className="flex items-center bg-surface-2 rounded-md p-[2px] border border-hairline">
          {views.map((view) => (
            <button
              key={view.mode}
              onClick={() => onViewModeChange(view.mode)}
              className={cn(
                'flex items-center gap-[6px] px-[10px] py-[5px] rounded-sm text-[12px] font-medium transition-all duration-150',
                viewMode === view.mode
                  ? 'bg-white/[0.08] text-ink shadow-sm'
                  : 'text-ink-subtle hover:text-ink'
              )}
            >
              {view.icon}
              {view.label}
            </button>
          ))}
        </div>

        <div className="h-[20px] w-[1px] bg-hairline" />

        {/* Filter & Sort */}
        <FilterPanel filters={filters} onFiltersChange={onFiltersChange} />
        <SortPanel sort={sort} onSortChange={onSortChange} />
      </div>

      {/* Active filter chips */}
      {(filters.status?.length || filters.priority?.length || filters.type?.length) ? (
        <div className="flex flex-wrap gap-[6px]">
          {filters.status?.map((s) => (
            <FilterChip
              key={s}
              label="Status"
              value={getStatusLabel(s)}
              color={getStatusColor(s)}
              onRemove={() => {
                const updated = filters.status?.filter((v) => v !== s);
                onFiltersChange({ ...filters, status: updated?.length ? updated : undefined });
              }}
            />
          ))}
          {filters.priority?.map((p) => (
            <FilterChip
              key={p}
              label="Priority"
              value={getPriorityLabel(p)}
              onRemove={() => {
                const updated = filters.priority?.filter((v) => v !== p);
                onFiltersChange({ ...filters, priority: updated?.length ? updated : undefined });
              }}
            />
          ))}
          {filters.type?.map((t) => (
            <FilterChip
              key={t}
              label="Type"
              value={getTypeLabel(t)}
              onRemove={() => {
                const updated = filters.type?.filter((v) => v !== t);
                onFiltersChange({ ...filters, type: updated?.length ? updated : undefined });
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
