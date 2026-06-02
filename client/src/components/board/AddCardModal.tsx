import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCards } from '@/hooks/useCards';
import { useToast } from '@/contexts/ToastContext';
import type { CardStatus, CardType } from '@/types';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasId: string;
  defaultStatus?: CardStatus;
}

export function AddCardModal({
  isOpen,
  onClose,
  canvasId,
  defaultStatus = 'not_started',
}: AddCardModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CardType>('task');
  const { createCard, isCreating } = useCards(canvasId);
  const { success, error } = useToast();

  const types: { value: CardType; label: string; icon: string }[] = [
    { value: 'task', label: 'Task', icon: '📋' },
    { value: 'bug', label: 'Bug', icon: '🐛' },
    { value: 'feature', label: 'Feature', icon: '✨' },
    { value: 'design', label: 'Design', icon: '🎨' },
    { value: 'research', label: 'Research', icon: '🔬' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createCard({
        title: title.trim(),
        status: defaultStatus,
        type,
        priority: 1,
      });
      success('Card created', `"${title.trim()}" has been added`);
      setTitle('');
      setType('task');
      onClose();
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message || err?.message || 'Please try again';
      error('Failed to create card', errMsg);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Card" size="sm">
      <form onSubmit={handleSubmit} className="space-y-[16px]">
        <Input
          label="Title"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <div>
          <label className="text-[13px] font-medium text-ink-muted mb-[6px] block">
            Type
          </label>
          <div className="flex gap-[6px] flex-wrap">
            {types.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex items-center gap-[6px] px-[12px] py-[6px] rounded-md text-[12px] font-medium transition-all duration-150 border ${
                  type === t.value
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-hairline text-ink-muted hover:border-white/[0.12] hover:text-ink'
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-[10px] pt-[8px]">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isCreating}
            disabled={!title.trim()}
          >
            Create Card
          </Button>
        </div>
      </form>
    </Modal>
  );
}
