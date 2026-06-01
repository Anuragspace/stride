import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  GripHorizontal,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { cn, formatDate, isOverdue, getStatusColor, getStatusLabel } from '@/lib/utils';
import { useCards } from '@/hooks/useCards';
import type { Card } from '@/types';

// ── helpers ────────────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  task: '📋',
  bug: '🐛',
  feature: '✨',
  design: '🎨',
  research: '🔬',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDueDateKey(dueDate: string) {
  // dueDate is ISO string like "2024-06-15T00:00:00.000Z"
  const d = new Date(dueDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── component ──────────────────────────────────────────────────────────────

interface CalendarViewProps {
  cards: Card[];
  isLoading: boolean;
  onCardClick: (cardId: string) => void;
  canvasId: string;
}

export function CalendarView({ cards, isLoading, onCardClick, canvasId }: CalendarViewProps) {
  const { updateCard } = useCards(canvasId);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const todayKey = toDateKey(today);

  // Navigate
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  // Build grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month); // 0-6
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const cells: Array<{ key: string; date: Date | null; day: number | null; isToday: boolean; isCurrentMonth: boolean }> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstDay + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      // Adjacent month — compute real date for drag targets
      const d = new Date(year, month, dayNum);
      cells.push({ key: toDateKey(d), date: d, day: d.getDate(), isToday: toDateKey(d) === todayKey, isCurrentMonth: false });
    } else {
      const d = new Date(year, month, dayNum);
      cells.push({ key: toDateKey(d), date: d, day: dayNum, isToday: toDateKey(d) === todayKey, isCurrentMonth: true });
    }
  }

  // Map cards to date buckets
  const cardsByDate = useMemo(() => {
    const map: Record<string, Card[]> = {};
    cards.forEach(card => {
      if (card.dueDate) {
        const key = parseDueDateKey(card.dueDate);
        if (!map[key]) map[key] = [];
        map[key].push(card);
      }
    });
    return map;
  }, [cards]);

  // Unscheduled cards
  const unscheduled = useMemo(() => cards.filter(c => !c.dueDate), [cards]);

  // ── drag-and-drop ──────────────────────────────────────────────────────

  const handleDragStart = useCallback((cardId: string) => {
    setDragCardId(cardId);
  }, []);

  const handleDrop = useCallback(async (dateKey: string) => {
    if (!dragCardId) return;
    // Parse dateKey (YYYY-MM-DD) into ISO string
    const [y, m, d] = dateKey.split('-').map(Number);
    const newDate = new Date(y, m - 1, d, 12, 0, 0);
    await updateCard({ id: dragCardId, dueDate: newDate.toISOString() });
    setDragCardId(null);
    setDragOverCell(null);
  }, [dragCardId, updateCard]);

  const handleRemoveDueDate = useCallback(async (cardId: string) => {
    await updateCard({ id: cardId, dueDate: null });
  }, [updateCard]);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main Calendar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-[24px] py-[16px] flex items-center gap-[12px] border-b border-hairline flex-shrink-0">
          <button
            onClick={prevMonth}
            className="p-[6px] rounded-lg text-ink-subtle hover:text-ink hover:bg-white/[0.06] transition-all"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-[16px] h-[16px]" />
          </button>
          <h2 className="text-[18px] font-bold text-ink tracking-display min-w-[180px] text-center">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-[6px] rounded-lg text-ink-subtle hover:text-ink hover:bg-white/[0.06] transition-all"
            aria-label="Next month"
          >
            <ChevronRight className="w-[16px] h-[16px]" />
          </button>
          <button
            onClick={goToday}
            className="ml-[4px] px-[12px] py-[5px] rounded-lg text-[12px] font-semibold text-ink-subtle border border-hairline hover:text-ink hover:bg-white/[0.06] transition-all"
          >
            Today
          </button>
        </div>

        {/* Day-name header */}
        <div className="grid grid-cols-7 border-b border-hairline flex-shrink-0">
          {DAY_NAMES.map(day => (
            <div
              key={day}
              className={cn(
                'py-[10px] text-center text-[11px] font-semibold tracking-wide uppercase',
                day === 'Sun' || day === 'Sat' ? 'text-ink-muted' : 'text-ink-subtle'
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div
          className="flex-1 overflow-y-auto"
          onDragOver={e => e.preventDefault()}
        >
          <div className="grid grid-cols-7 min-h-full">
            {cells.map((cell, idx) => {
              const cellCards = cell.key ? (cardsByDate[cell.key] || []) : [];
              const isDropTarget = dragOverCell === cell.key;
              const isWeekend = idx % 7 === 0 || idx % 7 === 6;

              return (
                <div
                  key={`${cell.key}-${idx}`}
                  className={cn(
                    'min-h-[120px] border-r border-b border-hairline p-[6px] flex flex-col gap-[4px] transition-colors duration-100',
                    !cell.isCurrentMonth && 'opacity-40',
                    isWeekend && 'bg-white/[0.008]',
                    cell.isToday && 'bg-accent/[0.04]',
                    isDropTarget && 'bg-accent/[0.08] border-accent/30',
                  )}
                  onDragOver={e => { e.preventDefault(); setDragOverCell(cell.key); }}
                  onDragLeave={() => setDragOverCell(null)}
                  onDrop={() => handleDrop(cell.key)}
                >
                  {/* Day number */}
                  <div
                    className={cn(
                      'w-[26px] h-[26px] flex items-center justify-center rounded-full text-[12px] font-semibold self-start flex-shrink-0 mb-[2px]',
                      cell.isToday
                        ? 'bg-accent text-white'
                        : 'text-ink-subtle'
                    )}
                  >
                    {cell.day}
                  </div>

                  {/* Card chips */}
                  {cellCards.slice(0, 3).map(card => (
                    <CalendarCardChip
                      key={card.id}
                      card={card}
                      onClick={() => onCardClick(card.id)}
                      onDragStart={handleDragStart}
                    />
                  ))}
                  {cellCards.length > 3 && (
                    <button
                      className="text-[11px] text-ink-muted hover:text-ink-subtle px-[6px] py-[2px] text-left transition-colors"
                      onClick={() => onCardClick(cellCards[3].id)}
                    >
                      +{cellCards.length - 3} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unscheduled sidebar */}
      <div
        className="w-[220px] border-l border-hairline flex flex-col flex-shrink-0"
        onDragOver={e => { e.preventDefault(); setDragOverCell('__unscheduled__'); }}
        onDragLeave={() => setDragOverCell(null)}
        onDrop={async () => {
          if (!dragCardId) return;
          await handleRemoveDueDate(dragCardId);
          setDragCardId(null);
          setDragOverCell(null);
        }}
      >
        <div className={cn(
          'px-[14px] py-[12px] border-b border-hairline flex-shrink-0 transition-colors',
          dragOverCell === '__unscheduled__' && 'bg-warning/[0.06]'
        )}>
          <div className="flex items-center gap-[6px] mb-[2px]">
            <CalendarDays className="w-[13px] h-[13px] text-ink-muted" />
            <span className="text-[11px] font-bold text-ink-subtle uppercase tracking-wide">
              Unscheduled
            </span>
          </div>
          <p className="text-[10px] text-ink-muted">Drag here to remove due date</p>
        </div>

        <div className="flex-1 overflow-y-auto p-[8px] flex flex-col gap-[6px]">
          {unscheduled.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[80px] text-ink-muted gap-[6px]">
              <Calendar className="w-[20px] h-[20px] opacity-40" />
              <span className="text-[11px] opacity-60">All cards scheduled</span>
            </div>
          )}
          {unscheduled.map(card => (
            <UnscheduledChip
              key={card.id}
              card={card}
              onClick={() => onCardClick(card.id)}
              onDragStart={handleDragStart}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CalendarCardChip ────────────────────────────────────────────────────────

interface ChipProps {
  card: Card;
  onClick: () => void;
  onDragStart: (id: string) => void;
}

function CalendarCardChip({ card, onClick, onDragStart }: ChipProps) {
  const overdue = card.dueDate && isOverdue(card.dueDate) && card.status !== 'done';
  const statusColor = getStatusColor(card.status);

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(card.id); }}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={cn(
        'flex items-center gap-[5px] px-[7px] py-[4px] rounded-md cursor-pointer transition-all duration-100',
        'bg-[#1a1a1e] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#202025]',
        'text-[11px] font-medium text-ink-subtle hover:text-ink',
        overdue && 'border-red-400/25 bg-red-400/[0.06] text-red-400/90',
        'select-none'
      )}
      title={card.title}
    >
      {/* Status dot */}
      <span
        className="w-[5px] h-[5px] rounded-full flex-shrink-0"
        style={{ backgroundColor: statusColor }}
      />
      {/* Type emoji */}
      <span className="text-[10px] flex-shrink-0">{TYPE_EMOJI[card.type] || '📋'}</span>
      {/* Title - truncated */}
      <span className="truncate flex-1 min-w-0">{card.title}</span>
      {/* Overdue indicator */}
      {overdue && <AlertCircle className="w-[9px] h-[9px] flex-shrink-0 text-red-400" />}
    </div>
  );
}

// ── UnscheduledChip ─────────────────────────────────────────────────────────

function UnscheduledChip({ card, onClick, onDragStart }: ChipProps) {
  const statusColor = getStatusColor(card.status);

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(card.id); }}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={cn(
        'flex items-center gap-[6px] px-[8px] py-[6px] rounded-lg cursor-grab active:cursor-grabbing',
        'bg-[#111113] border border-white/[0.05] hover:border-white/[0.10] hover:bg-[#161619]',
        'transition-all duration-100 select-none group'
      )}
      title={card.title}
    >
      <GripHorizontal className="w-[10px] h-[10px] text-ink-muted flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span
        className="w-[5px] h-[5px] rounded-full flex-shrink-0"
        style={{ backgroundColor: statusColor }}
      />
      <span className="text-[11px] text-ink-subtle truncate flex-1 min-w-0">{card.title}</span>
    </div>
  );
}
