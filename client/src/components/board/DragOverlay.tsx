import React from 'react';
import { DragOverlay as DndDragOverlay } from '@dnd-kit/core';
import { CardTile } from './CardTile';
import type { Card } from '@/types';

interface DragOverlayProps {
  activeCard: Card | null;
}

export function DragOverlay({ activeCard }: DragOverlayProps) {
  return (
    <DndDragOverlay dropAnimation={null}>
      {activeCard ? (
        <div className="w-[300px]">
          <CardTile
            card={activeCard}
            onClick={() => {}}
            isDragOverlay
          />
        </div>
      ) : null}
    </DndDragOverlay>
  );
}
