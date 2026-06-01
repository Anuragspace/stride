import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50 disabled:pointer-events-none select-none';

    const variants = {
      primary:
        'bg-white text-canvas hover:bg-white/90 active:bg-white/80 rounded-pill shadow-[0_1px_2px_rgba(0,0,0,0.3)]',
      secondary:
        'bg-surface-3 text-ink hover:bg-surface-3/80 active:bg-surface-2 border border-hairline rounded-md',
      ghost:
        'bg-transparent text-ink-muted hover:text-ink hover:bg-white/[0.05] active:bg-white/[0.08] rounded-md',
      danger:
        'bg-danger/10 text-danger hover:bg-danger/20 active:bg-danger/30 border border-danger/20 rounded-md',
    };

    const sizes = {
      sm: 'h-[30px] px-[12px] text-[12px] gap-[6px]',
      md: 'h-[36px] px-[16px] text-[13px] gap-[8px]',
      lg: 'h-[44px] px-[24px] text-[14px] gap-[10px]',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
