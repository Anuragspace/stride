import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCanvases } from '@/hooks/useCanvases';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Globe, Lock, Search, Plus, Check } from 'lucide-react';
import api from '@/lib/api';

interface CreateCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const icons = ['📋', '🎯', '🚀', '💡', '🔥', '⚡', '🎨', '📊', '🏗️', '🧪', '📝', '🗂️', '💼', '💻', '📣', '🛡️'];

export function CreateCanvasModal({ isOpen, onClose }: CreateCanvasModalProps) {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📋');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [defaultView, setDefaultView] = useState<'board' | 'table' | 'list'>('board');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  const { createCanvas, isCreatingCanvas } = useCanvases();
  const { members } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const filteredMembers = members?.filter(
    (m) =>
      m.userId !== user?.id &&
      (m.user.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
       m.user.email.toLowerCase().includes(memberSearch.toLowerCase()))
  ) || [];

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      // 1. Create the canvas
      const canvas = await createCanvas({
        name: name.trim(),
        icon: selectedIcon,
        visibility,
        defaultView,
      });

      // 2. Pre-invite members if any were selected
      if (canvas?.id && selectedMemberIds.length > 0) {
        await Promise.all(
          selectedMemberIds.map((userId) =>
            api.post(`/canvases/${canvas.id}/members`, {
              userId,
              role: 'editor',
            })
          )
        );
      }

      success('Canvas created', `"${name.trim()}" is ready`);
      handleClose();
      if (canvas?.id) {
        navigate(`/canvas/${canvas.id}`);
      }
    } catch (err: any) {
      console.error('Failed to create canvas:', err);
      const serverMessage = err?.response?.data?.error?.message;
      error('Failed to create canvas', serverMessage || 'Please try again');
    }
  };

  const handleClose = () => {
    setName('');
    setSelectedIcon('📋');
    setVisibility('public');
    setDefaultView('board');
    setSelectedMemberIds([]);
    setMemberSearch('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Canvas" size="md">
      <form onSubmit={handleSubmit} className="space-y-[20px] max-h-[80vh] overflow-y-auto pr-[4px] scrollbar-thin">
        {/* Name input */}
        <Input
          label="Canvas Name"
          placeholder="e.g., Sprint 24, Product Roadmap"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />

        {/* Icon Picker */}
        <div>
          <label className="text-[13px] font-medium text-ink-muted mb-[8px] block">
            Emoji Icon
          </label>
          <div className="grid grid-cols-8 gap-[6px]">
            {icons.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setSelectedIcon(icon)}
                className={`h-[36px] flex items-center justify-center rounded-lg text-[18px] transition-all duration-150 border ${
                  selectedIcon === icon
                    ? 'border-accent/50 bg-accent/10 shadow-sm'
                    : 'border-hairline hover:border-white/[0.12] hover:bg-white/[0.03]'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Two column settings */}
        <div className="grid grid-cols-2 gap-[16px]">
          {/* Visibility */}
          <div>
            <label className="text-[13px] font-medium text-ink-muted mb-[8px] block">
              Visibility
            </label>
            <div className="space-y-[6px]">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`w-full flex items-start gap-[10px] p-[10px] rounded-lg border text-left transition-all ${
                  visibility === 'public'
                    ? 'border-accent/40 bg-accent/5 text-ink'
                    : 'border-hairline text-ink-muted hover:border-white/[0.12]'
                }`}
              >
                <Globe className="w-[16px] h-[16px] mt-[2px] flex-shrink-0" />
                <div>
                  <div className="text-[12px] font-medium">Public</div>
                  <div className="text-[10px] text-ink-subtle leading-tight mt-[1px]">
                    Everyone in the workspace can view and join
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`w-full flex items-start gap-[10px] p-[10px] rounded-lg border text-left transition-all ${
                  visibility === 'private'
                    ? 'border-accent/40 bg-accent/5 text-ink'
                    : 'border-hairline text-ink-muted hover:border-white/[0.12]'
                }`}
              >
                <Lock className="w-[16px] h-[16px] mt-[2px] flex-shrink-0" />
                <div>
                  <div className="text-[12px] font-medium">Invite-only</div>
                  <div className="text-[10px] text-ink-subtle leading-tight mt-[1px]">
                    Only pre-invited members can access
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Default View */}
          <div>
            <label className="text-[13px] font-medium text-ink-muted mb-[8px] block">
              Default View
            </label>
            <div className="space-y-[6px]">
              {['board', 'table', 'list'].map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setDefaultView(view as any)}
                  className={`w-full flex items-center justify-between p-[12px] py-[10px] rounded-lg border text-[12px] font-medium capitalize transition-all ${
                    defaultView === view
                      ? 'border-accent/40 bg-accent/5 text-ink'
                      : 'border-hairline text-ink-muted hover:border-white/[0.12]'
                  }`}
                >
                  <span>{view} View</span>
                  {defaultView === view && <span className="w-[6px] h-[6px] rounded-full bg-accent" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Member Invites */}
        <div>
          <label className="text-[13px] font-medium text-ink-muted mb-[8px] block">
            Invite Teammates
          </label>
          <div className="relative mb-[8px]">
            <Search className="absolute left-[10px] top-[10px] w-[14px] h-[14px] text-ink-subtle" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full pl-[30px] pr-[12px] py-[8px] text-[12px] bg-surface-3 rounded-lg border border-hairline text-ink placeholder:text-ink-subtle focus:outline-none focus:border-white/[0.16]"
            />
          </div>

          {/* Members List */}
          <div className="max-h-[140px] overflow-y-auto border border-hairline rounded-lg divide-y divide-hairline scrollbar-thin">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((m) => {
                const isSelected = selectedMemberIds.includes(m.userId);
                return (
                  <div
                    key={m.userId}
                    onClick={() => toggleMember(m.userId)}
                    className="flex items-center gap-[10px] px-[12px] py-[8px] hover:bg-white/[0.02] cursor-pointer transition-colors duration-100"
                  >
                    <Avatar src={m.user.avatarUrl} name={m.user.name} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-ink truncate">{m.user.name}</div>
                      <div className="text-[10px] text-ink-subtle truncate">{m.user.email}</div>
                    </div>
                    <div className={`w-[16px] h-[16px] rounded-full flex items-center justify-center border transition-all ${
                      isSelected ? 'bg-accent border-accent text-white' : 'border-hairline'
                    }`}>
                      {isSelected && <Check className="w-[10px] h-[10px]" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-[16px] text-center text-[12px] text-ink-subtle">
                No members found
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-[10px] pt-[8px] border-t border-hairline">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isCreatingCanvas}
            disabled={!name.trim()}
          >
            Create Canvas
          </Button>
        </div>
      </form>
    </Modal>
  );
}
