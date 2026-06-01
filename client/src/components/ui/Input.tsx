import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helper, leftIcon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-[6px]">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-ink-muted tracking-body"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-ink-subtle">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-[40px] bg-surface-2 border border-hairline rounded-md px-[12px] text-[14px] text-ink placeholder:text-ink-subtle',
              'transition-all duration-150 ease-out',
              'hover:border-white/[0.12]',
              'focus:outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.04]',
              leftIcon && 'pl-[38px]',
              error && 'border-danger/50 focus:border-danger focus:ring-danger/20',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[12px] text-danger">{error}</p>
        )}
        {helper && !error && (
          <p className="text-[12px] text-ink-subtle">{helper}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
