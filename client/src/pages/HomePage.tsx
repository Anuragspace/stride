import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, Star, ArrowRight, CheckCircle2, AlertCircle,
  Calendar, LayoutDashboard, TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCards } from '@/hooks/useCards';
import { useCanvases } from '@/hooks/useCanvases';
import { useEvents } from '@/hooks/useEvents';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn, formatDate, isOverdue, getStatusColor, getStatusLabel } from '@/lib/utils';

export default function HomePage() {
  const { user } = useAuth();
  const { canvases, isLoading: isLoadingCanvases } = useCanvases();
  const { events, isLoading: isLoadingEvents } = useEvents();
  const navigate = useNavigate();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const activeCanvases = canvases?.slice(0, 4) || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-[1100px] mx-auto px-[40px] py-[40px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-[40px]"
        >
          <h1 className="text-[28px] font-bold text-ink tracking-display">
            {greeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-[14px] text-ink-muted mt-[4px]">
            Here's what's happening in your workspace
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-[20px]"
        >
          {/* Active Canvases */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="flex items-center gap-[8px] mb-[16px]">
              <LayoutDashboard className="w-[16px] h-[16px] text-accent" />
              <h2 className="text-[15px] font-semibold text-ink tracking-heading">
                Active Canvases
              </h2>
            </div>
            {isLoadingCanvases ? (
              <div className="grid grid-cols-2 gap-[12px]">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-[#111113] border border-white/[0.04] rounded-xl p-[20px]">
                    <Skeleton width="60%" height="16px" />
                    <Skeleton width="40%" height="12px" className="mt-[8px]" />
                  </div>
                ))}
              </div>
            ) : activeCanvases.length > 0 ? (
              <div className="grid grid-cols-2 gap-[12px]">
                {activeCanvases.map((canvas) => (
                  <motion.div
                    key={canvas.id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => navigate(`/app/canvas/${canvas.id}`)}
                    className="bg-[#111113] hover:bg-[#161619] border border-white/[0.04] hover:border-white/[0.08] rounded-xl p-[20px] cursor-pointer gradient-card hover:shadow-xl transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-[10px] mb-[8px]">
                      <span className="text-[18px]">{canvas.emoji || '📋'}</span>
                      <h3 className="text-[14px] font-semibold text-ink truncate flex-1">{canvas.name}</h3>
                      {canvas.isStarred && (
                        <Star className="w-[12px] h-[12px] text-warning fill-warning flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-ink-subtle">
                        {canvas._count?.cards || 0} cards
                      </span>
                      <ArrowRight className="w-[14px] h-[14px] text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<LayoutDashboard className="w-[32px] h-[32px]" />}
                title="No canvases yet"
                description="Create your first canvas to start organizing your work"
              />
            )}
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-[8px] mb-[16px]">
              <Clock className="w-[16px] h-[16px] text-ink-subtle" />
              <h2 className="text-[15px] font-semibold text-ink tracking-heading">
                Recent Activity
              </h2>
            </div>
            <div className="bg-[#111113] border border-white/[0.04] rounded-xl overflow-hidden flex flex-col min-h-[220px]">
              <div className="flex-1">
                <ActivityFeed
                  events={events.slice(0, 4)}
                  isLoading={isLoadingEvents}
                />
              </div>
              {!isLoadingEvents && events.length > 0 && (
                <button
                  onClick={() => navigate('/app/activity')}
                  className="w-full py-[12px] text-center text-[12px] font-semibold text-accent hover:text-accent/80 hover:bg-white/[0.02] border-t border-white/[0.04] transition-all duration-150 flex items-center justify-center gap-[6px]"
                >
                  <span>View all activity</span>
                  <ArrowRight className="w-[12px] h-[12px]" />
                </button>
              )}
            </div>
          </motion.div>

          {/* All Canvases */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <div className="flex items-center gap-[8px] mb-[16px]">
              <LayoutDashboard className="w-[16px] h-[16px] text-ink-subtle" />
              <h2 className="text-[15px] font-semibold text-ink tracking-heading">
                All Canvases
              </h2>
            </div>
            {isLoadingCanvases ? (
              <div className="grid grid-cols-3 gap-[12px]">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-surface-2 border border-hairline rounded-xl p-[20px]">
                    <Skeleton width="60%" height="14px" />
                    <Skeleton width="40%" height="12px" className="mt-[8px]" />
                  </div>
                ))}
              </div>
            ) : canvases && canvases.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[12px]">
                {canvases.map((canvas) => (
                  <motion.div
                    key={canvas.id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => navigate(`/app/canvas/${canvas.id}`)}
                    className="bg-surface-2 border border-hairline rounded-xl p-[20px] cursor-pointer gradient-card hover:border-white/[0.12] transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-[10px] mb-[8px]">
                      <span className="text-[18px]">{canvas.emoji || '📋'}</span>
                      <h3 className="text-[14px] font-semibold text-ink truncate flex-1">{canvas.name}</h3>
                      {canvas.isStarred && (
                        <Star className="w-[12px] h-[12px] text-warning fill-warning flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-ink-subtle">
                        {canvas._count?.cards || 0} cards
                      </span>
                      <ArrowRight className="w-[14px] h-[14px] text-ink-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No canvases yet"
                description="Create your first canvas to start organizing your work"
                action={{
                  label: 'Create Canvas',
                  onClick: () => {},
                }}
              />
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
