import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn, getInitials, stringToColor } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';

interface WorkspaceSwitcherProps {
  isCollapsed: boolean;
}

export function WorkspaceSwitcher({ isCollapsed }: WorkspaceSwitcherProps) {
  const { workspace } = useAuth();

  const name = workspace?.name || 'Workspace';
  const bgColor = stringToColor(name);

  if (isCollapsed) {
    return (
      <Tooltip content={name} side="right">
        <button className="w-[36px] h-[36px] rounded-md flex items-center justify-center text-white font-bold text-[14px] transition-all duration-150 hover:opacity-80"
          style={{ backgroundColor: bgColor }}
        >
          {getInitials(name)}
        </button>
      </Tooltip>
    );
  }

  return (
    <button className="w-full flex items-center gap-[10px] px-[10px] py-[8px] rounded-md hover:bg-white/[0.05] transition-all duration-150 group">
      <div
        className="w-[32px] h-[32px] rounded-md flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0"
        style={{ backgroundColor: bgColor }}
      >
        {getInitials(name)}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[14px] font-semibold text-ink truncate tracking-heading">{name}</p>
      </div>
      <ChevronDown className="w-[14px] h-[14px] text-ink-subtle group-hover:text-ink transition-colors" />
    </button>
  );
}
