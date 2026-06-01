import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Inbox } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatRelativeTime, cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-[8px] rounded-md text-ink-muted hover:text-ink hover:bg-white/[0.05] transition-all duration-150"
        aria-label="Notifications"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-[2px] -right-[2px] min-w-[16px] h-[16px] px-[4px] flex items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-[8px] w-[360px] bg-surface-2 border border-hairline rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-[16px] py-[12px] border-b border-hairline">
              <h3 className="text-[14px] font-semibold text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-[12px] text-accent hover:text-accent/80 font-medium transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications list */}
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
              {notifications && notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      'flex items-start gap-[12px] px-[16px] py-[12px] hover:bg-white/[0.03] transition-colors duration-100 cursor-pointer border-b border-hairline last:border-none',
                      !notif.is_read && 'bg-accent/[0.03]'
                    )}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className="flex-shrink-0 mt-[2px]">
                      {!notif.is_read && (
                        <div className="w-[6px] h-[6px] rounded-full bg-accent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-ink font-medium leading-snug">
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-[12px] text-ink-muted mt-[2px] truncate">
                          {notif.body}
                        </p>
                      )}
                      <p className="text-[11px] text-ink-subtle mt-[4px]">
                        {formatRelativeTime(notif.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-[40px]">
                  <EmptyState
                    icon={<Inbox className="w-[32px] h-[32px]" />}
                    title="All caught up"
                    description="No new notifications"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
