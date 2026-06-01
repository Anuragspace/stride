import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showClose={false}>
      <div className="flex flex-col items-center text-center">
        <div className="w-[48px] h-[48px] rounded-full bg-danger/10 flex items-center justify-center mb-[16px]">
          <AlertTriangle className="w-[24px] h-[24px] text-danger" />
        </div>
        <h3 className="text-[16px] font-semibold text-ink mb-[8px]">{title}</h3>
        <p className="text-[13px] text-ink-muted leading-relaxed mb-[24px]">
          {description}
        </p>
        <div className="flex items-center gap-[12px] w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
