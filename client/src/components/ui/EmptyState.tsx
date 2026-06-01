import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-[60px] px-[40px] text-center',
        className
      )}
    >
      {icon ? (
        <div className="mb-[20px] text-ink-subtle">{icon}</div>
      ) : (
        <div className="w-[80px] h-[80px] mb-[20px] rounded-2xl bg-surface-2 border border-hairline flex items-center justify-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="6"
              y="8"
              width="28"
              height="24"
              rx="4"
              stroke="#666666"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <path
              d="M16 18L20 22L24 18"
              stroke="#666666"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-ink mb-[6px] tracking-heading">
        {title}
      </h3>
      <p className="text-[13px] text-ink-muted max-w-[280px] leading-relaxed">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="primary" size="sm" className="mt-[20px]">
          {action.label}
        </Button>
      )}
    </div>
  );
}
