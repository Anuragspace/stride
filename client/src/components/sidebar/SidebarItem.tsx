import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isCollapsed?: boolean;
  badge?: number;
  onClick?: () => void;
}

export function SidebarItem({
  icon,
  label,
  isActive = false,
  isCollapsed = false,
  badge,
  onClick,
}: SidebarItemProps) {
  const content = (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-[10px] rounded-md transition-all duration-150',
        isCollapsed
          ? 'w-[36px] h-[36px] justify-center'
          : 'w-full px-[10px] py-[7px]',
        isActive
          ? 'bg-white/[0.08] text-ink'
          : 'text-ink-muted hover:text-ink hover:bg-white/[0.05]'
      )}
      aria-label={label}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!isCollapsed && (
        <>
          <span className="text-[13px] flex-1 text-left">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="min-w-[18px] h-[18px] px-[6px] flex items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip content={label} side="right">
        {content}
      </Tooltip>
    );
  }

  return content;
}
