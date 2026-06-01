import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, AlertCircle, Star, GripVertical, CheckCircle2, Circle, UserPlus, Lock } from 'lucide-react';
import { cn, formatDate, isOverdue, getPriorityColor, getPriorityLabel, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Dropdown } from '@/components/ui/Dropdown';
import { useCards } from '@/hooks/useCards';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/contexts/AuthContext';
import type { Card } from '@/types';

const stripHtml = (html: string) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
};

interface CardTileProps {
  card: Card;
  onClick: () => void;
  isDragOverlay?: boolean;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
}

export function CardTile({
  card,
  onClick,
  isDragOverlay = false,
  isSelected = false,
  onSelect,
}: CardTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { updateCard, completeCard, reopenCard, deleteCard } = useCards(card.canvasId);
  const { members } = useWorkspace();
  const { user: currentUser } = useAuth();

  const isAssignedToOther = false;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(card.title);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditingTitle && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditingTitle]);

  const typeIcons: Record<string, string> = {
    task: '📋',
    bug: '🐛',
    feature: '✨',
    design: '🎨',
    research: '🔬',
  };

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTitleSave();
    }
    if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setTitleText(card.title);
    }
  };

  const handleTitleSave = async () => {
    setIsEditingTitle(false);
    if (titleText.trim() && titleText.trim() !== card.title) {
      await updateCard({ id: card.id, title: titleText.trim() });
    }
  };

  const handleCompleteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Complete and remove the task instantly in one click!
    await deleteCard(card.id);
  };

  const handlePriorityCycle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Cycle priority: 1 (Low) -> 2 (Medium) -> 3 (High) -> 1
    const nextPriority = (card.priority % 3) + 1;
    await updateCard({ id: card.id, priority: nextPriority });
  };

  const handleStatusChange = async (statusId: string) => {
    await updateCard({ id: card.id, status: statusId });
  };

  const handleAssigneeToggle = async (userId: string) => {
    const isAssigned = card.assignees?.some((a) => a.userId === userId);
    const currentAssignees = card.assignees || [];
    
    let newAssignees;
    if (isAssigned) {
      newAssignees = currentAssignees.filter((a) => a.userId !== userId);
    } else {
      const member = members?.find((m) => m.userId === userId);
      if (member) {
        newAssignees = [...currentAssignees, {
          cardId: card.id,
          userId,
          user: member.user,
          assignedAt: new Date().toISOString(),
        }];
      } else {
        return;
      }
    }

    await updateCard({
      id: card.id,
      assignees: newAssignees,
    });
  };

  const handleTileClick = (e: React.MouseEvent) => {
    // If Shift key is held, trigger selection instead of opening
    if (e.shiftKey && onSelect) {
      e.preventDefault();
      onSelect(e);
    } else {
      onClick();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleTileClick}
      className={cn(
        'group bg-[#111113] hover:bg-[#161619] border border-white/[0.04] hover:border-white/[0.08] rounded-xl p-[12px] cursor-pointer flex-shrink-0',
        'hover:shadow-xl hover:shadow-black/30',
        'transition-all duration-150 ease-out gradient-card relative',
        isDragging && 'opacity-30',
        isDragOverlay && 'drag-overlay border-accent/40 shadow-accent/10 shadow-2xl',
        isSelected && 'border-accent shadow-lg shadow-accent/5 ring-1 ring-accent'
      )}
      role="button"
      tabIndex={0}
      aria-label={card.title}
    >
      {/* Hover Drag/Lock Handle in Top-Right Corner */}
      <div
        {...(!isAssignedToOther ? attributes : {})}
        {...(!isAssignedToOther ? listeners : {})}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute right-[6px] top-[6px] transition-all duration-150 p-[4px] rounded z-30",
          isAssignedToOther 
            ? "opacity-100 text-red-400 bg-red-400/10 border border-red-400/20 cursor-not-allowed" 
            : "opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing hover:bg-white/[0.05]"
        )}
        aria-label={isAssignedToOther ? "Locked card" : "Drag handle"}
      >
        {isAssignedToOther ? (
          <Lock className="w-[11px] h-[11px]" />
        ) : (
          <GripVertical className="w-[11px] h-[11px] text-ink-subtle hover:text-ink" />
        )}
      </div>

      <div className="pl-0 space-y-[10px]">
        {/* Title + Checkbox Row */}
        <div className="flex items-start gap-[8px] pr-[16px]">
          <button
            onClick={handleCompleteToggle}
            className="flex-shrink-0 mt-[2px] text-ink-subtle hover:text-success transition-colors duration-100 relative z-20"
            aria-label={card.completed ? 'Reopen card' : 'Complete card'}
          >
            {card.completed ? (
              <CheckCircle2 className="w-[15px] h-[15px] text-success fill-success/10" />
            ) : (
              <Circle className="w-[15px] h-[15px]" />
            )}
          </button>

          <span className="text-[12px] flex-shrink-0 mt-[2px] select-none">{typeIcons[card.type] || '📋'}</span>
          
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <textarea
                ref={textareaRef}
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-[14px] font-semibold text-white bg-[#1a1a1e] border border-white/[0.12] rounded px-[6px] py-[3px] focus:outline-none focus:border-white/[0.2] focus:ring-1 focus:ring-white/[0.04] resize-none min-h-[36px] relative z-20"
              />
            ) : (
              <h4
                onDoubleClick={handleTitleDoubleClick}
                className={cn(
                  'text-[14px] font-semibold text-white/90 leading-snug select-text relative z-10 break-words',
                  card.completed && 'text-ink-subtle line-through'
                )}
                title="Double click to edit title"
              >
                {card.title}
              </h4>
            )}
          </div>
        </div>

        {/* Description Excerpt */}
        {card.description && stripHtml(card.description).trim() && (
          <div className="pl-[23px]">
            <div className="text-[12px] text-ink-muted leading-relaxed line-clamp-3 select-none bg-white/[0.01] border border-white/[0.03] rounded-lg px-[10px] py-[8px] hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-150 break-words">
              {stripHtml(card.description)}
            </div>
          </div>
        )}

        {/* Labels row */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-[4px] pl-[23px]">
            {card.labels.slice(0, 3).map((label) => (
              <Badge key={label.id} color={label.color} size="sm">
                {label.name}
              </Badge>
            ))}
            {card.labels.length > 3 && (
              <Badge color="#666666" size="sm">
                +{card.labels.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Bottom row: Compact Status, Priority, Due Date & Assignee */}
        <div className="flex items-center justify-between border-t border-white/[0.03] pt-[8px] pl-[23px] gap-[8px] flex-wrap">
          {/* Left Metadata pills */}
          <div className="flex items-center gap-[6px] flex-wrap">
            {/* Status Dropdown */}
            <Dropdown
              trigger={
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-[5px] px-[8px] py-[3px] rounded-full text-[11px] font-semibold transition-all relative z-20 hover:brightness-110"
                  style={{
                    backgroundColor: `${getStatusColor(card.status)}12`,
                    color: getStatusColor(card.status),
                    border: `1px solid ${getStatusColor(card.status)}25`
                  }}
                >
                  <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ backgroundColor: getStatusColor(card.status) }} />
                  <span>{getStatusLabel(card.status) || 'Not Started'}</span>
                </button>
              }
              items={[
                { id: 'not_started', label: 'Not Started' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'on_hold', label: 'On Hold' },
                { id: 'done', label: 'Done' },
              ]}
              onSelect={handleStatusChange}
              align="left"
            />

            {/* Priority Pill */}
            <button
              onClick={handlePriorityCycle}
              className={cn(
                "flex items-center gap-[4px] px-[8px] py-[3px] rounded-full border text-[11px] font-semibold transition-all relative z-20 hover:bg-white/[0.04]",
                card.priority === 3 ? "bg-warning/10 border-warning/30 text-warning" :
                card.priority === 2 ? "bg-accent/10 border-accent/30 text-accent" :
                "bg-white/[0.02] border-white/[0.06] text-ink-subtle"
              )}
              title={`Priority: ${getPriorityLabel(card.priority as any)}. Click to cycle.`}
            >
              <Star className={cn("w-[10px] h-[10px] fill-current")} />
              <span>{getPriorityLabel(card.priority as any)}</span>
            </button>
 
            {/* Due Date Badge */}
            {card.dueDate && (
              <div
                className={cn(
                  'flex items-center gap-[4px] text-[11px] font-semibold px-[8px] py-[3px] rounded-full border',
                  isOverdue(card.dueDate) && !card.completed && card.status !== 'done'
                    ? 'bg-red-400/10 border-red-400/25 text-red-400'
                    : 'bg-white/[0.02] border-white/[0.06] text-ink-subtle'
                )}
              >
                <Calendar className="w-[10px] h-[10px]" />
                <span>{formatDate(card.dueDate)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
