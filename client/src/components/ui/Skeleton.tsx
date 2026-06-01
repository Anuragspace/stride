import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({ className, variant = 'text', width, height, lines = 1 }: SkeletonProps) {
  const variants = {
    text: 'rounded-sm h-[14px]',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  if (lines > 1) {
    return (
      <div className="flex flex-col gap-[8px]">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'skeleton-shimmer',
              variants[variant],
              i === lines - 1 && 'w-3/4',
              className
            )}
            style={{
              width: i === lines - 1 ? '75%' : width,
              height,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn('skeleton-shimmer', variants[variant], className)}
      style={{ width, height }}
    />
  );
}

/** Card-shaped skeleton for board view */
export function CardSkeleton() {
  return (
    <div className="bg-surface-2 border border-hairline rounded-lg p-[15px] space-y-[12px]">
      <Skeleton width="80%" height="14px" />
      <Skeleton width="60%" height="12px" />
      <div className="flex items-center gap-[8px] pt-[4px]">
        <Skeleton variant="circular" width="20px" height="20px" />
        <Skeleton width="40px" height="12px" />
      </div>
    </div>
  );
}

/** Column skeleton for board view */
export function ColumnSkeleton() {
  return (
    <div className="flex-shrink-0 w-[300px] flex flex-col gap-[12px]">
      <div className="flex items-center gap-[8px] px-[8px] py-[12px]">
        <Skeleton variant="circular" width="8px" height="8px" />
        <Skeleton width="100px" height="14px" />
        <Skeleton variant="circular" width="20px" height="20px" className="ml-auto" />
      </div>
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

/** Sidebar skeleton */
export function SidebarSkeleton() {
  return (
    <div className="p-[12px] space-y-[20px]">
      <div className="flex items-center gap-[10px] px-[8px]">
        <Skeleton variant="rectangular" width="32px" height="32px" />
        <Skeleton width="120px" height="14px" />
      </div>
      <div className="space-y-[4px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-[10px] px-[8px] py-[8px]">
            <Skeleton variant="rectangular" width="18px" height="18px" />
            <Skeleton width={`${80 + Math.random() * 60}px`} height="13px" />
          </div>
        ))}
      </div>
    </div>
  );
}
