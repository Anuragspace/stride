import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star, MoreHorizontal, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvases } from '@/hooks/useCanvases';
import { Dropdown } from '@/components/ui/Dropdown';
import { Tooltip } from '@/components/ui/Tooltip';
import { Skeleton } from '@/components/ui/Skeleton';

interface CanvasListProps {
  isCollapsed: boolean;
}

export function CanvasList({ isCollapsed }: CanvasListProps) {
  const navigate = useNavigate();
  const { canvasId } = useParams();
  const { canvases, isLoading, toggleStar, deleteCanvas } = useCanvases();

  if (isLoading) {
    return (
      <div className="px-[12px] space-y-[2px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-[10px] px-[10px] py-[7px]">
            <Skeleton variant="rectangular" width="18px" height="18px" />
            {!isCollapsed && <Skeleton width={`${80 + i * 15}px`} height="13px" />}
          </div>
        ))}
      </div>
    );
  }

  const starred = canvases?.filter((c) => c.isStarred) || [];
  const unstarred = canvases?.filter((c) => !c.isStarred) || [];

  const renderCanvas = (canvas: typeof canvases extends (infer T)[] | undefined ? T : never) => {
    if (!canvas) return null;
    const isActive = canvasId === canvas.id;

    if (isCollapsed) {
      return (
        <Tooltip key={canvas.id} content={canvas.name} side="right">
          <button
            onClick={() => navigate(`/app/canvas/${canvas.id}`)}
            className={cn(
              'w-[36px] h-[36px] flex items-center justify-center rounded-md transition-all duration-150',
              isActive
                ? 'bg-white/[0.08] text-ink'
                : 'text-ink-subtle hover:text-ink hover:bg-white/[0.05]'
            )}
          >
            <span className="text-[14px]">{canvas.emoji || '📋'}</span>
          </button>
        </Tooltip>
      );
    }

    return (
      <div
        key={canvas.id}
        className={cn(
          'group flex items-center gap-[10px] px-[10px] py-[7px] rounded-md cursor-pointer transition-all duration-150',
          isActive
            ? 'bg-white/[0.08] text-ink'
            : 'text-ink-muted hover:text-ink hover:bg-white/[0.05]'
        )}
        onClick={() => navigate(`/app/canvas/${canvas.id}`)}
        role="button"
        tabIndex={0}
      >
        <span className="text-[15px] flex-shrink-0">{canvas.emoji || '📋'}</span>
        <span className="text-[13px] truncate flex-1">{canvas.name}</span>
        <div className="flex items-center gap-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(canvas.id, !canvas.isStarred);
            }}
            className="p-[4px] rounded hover:bg-white/[0.08] transition-colors"
            aria-label={canvas.isStarred ? 'Unstar canvas' : 'Star canvas'}
          >
            <Star
              className={cn(
                'w-[12px] h-[12px]',
                canvas.isStarred ? 'fill-warning text-warning' : 'text-ink-subtle'
              )}
            />
          </button>
          <Dropdown
            trigger={
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-[4px] rounded hover:bg-white/[0.08] transition-colors"
                aria-label="Canvas options"
              >
                <MoreHorizontal className="w-[12px] h-[12px] text-ink-subtle" />
              </button>
            }
            items={[
              { id: 'rename', label: 'Rename' },
              { id: 'duplicate', label: 'Duplicate' },
              { id: 'sep', label: '', separator: true },
              { id: 'delete', label: 'Delete', danger: true },
            ]}
            onSelect={(id) => {
              if (id === 'delete') {
                deleteCanvas(canvas.id);
              }
            }}
            align="right"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="px-[12px]">
      {starred.length > 0 && (
        <div className="mb-[8px]">
          {!isCollapsed && (
            <div className="px-[10px] py-[4px] text-[11px] font-semibold text-ink-subtle uppercase tracking-wider flex items-center gap-[6px]">
              <Star className="w-[10px] h-[10px] fill-current" />
              Starred
            </div>
          )}
          {starred.map(renderCanvas)}
        </div>
      )}
      {unstarred.map(renderCanvas)}
      {canvases?.length === 0 && !isCollapsed && (
        <div className="px-[10px] py-[20px] text-center">
          <FileText className="w-[24px] h-[24px] text-ink-subtle mx-auto mb-[8px]" />
          <p className="text-[12px] text-ink-subtle">No canvases yet</p>
        </div>
      )}
    </div>
  );
}
