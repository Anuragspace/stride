import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, User } from 'lucide-react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { CommandPalette } from '@/components/search/CommandPalette';
import { CreateCanvasModal } from '@/components/board/CreateCanvasModal';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export function AppLayout() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCreateCanvasOpen, setIsCreateCanvasOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useKeyboardShortcuts({
    'mod+k': () => setIsCommandPaletteOpen(true),
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    }

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onCreateCanvas={() => setIsCreateCanvasOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-[52px] flex items-center justify-end gap-[8px] px-[20px] border-b border-hairline flex-shrink-0">
          <NotificationBell />
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="p-[2px] rounded-full border border-white/[0.06] hover:border-white/[0.16] hover:bg-white/[0.02] focus:outline-none transition-all duration-150"
              aria-label="Profile"
            >
              <Avatar
                src={user?.avatarUrl}
                name={user?.name || 'User'}
                size="sm"
              />
            </button>

            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="bg-surface-2 border border-hairline rounded-xl shadow-2xl shadow-black/40 min-w-[220px] absolute right-0 top-full mt-[4px] z-50"
                >
                  {/* User info */}
                  <div className="px-[12px] py-[10px] flex items-center gap-[10px]">
                    <Avatar
                      src={user?.avatarUrl}
                      name={user?.name || 'User'}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-primary truncate">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-[12px] text-secondary truncate">
                        {user?.email || ''}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-[1px] bg-hairline mx-[8px] my-[4px]" />

                  {/* Profile Settings */}
                  <div className="px-[4px] py-[4px]">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigate('/settings/profile');
                      }}
                      className="w-full px-[12px] py-[8px] flex items-center gap-[10px] text-[13px] text-primary rounded-md hover:bg-white/[0.05] cursor-pointer transition-all duration-150"
                    >
                      <User size={16} />
                      Profile Settings
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="h-[1px] bg-hairline mx-[8px] my-[4px]" />

                  {/* Log out */}
                  <div className="px-[4px] py-[4px]">
                    <button
                      onClick={handleLogout}
                      className="w-full px-[12px] py-[8px] flex items-center gap-[10px] text-[13px] text-red-400 rounded-md hover:bg-white/[0.05] cursor-pointer transition-all duration-150"
                    >
                      <LogOut size={16} />
                      Log out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      <CreateCanvasModal
        isOpen={isCreateCanvasOpen}
        onClose={() => setIsCreateCanvasOpen(false)}
      />
    </div>
  );
}
