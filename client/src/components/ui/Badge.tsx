import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: 'solid' | 'outline' | 'subtle';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export function Badge({
  children,
  color = '#666666',
  variant = 'subtle',
  size = 'sm',
  className,
  dot = false,
}: BadgeProps) {
  const sizes = {
    sm: 'text-[11px] px-[8px] h-[20px]',
    md: 'text-[12px] px-[10px] h-[24px]',
  };

  const variants = {
    solid: {
      backgroundColor: color,
      color: '#ffffff',
    },
    outline: {
      border: `1px solid ${color}40`,
      color: color,
      backgroundColor: `${color}10`,
    },
    subtle: {
      backgroundColor: `${color}15`,
      color: color,
    },
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-[4px] rounded-full font-medium whitespace-nowrap',
        sizes[size],
        className
      )}
      style={variants[variant]}
    >
      {dot && (
        <span
          className="w-[6px] h-[6px] rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {children}
    </span>
  );
}
