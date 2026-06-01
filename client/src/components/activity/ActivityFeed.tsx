import React from 'react';
import { ActivityItem } from './ActivityItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Activity } from 'lucide-react';
import type { Event } from '@/types';

interface ActivityFeedProps {
  events: Event[];
  isLoading?: boolean;
  className?: string;
}

export function ActivityFeed({ events, isLoading = false, className }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className={`space-y-[12px] ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-[12px] px-[4px]">
            <Skeleton variant="circular" width="28px" height="28px" />
            <div className="flex-1 space-y-[6px]">
              <Skeleton width="60%" height="13px" />
              <Skeleton width="30%" height="11px" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="w-[40px] h-[40px]" />}
        title="No activity yet"
        description="Activity from your workspace will appear here"
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-[2px] ${className}`}>
      {events.map((event) => (
        <ActivityItem key={event.id} event={event} />
      ))}
    </div>
  );
}
