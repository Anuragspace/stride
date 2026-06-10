import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Plus,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { CanvasList } from './CanvasList';
import { SidebarItem } from './SidebarItem';
import { Tooltip } from '@/components/ui/Tooltip';

interface SidebarProps {
  onOpenCommandPalette?: () => void;
  onCreateCanvas?: () => void;
}

export function Sidebar({ onOpenCommandPalette, onCreateCanvas }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const navItems = [
    { id: 'home', label: 'Home', icon: <LayoutDashboard className="w-[18px] h-[18px]" />, path: '/app' },
    { id: 'activity', label: 'Activity', icon: <Activity className="w-[18px] h-[18px]" />, path: '/app/activity' },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-[18px] h-[18px]" />, path: '/app/settings' },
  ];

  return (
    <aside
      className={cn(
        'h-screen bg-surface-1 border-r border-hairline flex flex-col transition-all duration-250 ease-out flex-shrink-0',
        isCollapsed ? 'w-[60px]' : 'w-[260px]'
      )}
    >
      {/* Workspace Switcher */}
      <div className="px-[12px] pt-[12px] pb-[4px]">
        <WorkspaceSwitcher isCollapsed={isCollapsed} />
      </div>

      {/* Search / Command Palette trigger */}
      {!isCollapsed && (
        <div className="px-[12px] py-[4px]">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center gap-[10px] px-[10px] py-[7px] text-[13px] text-ink-subtle rounded-md border border-hairline hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-150"
          >
            <Search className="w-[14px] h-[14px]" />
            <span>Search…</span>
            <kbd className="ml-auto text-[11px] text-ink-subtle bg-surface-3 px-[6px] py-[1px] rounded">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {isCollapsed && (
        <div className="px-[12px] py-[4px]">
          <Tooltip content="Search (⌘K)" side="right">
            <button
              onClick={onOpenCommandPalette}
              className="w-[36px] h-[36px] flex items-center justify-center text-ink-subtle hover:text-ink hover:bg-white/[0.05] rounded-md transition-all duration-150"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Nav Items */}
      <nav className="px-[12px] py-[8px] space-y-[1px]">
        {navItems.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.path}
            isCollapsed={isCollapsed}
            onClick={() => navigate(item.path)}
          />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-[12px] h-[1px] bg-hairline" />

      {/* Canvases */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-[8px] flex flex-col justify-between">
        <div>
          {!isCollapsed && (
            <div className="flex items-center justify-between px-[20px] py-[6px]">
              <span className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">
                Canvases
              </span>
              <button
                onClick={onCreateCanvas}
                className="p-[4px] rounded text-ink-subtle hover:text-ink hover:bg-white/[0.05] transition-all duration-150"
                aria-label="Create canvas"
              >
                <Plus className="w-[14px] h-[14px]" />
              </button>
            </div>
          )}
          <CanvasList isCollapsed={isCollapsed} />
        </div>
        
        {/* Workspace Chat Item */}
        <div className="px-[12px] pt-[8px] border-t border-hairline mt-[8px]">
          <SidebarItem
            icon={<MessageSquare className="w-[18px] h-[18px]" />}
            label="Chat"
            isActive={location.pathname === '/chat'}
            isCollapsed={isCollapsed}
            onClick={() => navigate('/app/chat')}
          />
        </div>
      </div>

      {/* Collapse Toggle */}
      <div className="px-[12px] py-[12px] border-t border-hairline">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'flex items-center gap-[10px] text-ink-subtle hover:text-ink transition-all duration-150 rounded-md hover:bg-white/[0.05]',
            isCollapsed ? 'w-[36px] h-[36px] justify-center' : 'w-full px-[10px] py-[7px]'
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronsRight className="w-[18px] h-[18px]" />
          ) : (
            <>
              <ChevronsLeft className="w-[18px] h-[18px]" />
              <span className="text-[13px]">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
