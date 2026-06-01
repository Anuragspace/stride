import React from 'react';
import {
  PlusCircle, Edit, Trash2, ArrowRight,
  CheckCircle2, AlertCircle, Star, Calendar,
  UserPlus, UserMinus, Archive, RefreshCw, MessageSquare
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { Event } from '@/types';

interface ActivityItemProps {
  event: Event;
  onCardClick?: (cardId: string) => void;
}

function getActionIcon(action: string) {
  switch (action) {
    case 'created': return <PlusCircle className="w-[14px] h-[14px] text-success" />;
    case 'completed': return <CheckCircle2 className="w-[14px] h-[14px] text-success" />;
    case 'reopened': return <RefreshCw className="w-[14px] h-[14px] text-accent" />;
    case 'status_changed':
    case 'moved': return <ArrowRight className="w-[14px] h-[14px] text-warning" />;
    case 'priority_changed': return <Star className="w-[14px] h-[14px] text-warning animate-pulse-soft" />;
    case 'assigned': return <UserPlus className="w-[14px] h-[14px] text-accent" />;
    case 'unassigned': return <UserMinus className="w-[14px] h-[14px] text-ink-subtle" />;
    case 'due_date_changed': return <Calendar className="w-[14px] h-[14px] text-accent" />;
    case 'edited': return <Edit className="w-[14px] h-[14px] text-ink-muted" />;
    case 'deleted': return <Trash2 className="w-[14px] h-[14px] text-danger" />;
    case 'archived': return <Archive className="w-[14px] h-[14px] text-danger" />;
    case 'restored': return <RefreshCw className="w-[14px] h-[14px] text-success" />;
    case 'added': return <MessageSquare className="w-[14px] h-[14px] text-accent" />;
    default: return <AlertCircle className="w-[14px] h-[14px] text-ink-subtle" />;
  }
}

function getActionText(event: Event): React.ReactNode {
  const entityName = event.card?.title || event.canvas?.name || event.entity_type;
  const meta = typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata;

  switch (event.action) {
    case 'created': 
      return <>created {event.entity_type} <span className="font-semibold text-ink">"{entityName}"</span></>;
    case 'completed': 
      return <>completed task <span className="font-semibold text-ink">"{entityName}"</span></>;
    case 'reopened': 
      return <>reopened task <span className="font-semibold text-ink">"{entityName}"</span></>;
    case 'status_changed':
    case 'moved': {
      const fromCol = meta?.fromColumn || meta?.oldStatus;
      const toCol = meta?.toColumn || meta?.newStatus;
      if (fromCol && toCol) {
        return <>moved <span className="font-semibold text-ink">"{entityName}"</span> from <span className="text-ink-muted">{fromCol}</span> → <span className="text-accent">{toCol}</span></>;
      }
      return <>moved <span className="font-semibold text-ink">"{entityName}"</span></>;
    }
    case 'priority_changed': {
      const oldPri = meta?.oldPriority || 'Low';
      const newPri = meta?.newPriority || 'High';
      return <>changed priority of <span className="font-semibold text-ink">"{entityName}"</span> from <span className="text-ink-muted capitalize">{oldPri}</span> → <span className="text-warning capitalize">{newPri}</span></>;
    }
    case 'assigned': {
      const assigneeName = meta?.assigneeName;
      if (assigneeName) {
        return <>assigned <span className="font-semibold text-ink">"{entityName}"</span> to <span className="font-semibold text-accent">{assigneeName}</span></>;
      }
      return <>assigned <span className="font-semibold text-ink">"{entityName}"</span></>;
    }
    case 'unassigned':
      return <>unassigned themselves from <span className="font-semibold text-ink">"{entityName}"</span></>;
    case 'due_date_changed': {
      const dueStr = meta?.newDueDate ? new Date(meta.newDueDate).toLocaleDateString() : 'None';
      return <>scheduled <span className="font-semibold text-ink">"{entityName}"</span> for <span className="text-accent">{dueStr}</span></>;
    }
    case 'edited': 
      return <>renamed card to <span className="font-semibold text-ink">"{entityName}"</span></>;
    case 'deleted': 
      return <>deleted {event.entity_type} <span className="font-semibold text-ink">"{entityName}"</span></>;
    case 'archived': 
      return <>archived {event.entity_type} <span className="font-semibold text-ink">"{entityName}"</span></>;
    case 'restored': 
      return <>restored {event.entity_type} <span className="font-semibold text-ink">"{entityName}"</span></>;
    case 'added': 
      return <>commented on <span className="font-semibold text-ink">"{entityName}"</span></>;
    default: 
      return <>{event.action} {event.entity_type} <span className="font-semibold text-ink">"{entityName}"</span></>;
  }
}

export function ActivityItem({ event, onCardClick }: ActivityItemProps) {
  const navigate = useNavigate();
  const isClickable = !!event.cardId;

  const handleClick = () => {
    if (!event.cardId) return;
    if (onCardClick) {
      onCardClick(event.cardId);
    } else if (event.canvasId) {
      navigate(`/canvas/${event.canvasId}/card/${event.cardId}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-start gap-[12px] px-[12px] py-[10px] rounded-lg hover:bg-white/[0.02] transition-colors duration-100 group",
        isClickable ? "cursor-pointer" : "cursor-default"
      )}
    >
      <Avatar
        src={event.user?.avatarUrl}
        name={event.user?.name || 'User'}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-ink leading-snug">
          <span className="font-medium">{event.user?.name || 'Someone'}</span>
          {' '}
          <span className="text-ink-muted">{getActionText(event)}</span>
        </p>
        <div className="flex items-center gap-[6px] mt-[4px]">
          {getActionIcon(event.action)}
          <span className="text-[11px] text-ink-subtle">
            {formatRelativeTime(event.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
