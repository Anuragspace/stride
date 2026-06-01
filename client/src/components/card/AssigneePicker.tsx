import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useCards } from '@/hooks/useCards';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

interface AssigneePickerProps {
  value: User[];
  canvasId: string;
  cardId: string;
  onChange?: (users: User[]) => void;
}

export function AssigneePicker({ value, canvasId, cardId, onChange }: AssigneePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const { members } = useWorkspace();
  const { updateCard } = useCards(canvasId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const allUsers = members?.map((m) => m.user) || [];
  const filteredUsers = allUsers.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) ||
           u.email.toLowerCase().includes(search.toLowerCase())
  );

  const isAssigned = (userId: string) => value.some((u) => u.id === userId);

  const toggleAssignee = async (user: User) => {
    const newAssignees = isAssigned(user.id)
      ? value.filter((u) => u.id !== user.id)
      : [...value, user];
    
    if (onChange) {
      onChange(newAssignees);
    } else {
      await updateCard({
        id: cardId,
        assignees: newAssignees,
      });
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-[6px] flex-wrap -ml-[4px]">
        {value.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-[6px] px-[6px] py-[3px] rounded-md bg-white/[0.05] group"
          >
            <Avatar src={user.avatarUrl} name={user.name} size="xs" />
            <span className="text-[12px] text-ink">{user.name}</span>
            <button
              onClick={() => toggleAssignee(user)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-subtle hover:text-ink"
            >
              <X className="w-[10px] h-[10px]" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-[5px] rounded-md text-ink-subtle hover:text-ink hover:bg-white/[0.05] transition-all duration-150"
        >
          <UserPlus className="w-[14px] h-[14px]" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-[4px] bg-surface-2 border border-hairline rounded-lg shadow-xl shadow-black/30 py-[4px] w-[240px] z-50 animate-fade-in">
          <div className="px-[8px] pb-[4px]">
            <input
              type="text"
              placeholder="Search members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-[8px] py-[6px] text-[12px] bg-surface-3 rounded-md border border-hairline text-ink placeholder:text-ink-subtle focus:outline-none focus:border-white/[0.16]"
              autoFocus
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto scrollbar-thin">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => toggleAssignee(user)}
                className={cn(
                  'w-full flex items-center gap-[8px] px-[12px] py-[6px] text-[12px] transition-colors duration-100',
                  isAssigned(user.id) ? 'text-accent bg-accent/5' : 'text-ink-muted hover:text-ink hover:bg-white/[0.05]'
                )}
              >
                <Avatar src={user.avatarUrl} name={user.name} size="xs" />
                <span className="truncate">{user.name}</span>
                {isAssigned(user.id) && (
                  <span className="ml-auto text-accent text-[10px]">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
