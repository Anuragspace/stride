import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import type { Toast as ToastType } from '@/types';

function ToastItem({ toast }: { toast: ToastType }) {
  const { removeToast } = useToast();

  const icons = {
    success: <CheckCircle2 className="w-[18px] h-[18px] text-success flex-shrink-0" />,
    error: <AlertCircle className="w-[18px] h-[18px] text-danger flex-shrink-0" />,
    info: <Info className="w-[18px] h-[18px] text-accent flex-shrink-0" />,
    warning: <AlertTriangle className="w-[18px] h-[18px] text-warning flex-shrink-0" />,
  };

  const borderColors = {
    success: 'border-success/20',
    error: 'border-danger/20',
    info: 'border-accent/20',
    warning: 'border-warning/20',
  };

  return (
    <motion.div
      layout
      initial={{ x: 100, opacity: 0, scale: 0.95 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 100, opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex items-start gap-[12px] px-[16px] py-[14px] rounded-lg',
        'bg-surface-2/95 backdrop-blur-md border shadow-lg shadow-black/20',
        'min-w-[320px] max-w-[420px]',
        borderColors[toast.type]
      )}
      role="alert"
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-ink">{toast.title}</p>
        {toast.message && (
          <p className="text-[12px] text-ink-muted mt-[2px]">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-[4px] rounded text-ink-subtle hover:text-ink transition-colors duration-150 flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-[16px] right-[16px] z-[100] flex flex-col gap-[8px]">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
