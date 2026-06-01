import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Clock, MessageSquare } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useCards } from '@/hooks/useCards';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import { ActivityItem } from '@/components/activity/ActivityItem';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { CardTitle } from './CardTitle';
import { StatusPicker } from './StatusPicker';
import { PriorityPicker } from './PriorityPicker';
import { AssigneePicker } from './AssigneePicker';
import { DueDatePicker } from './DueDatePicker';
import { LabelEditor } from './LabelEditor';
import { DescriptionEditor } from './DescriptionEditor';
import { TypePicker } from './TypePicker';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Card, User } from '@/types';

interface CardDetailPanelProps {
  cardId: string | null;
  canvasId: string;
  onClose: () => void;
  preAssignedMemberId?: string | null;
}

export function CardDetailPanel({ cardId, canvasId, onClose, preAssignedMemberId }: CardDetailPanelProps) {
  const { createCard, isCreating, updateCard, deleteCard, cards } = useCards(canvasId);
  const { members } = useWorkspace();
  const { success, error } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isNew = cardId === 'new';

  // Local draft states for creation mode
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftStatus, setDraftStatus] = useState('not_started');
  const [draftPriority, setDraftPriority] = useState<number>(1);
  const [draftType, setDraftType] = useState('task');
  const [draftAssignees, setDraftAssignees] = useState<User[]>([]);
  const [draftDueDate, setDraftDueDate] = useState<string | null>(null);
  const [draftLabels, setDraftLabels] = useState<any[]>([]);

  // Discussion and comments state
  const [commentInput, setCommentInput] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Fetch card-scoped events in real-time
  const { events: cardEvents } = useEvents({ cardId: cardId || undefined });

  // Reset/Initialize draft states when drawer opens in creation mode
  useEffect(() => {
    if (isNew) {
      setDraftTitle('');
      setDraftDescription('');
      setDraftStatus('not_started');
      setDraftPriority(1);
      setDraftType('task');
      setDraftDueDate(null);
      setDraftLabels([]);

      if (preAssignedMemberId && preAssignedMemberId !== 'unassigned') {
        const member = members?.find((m) => m.userId === preAssignedMemberId);
        if (member) {
          setDraftAssignees([member.user]);
        } else {
          setDraftAssignees([]);
        }
      } else {
        setDraftAssignees([]);
      }
    }
  }, [cardId, preAssignedMemberId, members, isNew]);

  const card = isNew
    ? ({
        id: 'new',
        canvasId,
        title: draftTitle,
        description: draftDescription,
        status: draftStatus,
        priority: draftPriority,
        type: draftType,
        dueDate: draftDueDate,
        due_date: draftDueDate,
        assignees: draftAssignees.map(u => ({ userId: u.id, user: u, cardId: 'new', assignedAt: '' })),
        labels: draftLabels,
        subtasks: [],
        createdAt: '',
        createdBy: '',
        orderIndex: 0,
      } as any)
    : (cards?.find((c) => c.id === cardId) || null);

  // Combine comments and card activity chronologically
  const combinedFeed = useMemo(() => {
    if (isNew || !card) return [];

    const commentsList = (card.comments || []).map((c: any) => ({
      ...c,
      itemType: 'comment',
      createdDate: new Date(c.createdAt || c.created_at || new Date()),
    }));

    return commentsList.sort(
      (a: any, b: any) => b.createdDate.getTime() - a.createdDate.getTime()
    );
  }, [card?.comments, isNew]);

  // Update URL when card opens (only for existing cards)
  useEffect(() => {
    if (cardId && !isNew) {
      window.history.replaceState(null, '', `/canvas/${canvasId}/card/${cardId}`);
    } else {
      window.history.replaceState(null, '', `/canvas/${canvasId}`);
    }
  }, [cardId, canvasId, isNew]);

  const handleUpdate = async (updates: Partial<Card>) => {
    if (!cardId || isNew) return;
    try {
      await updateCard({ id: cardId, ...updates });
      // Invalidate card events to refresh any activity listings immediately
      queryClient.invalidateQueries({ queryKey: ['events', 'card', cardId] });
    } catch {
      error('Failed to update', 'Please try again');
    }
  };

  const handleDelete = async () => {
    if (!cardId || isNew) return;
    try {
      await deleteCard(cardId);
      success('Card deleted');
      setShowDeleteConfirm(false);
      onClose();
    } catch {
      error('Failed to delete card');
    }
  };

  const handleCreateCard = async () => {
    if (!draftTitle.trim()) return;
    try {
      // 1. Create the card
      const created = await createCard({
        title: draftTitle.trim(),
        description: draftDescription.trim(),
        status: draftStatus,
        priority: draftPriority,
        type: draftType,
        dueDate: draftDueDate,
      });

      if (created?.id) {
        // 2. Pre-apply assignees and labels if selected in the draft
        const updates: any = {};
        if (draftAssignees.length > 0) {
          updates.assignees = draftAssignees;
        }
        if (draftLabels.length > 0) {
          updates.labels = draftLabels;
        }
        if (Object.keys(updates).length > 0) {
          await updateCard({ id: created.id, ...updates });
        }
      }
      success('Card created successfully');
      onClose();
    } catch {
      error('Failed to create card');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || isPostingComment || !cardId || isNew) return;
    setIsPostingComment(true);
    try {
      await api.post('/comments', {
        cardId,
        content: commentInput.trim(),
      });
      setCommentInput('');
      success('Comment added');
      // Invalidate cache to refresh list instantly
      queryClient.invalidateQueries({ queryKey: ['cards', canvasId] });
      queryClient.invalidateQueries({ queryKey: ['events', 'card', cardId] });
    } catch {
      error('Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.delete(`/comments/${commentId}`);
      success('Comment deleted');
      queryClient.invalidateQueries({ queryKey: ['cards', canvasId] });
      queryClient.invalidateQueries({ queryKey: ['events', 'card', cardId] });
    } catch {
      error('Failed to delete comment');
    }
  };

  return (
    <>
      <AnimatePresence>
        {cardId && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={onClose}
            />

            {/* Panel */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed right-0 top-0 bottom-0 w-[520px] max-w-full bg-surface-1 border-l border-hairline z-50 flex flex-col shadow-2xl shadow-black/40"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-[24px] py-[16px] border-b border-hairline flex-shrink-0">
                <div className="flex items-center gap-[8px] text-ink-subtle">
                  <Clock className="w-[13px] h-[13px]" />
                  {isNew ? (
                    <span className="text-[12px] font-semibold text-accent uppercase tracking-wider">
                      New Card Draft
                    </span>
                  ) : (
                    card && (
                      <span className="text-[12px]">
                        Updated {formatRelativeTime(card.updated_at || card.updatedAt)}
                      </span>
                    )
                  )}
                </div>
                <div className="flex items-center gap-[4px]">
                  {!isNew && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-ink-subtle hover:text-danger"
                    >
                      <Trash2 className="w-[14px] h-[14px]" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="w-[16px] h-[16px]" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              {card ? (
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                  <div className="px-[24px] py-[20px] space-y-[24px]">
                    {/* Title */}
                    <CardTitle
                      title={isNew ? draftTitle : card.title}
                      onSave={(title) => isNew ? setDraftTitle(title) : handleUpdate({ title })}
                      onChange={isNew ? setDraftTitle : undefined}
                      placeholder="Enter card title…"
                      autoFocus={isNew}
                    />

                    {/* Properties grid */}
                    <div className="grid grid-cols-[100px_1fr] gap-y-[12px] gap-x-[12px] items-center">
                      <span className="text-[12px] text-ink-subtle font-medium">Status</span>
                      <StatusPicker
                        value={isNew ? draftStatus : card.status}
                        onChange={(status) => isNew ? setDraftStatus(status) : handleUpdate({ status })}
                      />

                      <span className="text-[12px] text-ink-subtle font-medium">Priority</span>
                      <PriorityPicker
                        value={isNew ? draftPriority : card.priority}
                        onChange={(priority) => isNew ? setDraftPriority(priority) : handleUpdate({ priority })}
                      />

                      <span className="text-[12px] text-ink-subtle font-medium">Type</span>
                      <TypePicker
                        value={isNew ? draftType : card.type}
                        onChange={(type) => isNew ? setDraftType(type) : handleUpdate({ type })}
                      />

                      <span className="text-[12px] text-ink-subtle font-medium">Assignees</span>
                      <AssigneePicker
                        value={isNew ? draftAssignees : (card.assignees?.map((a: any) => a.user) || [])}
                        canvasId={canvasId}
                        cardId={isNew ? 'new' : card.id}
                        onChange={isNew ? setDraftAssignees : undefined}
                      />

                      <span className="text-[12px] text-ink-subtle font-medium">Due Date</span>
                      <DueDatePicker
                        value={isNew ? draftDueDate : (card.dueDate || null)}
                        onChange={(dueDate) => isNew ? setDraftDueDate(dueDate) : handleUpdate({ dueDate })}
                      />

                      <span className="text-[12px] text-ink-subtle font-medium">Labels</span>
                      <LabelEditor
                        labels={isNew ? draftLabels : (card.labels || [])}
                        canvasId={canvasId}
                        cardId={isNew ? 'new' : card.id}
                        onChange={isNew ? setDraftLabels : undefined}
                      />
                    </div>

                    {/* Divider */}
                    <div className="h-[1px] bg-hairline" />

                    {/* Description */}
                    <div>
                      <h4 className="text-[12px] font-semibold text-ink-subtle uppercase tracking-wider mb-[10px]">
                        Description
                      </h4>
                      <DescriptionEditor
                        content={isNew ? draftDescription : (card.description || '')}
                        onSave={(description) => isNew ? setDraftDescription(description) : handleUpdate({ description })}
                      />
                    </div>

                    {/* Action buttons (only in creation mode) */}
                    {isNew && (
                      <div className="flex justify-end gap-[10px] pt-[20px] border-t border-hairline">
                        <Button variant="secondary" onClick={onClose}>
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          onClick={handleCreateCard}
                          isLoading={isCreating}
                          disabled={!draftTitle.trim()}
                        >
                          Create Card
                        </Button>
                      </div>
                    )}

                    {/* Creator metadata (only for existing cards) */}
                    {!isNew && card.creator && (
                      <div className="flex items-center gap-[10px] pt-[12px] border-t border-hairline">
                        <Avatar src={card.creator.avatarUrl} name={card.creator.name} size="sm" />
                        <div>
                          <p className="text-[12px] text-ink-muted">
                            Created by <span className="text-ink font-medium">{card.creator.name}</span>
                          </p>
                          <p className="text-[11px] text-ink-subtle">
                            {formatRelativeTime(card.created_at || card.createdAt)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Unified Discussion Feed */}
                    {!isNew && (
                      <div className="pt-[24px] border-t border-hairline space-y-[16px]">
                        <div className="flex items-center gap-[6px]">
                          <MessageSquare className="w-[14px] h-[14px] text-ink-subtle" />
                          <h4 className="text-[12px] font-semibold text-ink-subtle uppercase tracking-wider">
                            Discussion
                          </h4>
                        </div>

                        {/* Comment Textbox */}
                        <form onSubmit={handlePostComment} className="flex gap-[10px] items-start">
                          <Avatar src={currentUser?.avatarUrl} name={currentUser?.name || 'Me'} size="sm" className="mt-[2px]" />
                          <div className="flex-1 flex flex-col gap-[8px]">
                            <textarea
                              value={commentInput}
                              onChange={(e) => setCommentInput(e.target.value)}
                              placeholder="Add a comment…"
                              className="w-full min-h-[64px] max-h-[160px] p-[10px] text-[13px] bg-surface-2 border border-hairline rounded-md text-ink placeholder:text-ink-subtle focus:outline-none focus:border-white/[0.16] resize-y scrollbar-thin"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handlePostComment(e);
                                }
                              }}
                            />
                            <div className="flex justify-end">
                              <Button
                                variant="primary"
                                size="sm"
                                type="submit"
                                isLoading={isPostingComment}
                                disabled={!commentInput.trim()}
                                className="h-[28px] text-[11px] px-[12px] rounded-md font-semibold"
                              >
                                Comment
                              </Button>
                            </div>
                          </div>
                        </form>

                        {/* Feed Items */}
                        <div className="space-y-[12px] pt-[8px]">
                          {combinedFeed.map((item: any) => {
                            if (item.itemType === 'comment') {
                              return (
                                <div key={item.id} className="flex items-start gap-[12px] group py-[4px]">
                                  <Avatar src={item.user?.avatarUrl} name={item.user?.name} size="sm" className="mt-[2px]" />
                                  <div className="flex-1 min-w-0 bg-white/[0.01] hover:bg-white/[0.02] border border-hairline/40 rounded-lg p-[10px] transition-colors">
                                    <div className="flex items-center justify-between mb-[4px]">
                                      <span className="text-[12px] font-semibold text-ink">{item.user?.name}</span>
                                      <div className="flex items-center gap-[8px]">
                                        <span className="text-[10px] text-ink-subtle">
                                          {formatRelativeTime(item.createdAt || item.created_at)}
                                        </span>
                                        {item.user?.id === currentUser?.id && (
                                          <button
                                            onClick={() => handleDeleteComment(item.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-subtle hover:text-danger p-[2px]"
                                            title="Delete comment"
                                          >
                                            <Trash2 className="w-[11px] h-[11px]" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-[13px] text-ink-muted leading-relaxed whitespace-pre-wrap select-text">
                                      {item.content}
                                    </p>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div key={item.id} className="pl-[28px] py-[2px] bg-white/[0.005] rounded-md border border-hairline/10">
                                  <ActivityItem event={item} onCardClick={() => {}} />
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 px-[24px] py-[20px] space-y-[20px]">
                  <Skeleton width="70%" height="24px" />
                  <Skeleton lines={3} />
                  <Skeleton width="50%" height="14px" />
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Card"
        description="This action cannot be undone. This will permanently delete this card and all its subtasks."
        confirmLabel="Delete Card"
      />
    </>
  );
}
