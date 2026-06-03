import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Column } from '@/components/board/Column';
import { DragOverlay } from '@/components/board/DragOverlay';
import { ColumnSkeleton } from '@/components/ui/Skeleton';
import { useCards } from '@/hooks/useCards';
import { useWorkspace } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';
import { Dropdown } from '@/components/ui/Dropdown';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { Card } from '@/types';

interface BoardViewProps {
  cards: Card[];
  isLoading: boolean;
  onCardClick: (cardId: string) => void;
  onAddCard: (columnId: string) => void;
  canvasId: string;
  columns?: any[]; // Kept for compatibility, but board uses teammate lanes
}

export function BoardView({
  cards,
  isLoading,
  onCardClick,
  onAddCard,
  canvasId,
}: BoardViewProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const { updateCard, bulkUpdateCards, deleteCard, reorderCards } = useCards(canvasId);
  const { members, isLoadingMembers } = useWorkspace();
  const { user: currentUser } = useAuth();
  const { error: showError } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group lanes: Unassigned + Workspace Members
  const boardColumns = useMemo(() => {
    return [
      { id: 'unassigned', name: 'Unassigned', avatarUrl: null },
      ...(members?.map((m) => ({
        id: m.userId,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
      })) || []),
    ];
  }, [members]);

  // Group and sort cards into teammate lanes dynamically
  const columnCards = useMemo(() => {
    const map: Record<string, Card[]> = {};
    
    // Initialize lanes
    map['unassigned'] = [];
    members?.forEach((m) => {
      map[m.userId] = [];
    });

    cards?.forEach((card) => {
      if (card.canvasId !== canvasId) return;

      const assignees = card.assignees || [];
      if (assignees.length === 0) {
        map['unassigned'].push(card);
      } else {
        const firstAssigneeId = assignees[0].userId;
        if (map[firstAssigneeId]) {
          map[firstAssigneeId].push(card);
        } else {
          map['unassigned'].push(card);
        }
      }
    });

    // Sort by position inside columns
    Object.keys(map).forEach((colId) => {
      map[colId].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    });

    return map;
  }, [cards, members, canvasId]);

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id);
    if (card) setActiveCard(card);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeCardId = active.id as string;
    const overId = over.id as string;

    // Find target column/lane
    let targetLaneId: string;
    if (boardColumns.some((col) => col.id === overId)) {
      targetLaneId = overId;
    } else {
      const overCard = cards.find((c) => c.id === overId);
      if (!overCard) return;
      
      const assignees = overCard.assignees || [];
      targetLaneId = assignees.length > 0 ? assignees[0].userId : 'unassigned';
    }

    const activeCardObj = cards.find((c) => c.id === activeCardId);
    if (!activeCardObj) return;

    const sourceAssignees = activeCardObj.assignees || [];
    const sourceLaneId = sourceAssignees.length > 0 ? sourceAssignees[0].userId : 'unassigned';

    const updates: { id: string; position: number; assigneeIds?: string[] }[] = [];
    const optimisticCardsMap = new Map<string, Card>();

    // Initialize map with all current cards
    cards.forEach((c) => {
      optimisticCardsMap.set(c.id, { ...c });
    });

    if (sourceLaneId === targetLaneId) {
      // Reordering within the same lane
      const targetCards = [...(columnCards[targetLaneId] || [])];
      const filtered = targetCards.filter((c) => c.id !== activeCardId);
      
      let newIndex = 0;
      if (overId === targetLaneId) {
        newIndex = filtered.length;
      } else {
        const overIndex = filtered.findIndex((c) => c.id === overId);
        newIndex = overIndex !== -1 ? overIndex : filtered.length;
      }

      const finalCards = [...filtered];
      finalCards.splice(newIndex, 0, activeCardObj);

      for (let i = 0; i < finalCards.length; i++) {
        const c = finalCards[i];
        if (c.id === activeCardId) {
          const assigneeIds = targetLaneId === 'unassigned' ? [] : [targetLaneId];
          updates.push({
            id: c.id,
            position: i,
            assigneeIds,
          });

          // Optimistic update
          const targetMember = members?.find((m) => m.userId === targetLaneId);
          optimisticCardsMap.set(c.id, {
            ...c,
            orderIndex: i,
            assignees: targetLaneId === 'unassigned'
              ? []
              : targetMember
                ? [
                    {
                      cardId: c.id,
                      userId: targetMember.user.id,
                      user: {
                        id: targetMember.user.id,
                        name: targetMember.user.name,
                        email: targetMember.user.email,
                        avatarUrl: targetMember.user.avatarUrl,
                        avatar_url: targetMember.user.avatarUrl,
                        createdAt: new Date().toISOString(),
                      } as any,
                      assignedAt: new Date().toISOString(),
                    },
                  ]
                : c.assignees,
          });
        } else {
          updates.push({
            id: c.id,
            position: i,
          });
          
          const existingOpt = optimisticCardsMap.get(c.id);
          if (existingOpt) {
            optimisticCardsMap.set(c.id, {
              ...existingOpt,
              orderIndex: i,
            });
          }
        }
      }
    } else {
      // Dragging to a different lane
      // 1. Target Lane
      const targetCards = [...(columnCards[targetLaneId] || [])];
      const filteredTarget = targetCards.filter((c) => c.id !== activeCardId);

      let newIndex = 0;
      if (overId === targetLaneId) {
        newIndex = filteredTarget.length;
      } else {
        const overIndex = filteredTarget.findIndex((c) => c.id === overId);
        newIndex = overIndex !== -1 ? overIndex : filteredTarget.length;
      }

      const finalTargetCards = [...filteredTarget];
      finalTargetCards.splice(newIndex, 0, activeCardObj);

      for (let i = 0; i < finalTargetCards.length; i++) {
        const c = finalTargetCards[i];
        if (c.id === activeCardId) {
          const assigneeIds = targetLaneId === 'unassigned' ? [] : [targetLaneId];
          updates.push({
            id: c.id,
            position: i,
            assigneeIds,
          });

          // Optimistic update
          const targetMember = members?.find((m) => m.userId === targetLaneId);
          optimisticCardsMap.set(c.id, {
            ...c,
            orderIndex: i,
            assignees: targetLaneId === 'unassigned'
              ? []
              : targetMember
                ? [
                    {
                      cardId: c.id,
                      userId: targetMember.user.id,
                      user: {
                        id: targetMember.user.id,
                        name: targetMember.user.name,
                        email: targetMember.user.email,
                        avatarUrl: targetMember.user.avatarUrl,
                        avatar_url: targetMember.user.avatarUrl,
                        createdAt: new Date().toISOString(),
                      } as any,
                      assignedAt: new Date().toISOString(),
                    },
                  ]
                : c.assignees,
          });
        } else {
          updates.push({
            id: c.id,
            position: i,
          });

          const existingOpt = optimisticCardsMap.get(c.id);
          if (existingOpt) {
            optimisticCardsMap.set(c.id, {
              ...existingOpt,
              orderIndex: i,
            });
          }
        }
      }

      // 2. Source Lane
      const sourceCards = [...(columnCards[sourceLaneId] || [])];
      const finalSourceCards = sourceCards.filter((c) => c.id !== activeCardId);

      for (let i = 0; i < finalSourceCards.length; i++) {
        const c = finalSourceCards[i];
        updates.push({
          id: c.id,
          position: i,
        });

        const existingOpt = optimisticCardsMap.get(c.id);
        if (existingOpt) {
          optimisticCardsMap.set(c.id, {
            ...existingOpt,
            orderIndex: i,
          });
        }
      }
    }

    const optimisticCards = Array.from(optimisticCardsMap.values());

    try {
      await reorderCards({ updates, optimisticCards });
    } catch (err) {
      console.error('Failed to reorder cards:', err);
      showError('Failed to update card position');
    }
  };

  // Card selection logic for multi-select
  const handleCardSelect = useCallback((cardId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedCardIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  }, []);

  // Bulk operations
  const handleBulkPriority = async (priority: number) => {
    await bulkUpdateCards({ ids: selectedCardIds, updates: { priority } });
    setSelectedCardIds([]);
  };

  const handleBulkAssign = async (userId: string) => {
    if (userId === 'unassigned') {
      await bulkUpdateCards({
        ids: selectedCardIds,
        updates: { assignees: [] },
      });
    } else {
      const member = members?.find((m) => m.userId === userId);
      if (member) {
        await bulkUpdateCards({
          ids: selectedCardIds,
          updates: {
            assignees: selectedCardIds.map(id => ({
              cardId: id,
              userId: member.user.id,
              user: member.user,
              assignedAt: new Date().toISOString()
            }))
          },
        });
      }
    }
    setSelectedCardIds([]);
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedCardIds.length} cards?`)) {
      await Promise.all(selectedCardIds.map((id) => deleteCard(id)));
      setSelectedCardIds([]);
    }
  };

  if (isLoading || isLoadingMembers || boardColumns.length === 0) {
    return (
      <div className="flex gap-[16px] px-[24px] py-[16px] overflow-x-auto h-full">
        <ColumnSkeleton />
        <ColumnSkeleton />
        <ColumnSkeleton />
        <ColumnSkeleton />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Simple Horizontal Scroll Grid */}
        <div className="w-full h-full p-[24px] overflow-x-auto overflow-y-hidden scrollbar-thin flex gap-[16px] items-stretch">
          {boardColumns.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              canvasId={canvasId}
              title={col.name}
              color="#6B7280"
              isMemberColumn={true}
              avatarUrl={col.avatarUrl}
              cards={columnCards[col.id] || []}
              onAddCard={onAddCard}
              onCardClick={onCardClick}
              selectedCardIds={selectedCardIds}
              onCardSelect={handleCardSelect}
            />
          ))}
        </div>

        <DragOverlay activeCard={activeCard} />
      </DndContext>

      {/* Multi-Select Bulk Actions Bar */}
      {selectedCardIds.length > 0 && (
        <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 bg-surface-2/90 backdrop-blur-lg border border-accent/30 rounded-full px-[20px] py-[10px] shadow-2xl flex items-center gap-[16px] z-50 animate-slide-in">
          <div className="flex items-center gap-[6px] pr-[10px] border-r border-hairline">
            <span className="text-[12px] font-bold text-accent px-[8px] py-[3px] rounded-full bg-accent/10">
              {selectedCardIds.length}
            </span>
            <span className="text-[12px] font-semibold text-ink">selected</span>
          </div>

          <div className="flex items-center gap-[8px]">
            {/* Change Priority */}
            <Dropdown
              trigger={
                <button className="text-[12px] font-medium text-ink-muted hover:text-ink px-[10px] py-[6px] rounded-md hover:bg-white/[0.04] transition-colors">
                  Priority
                </button>
              }
              items={[
                { id: '1', label: 'Low' },
                { id: '2', label: 'Medium' },
                { id: '3', label: 'High' },
              ]}
              onSelect={(p) => handleBulkPriority(parseInt(p, 10))}
              align="left"
            />

            {/* Reassign / Move Lane */}
            <Dropdown
              trigger={
                <button className="text-[12px] font-medium text-ink-muted hover:text-ink px-[10px] py-[6px] rounded-md hover:bg-white/[0.04] transition-colors">
                  Reassign
                </button>
              }
              items={[
                { id: 'unassigned', label: 'Unassigned' },
                ...(members?.map((m) => ({ id: m.userId, label: m.user.name })) || []),
              ]}
              onSelect={handleBulkAssign}
              align="left"
            />

            {/* Delete */}
            <button
              onClick={handleBulkDelete}
              className="text-[12px] font-medium text-danger hover:text-danger/80 px-[10px] py-[6px] rounded-md hover:bg-danger/5 transition-colors flex items-center gap-[4px]"
            >
              <Trash2 className="w-[13px] h-[13px]" />
              Delete
            </button>
          </div>

          <div className="w-[1px] h-[14px] bg-hairline" />

          <button
            onClick={() => setSelectedCardIds([])}
            className="text-[11px] font-semibold text-ink-subtle hover:text-ink transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
