import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, ChevronLeft, ChevronRight, MoreHorizontal, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardTile } from './CardTile';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { Dropdown } from '@/components/ui/Dropdown';
import { useColumns } from '@/hooks/useColumns';
import { Avatar } from '@/components/ui/Avatar';
import type { Card } from '@/types';

interface ColumnProps {
  id: string;
  canvasId: string;
  title: string;
  color: string;
  wipLimit?: number | null;
  cards: Card[];
  isLoading?: boolean;
  onAddCard: (columnId: string) => void;
  onCardClick: (cardId: string) => void;
  selectedCardIds?: string[];
  onCardSelect?: (cardId: string, event: React.MouseEvent) => void;
  avatarUrl?: string | null;
  isMemberColumn?: boolean;
}

export function Column({
  id,
  canvasId,
  title,
  color,
  wipLimit = null,
  cards,
  isLoading = false,
  onAddCard,
  onCardClick,
  selectedCardIds = [],
  onCardSelect,
  avatarUrl = null,
  isMemberColumn = false,
}: ColumnProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id });
  const { updateColumn, deleteColumn } = useColumns(canvasId);

  const isOverWip = wipLimit !== null && wipLimit !== undefined && cards.length > wipLimit;

  const handleRename = async () => {
    const newName = prompt('Enter new column name:', title);
    if (newName && newName.trim() && newName.trim() !== title) {
      await updateColumn({ id, name: newName.trim() });
    }
  };

  const handleSetWipLimit = async () => {
    const currentWip = wipLimit !== null ? String(wipLimit) : '';
    const newLimitRaw = prompt('Enter WIP limit (leave blank or enter 0 to remove):', currentWip);
    
    if (newLimitRaw === null) return; // Canceled
    
    const newLimit = parseInt(newLimitRaw.trim(), 10);
    if (isNaN(newLimit) || newLimit <= 0) {
      await updateColumn({ id, wipLimit: null });
    } else {
      await updateColumn({ id, wipLimit: newLimit });
    }
  };

  const handleDelete = async () => {
    if (cards.length > 0) {
      alert('Cannot delete a column that contains cards. Move the cards to another column first.');
      return;
    }
    if (confirm(`Are you sure you want to delete column "${title}"?`)) {
      await deleteColumn(id);
    }
  };

  // Render collapsed vertical strip
  if (isCollapsed) {
    return (
      <div 
        className={cn(
          "flex-shrink-0 w-[48px] bg-surface-1/30 border border-hairline hover:bg-surface-1/50 transition-all duration-150 rounded-xl flex flex-col items-center py-[16px] h-full cursor-pointer relative",
          isOverWip && "border-warning/30 bg-warning/[0.02]"
        )}
        onClick={() => setIsCollapsed(false)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(false);
          }}
          className="p-[4px] rounded text-ink-subtle hover:text-ink hover:bg-white/[0.05] mb-[16px] transition-colors"
          aria-label="Expand column"
        >
          <ChevronRight className="w-[14px] h-[14px]" />
        </button>

        <div className="flex-1 flex flex-col items-center justify-center select-none w-full">
          <h3 className="text-[12px] font-semibold text-ink-muted tracking-heading whitespace-nowrap rotate-90 transform origin-center my-auto">
            {title}
          </h3>
        </div>

        <div className="mt-auto flex flex-col items-center gap-[8px]">
          {isOverWip && (
            <ShieldAlert className="w-[14px] h-[14px] text-warning animate-pulse" />
          )}
          <span className={cn(
            "text-[10px] font-bold px-[6px] py-[2px] rounded-full bg-white/[0.05] text-ink-subtle",
            isOverWip && "bg-warning/20 text-warning"
          )}>
            {cards.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-[280px] flex flex-col h-full">
      {/* Column header */}
      <div className={cn(
        "flex items-center gap-[6px] px-[8px] py-[10px] mb-[6px] border border-transparent rounded-lg transition-colors",
        isOverWip && "border-warning/20 bg-warning/[0.02] shadow-sm shadow-warning/5"
      )}>
        {!isMemberColumn && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-[4px] rounded text-ink-subtle hover:text-ink hover:bg-white/[0.05] transition-all duration-150 mr-[2px]"
            aria-label="Collapse column"
          >
            <ChevronLeft className="w-[14px] h-[14px]" />
          </button>
        )}

        {isMemberColumn ? (
          <Avatar
            src={avatarUrl}
            name={title}
            size="xs"
            className="flex-shrink-0 mr-[4px]"
          />
        ) : (
          <div
            className="w-[8px] h-[8px] rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        
        <h3 className={cn(
          "text-[13px] font-semibold text-ink tracking-heading truncate max-w-[140px]",
          isOverWip && "text-warning font-bold"
        )}>
          {title}
        </h3>

        <div className="flex items-center gap-[4px] ml-[4px]">
          <span className={cn(
            "text-[11px] text-ink-subtle font-medium",
            isOverWip && "text-warning"
          )}>
            {cards.length} {cards.length === 1 ? 'item' : 'items'}
          </span>
          {!isMemberColumn && wipLimit !== null && (
            <span className="text-[10px] text-ink-subtle/60 font-medium">
              /{wipLimit}
            </span>
          )}
          {!isMemberColumn && isOverWip && (
            <span title="WIP Limit Exceeded!">
              <ShieldAlert className="w-[12px] h-[12px] text-warning animate-pulse ml-[2px]" />
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-[2px]">
          <button
            onClick={() => onAddCard(id)}
            className="p-[4px] rounded text-ink-subtle hover:text-ink hover:bg-white/[0.05] transition-all duration-150"
            aria-label={`Add card to ${title}`}
          >
            <Plus className="w-[14px] h-[14px]" />
          </button>
          
          {!isMemberColumn && (
            <Dropdown
              trigger={
                <button
                  className="p-[4px] rounded text-ink-subtle hover:text-ink hover:bg-white/[0.05] transition-all duration-150"
                  aria-label="Column settings"
                >
                  <MoreHorizontal className="w-[14px] h-[14px]" />
                </button>
              }
              items={[
                { id: 'rename', label: 'Rename' },
                { id: 'wip', label: wipLimit !== null ? 'Change WIP Limit' : 'Set WIP Limit' },
                { id: 'sep', label: '', separator: true },
                { id: 'delete', label: 'Delete', danger: true },
              ]}
              onSelect={(actionId) => {
                if (actionId === 'rename') handleRename();
                if (actionId === 'wip') handleSetWipLimit();
                if (actionId === 'delete') handleDelete();
              }}
              align="right"
            />
          )}
        </div>
      </div>

      {/* Cards container */}
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1 flex flex-col gap-[8px] px-[4px] pb-[8px] overflow-y-auto scrollbar-thin rounded-lg transition-all duration-150 min-h-[100px]',
            isOver && 'bg-white/[0.02] border border-dashed border-white/[0.08] rounded-xl'
          )}
        >
          {isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            cards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                onClick={() => onCardClick(card.id)}
                isSelected={selectedCardIds.includes(card.id)}
                onSelect={(e) => onCardSelect?.(card.id, e)}
              />
            ))
          )}
        </div>
      </SortableContext>

      {/* Add card button at bottom */}
      {!isLoading && (
        <button
          onClick={() => onAddCard(id)}
          className="flex items-center gap-[8px] px-[12px] py-[10px] mx-[4px] mb-[4px] mt-[4px] rounded-lg text-[12px] font-medium text-ink-subtle hover:text-ink hover:bg-white/[0.04] transition-all duration-150"
        >
          <Plus className="w-[13px] h-[13px]" />
          <span>Add card</span>
        </button>
      )}
    </div>
  );
}
