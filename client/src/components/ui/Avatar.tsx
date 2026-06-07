import React from 'react';
import { cn, getInitials, stringToColor } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showOnline?: boolean;
  className?: string;
}

export function Avatar({ src, name, size = 'md', showOnline, className }: AvatarProps) {
  const sizes = {
    xs: 'w-[20px] h-[20px] text-[9px]',
    sm: 'w-[24px] h-[24px] text-[10px]',
    md: 'w-[32px] h-[32px] text-[12px]',
    lg: 'w-[40px] h-[40px] text-[14px]',
  };

  const onlineSizes = {
    xs: 'w-[6px] h-[6px] border',
    sm: 'w-[7px] h-[7px] border',
    md: 'w-[8px] h-[8px] border-[1.5px]',
    lg: 'w-[10px] h-[10px] border-2',
  };

  const bgColor = stringToColor(name);

  return (
    <div className={cn('relative inline-flex flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          className={cn(
            'rounded-full object-cover',
            sizes[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold text-white',
            sizes[size]
          )}
          style={{ backgroundColor: bgColor }}
          title={name}
        >
          {getInitials(name)}
        </div>
      )}
      {showOnline && (
        <div
          className={cn(
            'absolute -bottom-[1px] -right-[1px] rounded-full bg-success border-canvas',
            onlineSizes[size]
          )}
        />
      )}
    </div>
  );
}
