import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { ActivityFeed } from '@/components/activity/ActivityFeed';

export default function ActivityPage() {
  const { events, isLoading } = useEvents();

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-[700px] mx-auto px-[40px] py-[40px]">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-[30px]"
        >
          <div className="flex items-center gap-[12px] mb-[4px]">
            <Activity className="w-[22px] h-[22px] text-ink-subtle" />
            <h1 className="text-[24px] font-bold text-ink tracking-display">
              Activity
            </h1>
          </div>
          <p className="text-[14px] text-ink-muted ml-[34px]">
            Everything that's happening in your workspace
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-surface-1 border border-hairline rounded-xl overflow-hidden"
        >
          <ActivityFeed events={events} isLoading={isLoading} />
        </motion.div>
      </div>
    </div>
  );
}
