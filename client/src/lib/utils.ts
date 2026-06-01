import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow, isPast } from 'date-fns';
import type { CardStatus, CardPriority, CardType } from '@/types';

/** Merge Tailwind classes with conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an ISO date string */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d, yyyy');
}

/** Format a relative time string */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: true });
}

/** Check if a due date is overdue */
export function isOverdue(date: string | null | undefined): boolean {
  if (!date) return false;
  return isPast(new Date(date)) && !isToday(new Date(date));
}

/** Get status color class */
export function getStatusColor(status: CardStatus): string {
  const colors: Record<CardStatus, string> = {
    not_started: '#666666',
    in_progress: '#0099ff',
    on_hold: '#ffab00',
    done: '#00c853',
  };
  return colors[status];
}

/** Get status label */
export function getStatusLabel(status: CardStatus): string {
  const labels: Record<CardStatus, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    on_hold: 'On Hold',
    done: 'Done',
  };
  return labels[status];
}

/** Get priority label */
export function getPriorityLabel(priority: CardPriority): string {
  const labels: Record<CardPriority, string> = {
    0: 'No Priority',
    1: 'Low',
    2: 'Medium',
    3: 'High',
  };
  return labels[priority];
}

/** Get priority color */
export function getPriorityColor(priority: CardPriority): string {
  const colors: Record<CardPriority, string> = {
    0: '#444444',
    1: '#666666',
    2: '#ffab00',
    3: '#ff3d3d',
  };
  return colors[priority];
}

/** Get card type icon name */
export function getTypeLabel(type: CardType): string {
  const labels: Record<CardType, string> = {
    task: 'Task',
    bug: 'Bug',
    feature: 'Feature',
    design: 'Design',
    research: 'Research',
  };
  return labels[type];
}

/** Get initials from a name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Generate a deterministic color from a string */
export function stringToColor(str: string): string {
  const colors = [
    '#ff0080', '#7c3aed', '#0099ff', '#00c853',
    '#ff6b00', '#ff4757', '#ffab00', '#00bcd4',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/** Generate a unique ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Debounce function */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Pluralize a word */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`);
}
