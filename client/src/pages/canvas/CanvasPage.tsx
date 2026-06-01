import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCards } from '@/hooks/useCards';
import { useCanvas } from '@/hooks/useCanvases';
import { useSocket } from '@/hooks/useSocket';
import { useFilters } from '@/hooks/useFilters';
import { BoardView } from './BoardView';
import { CalendarView } from './CalendarView';
import { CanvasToolbar } from './CanvasToolbar';
import { CardDetailPanel } from '@/components/card/CardDetailPanel';
import { CanvasSettingsModal } from '@/components/board/CanvasSettingsModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Settings } from 'lucide-react';
import type { ViewMode } from '@/types';

export default function CanvasPage() {
  const { canvasId, cardId } = useParams<{ canvasId: string; cardId?: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(cardId || null);
  const [addCardMemberId, setAddCardMemberId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { cards, isLoading: isLoadingCards } = useCards(canvasId!);
  const { canvas, isLoading: isLoadingCanvas } = useCanvas(canvasId!);
  const { filters, setFilters, sort, setSort, filterCards } = useFilters();

  // Connect to canvas socket room
  useSocket(canvasId);

  const filteredCards = useMemo(
    () => (cards ? filterCards(cards) : []),
    [cards, filterCards]
  );

  const handleCardClick = (id: string) => {
    setSelectedCardId(id);
    setAddCardMemberId(null);
  };

  const handleAddCard = (memberId: string) => {
    setAddCardMemberId(memberId);
    setSelectedCardId('new');
  };

  if (!canvasId) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Canvas header */}
      <div className="px-[24px] pt-[20px] pb-[4px] flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-[10px] mb-[4px]">
            <span className="text-[24px]">{canvas?.icon || '📋'}</span>
            <h1 className="text-[22px] font-bold text-ink tracking-display">
              {canvas?.name || <Skeleton width="200px" height="24px" />}
            </h1>
            {canvas && (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-[6px] rounded-lg text-ink-subtle hover:text-ink hover:bg-white/[0.05] transition-all ml-[4px]"
                aria-label="Canvas settings"
              >
                <Settings className="w-[15px] h-[15px]" />
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Toolbar */}
      <CanvasToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={filters}
        onFiltersChange={setFilters}
        sort={sort}
        onSortChange={setSort}
      />

      {/* View */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'board' && (
          <BoardView
            cards={filteredCards}
            isLoading={isLoadingCards || isLoadingCanvas}
            onCardClick={handleCardClick}
            onAddCard={handleAddCard}
            canvasId={canvasId}
          />
        )}
        {viewMode === 'calendar' && (
          <CalendarView
            cards={filteredCards}
            isLoading={isLoadingCards || isLoadingCanvas}
            onCardClick={handleCardClick}
            canvasId={canvasId}
          />
        )}
      </div>

      {/* Card detail panel (Also serves as creation drawer when selectedCardId === 'new') */}
      <CardDetailPanel
        cardId={selectedCardId}
        canvasId={canvasId}
        preAssignedMemberId={addCardMemberId}
        onClose={() => {
          setSelectedCardId(null);
          setAddCardMemberId(null);
        }}
      />

      {/* Canvas settings modal */}
      <CanvasSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        canvasId={canvasId}
      />
    </div>
  );
}
