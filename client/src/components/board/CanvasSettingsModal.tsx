import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useCanvases, useCanvas } from '@/hooks/useCanvases';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useToast } from '@/contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, Globe, Lock, Search, Trash2, Archive, Check, UserPlus } from 'lucide-react';
import api from '@/lib/api';
import type { ViewMode } from '@/types';

interface CanvasSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasId: string;
}

const icons = ['📋', '🎯', '🚀', '💡', '🔥', '⚡', '🎨', '📊', '🏗️', '🧪', '📝', '🗂️', '💼', '💻', '📣', '🛡️'];

export function CanvasSettingsModal({ isOpen, onClose, canvasId }: CanvasSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'members'>('general');
  const navigate = useNavigate();
  const { success, error } = useToast();

  const { canvas, isLoading: isLoadingCanvas } = useCanvas(canvasId);
  const { updateCanvas, deleteCanvas } = useCanvases();
  const { members: workspaceMembers } = useWorkspace();

  // General settings state
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📋');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [defaultView, setDefaultView] = useState<ViewMode>('board');
  const [isSaving, setIsSaving] = useState(false);

  // Members settings state
  const [canvasMembers, setCanvasMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Sync state with canvas data
  useEffect(() => {
    if (canvas) {
      setName(canvas.name);
      setSelectedIcon(canvas.emoji || '📋');
      setVisibility(canvas.visibility || 'public');
      setDefaultView(canvas.defaultView || 'board');
    }
  }, [canvas]);

  // Fetch canvas members
  const fetchCanvasMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const { data } = await api.get(`/canvases/${canvasId}/members`);
      setCanvasMembers(data.data?.members || []);
    } catch {
      error('Failed to load canvas members', 'Please refresh');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'members') {
      fetchCanvasMembers();
    }
  }, [isOpen, activeTab, canvasId]);

  // General Settings Submit
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await updateCanvas({
        id: canvasId,
        name: name.trim(),
        emoji: selectedIcon,
        visibility,
        defaultView,
      });
      success('Settings updated', 'Canvas settings saved successfully');
      onClose();
    } catch {
      error('Failed to update settings', 'Please try again');
    } finally {
      setIsSaving(false);
    }
  };

  // Add Member
  const handleAddMember = async (userId: string) => {
    try {
      await api.post(`/canvases/${canvasId}/members`, {
        userId,
        role: 'editor',
      });
      success('Teammate added', 'User invited to canvas');
      fetchCanvasMembers();
    } catch {
      error('Failed to add teammate', 'Please try again');
    }
  };

  // Remove Member
  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.delete(`/canvases/${canvasId}/members/${memberId}`);
      success('Teammate removed', 'User removed from canvas');
      fetchCanvasMembers();
    } catch {
      error('Failed to remove teammate', 'Please try again');
    }
  };

  // Archive
  const handleArchive = async () => {
    if (confirm('Are you sure you want to archive this canvas? All cards and columns will be preserved.')) {
      try {
        await api.post(`/canvases/${canvasId}/archive`);
        success('Canvas archived', 'Preserved in settings');
        onClose();
        navigate('/');
      } catch {
        error('Failed to archive canvas', 'Please try again');
      }
    }
  };

  // Delete
  const handleDelete = async () => {
    if (confirm('WARNING: Are you sure you want to permanently delete this canvas? This action is destructive and cannot be undone.')) {
      try {
        await deleteCanvas(canvasId);
        success('Canvas deleted', 'Permanently deleted');
        onClose();
        navigate('/');
      } catch {
        error('Failed to delete canvas', 'Please try again');
      }
    }
  };

  // Filter roster search candidates
  const rosterCandidates = workspaceMembers?.filter((wMember) => {
    const isAlreadyMember = canvasMembers.some((cMember) => cMember.userId === wMember.userId);
    const matchesSearch =
      wMember.user.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      wMember.user.email.toLowerCase().includes(memberSearch.toLowerCase());
    return !isAlreadyMember && matchesSearch;
  }) || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Canvas Settings" size="md">
      {/* Tabs */}
      <div className="flex gap-[8px] border-b border-hairline mb-[20px]">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-[6px] px-[12px] py-[8px] text-[13px] font-semibold border-b-2 transition-all ${
            activeTab === 'general'
              ? 'border-accent text-accent'
              : 'border-transparent text-ink-subtle hover:text-ink'
          }`}
        >
          <Settings className="w-[14px] h-[14px]" />
          General
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-[6px] px-[12px] py-[8px] text-[13px] font-semibold border-b-2 transition-all ${
            activeTab === 'members'
              ? 'border-accent text-accent'
              : 'border-transparent text-ink-subtle hover:text-ink'
          }`}
        >
          <Users className="w-[14px] h-[14px]" />
          Members
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="space-y-[20px] max-h-[70vh] overflow-y-auto pr-[4px] scrollbar-thin">
          <Input
            label="Canvas Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {/* Icon picker */}
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

          {/* Visibility & Default View */}
          <div className="grid grid-cols-2 gap-[16px]">
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
                  <Globe className="w-[16px] h-[16px] mt-[2px]" />
                  <div>
                    <div className="text-[12px] font-medium">Public</div>
                    <div className="text-[10px] text-ink-subtle leading-tight mt-[1px]">
                      Workspace wide access
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
                  <Lock className="w-[16px] h-[16px] mt-[2px]" />
                  <div>
                    <div className="text-[12px] font-medium">Private</div>
                    <div className="text-[10px] text-ink-subtle leading-tight mt-[1px]">
                      Invite-only canvas
                    </div>
                  </div>
                </button>
              </div>
            </div>

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

          {/* Danger Zone */}
          <div className="border-t border-hairline pt-[20px] mt-[20px] space-y-[12px]">
            <h4 className="text-[13px] font-semibold text-danger">Danger Zone</h4>
            
            <div className="flex items-center justify-between p-[14px] bg-white/[0.02] border border-hairline rounded-lg">
              <div>
                <div className="text-[12px] font-medium text-ink">Archive Canvas</div>
                <div className="text-[10px] text-ink-subtle mt-[1px]">Hide canvas from sidebar, preserves all data</div>
              </div>
              <Button type="button" variant="secondary" onClick={handleArchive}>
                <Archive className="w-[14px] h-[14px] mr-[6px]" />
                Archive
              </Button>
            </div>

            <div className="flex items-center justify-between p-[14px] bg-danger/[0.01] border border-danger/20 rounded-lg">
              <div>
                <div className="text-[12px] font-medium text-danger">Delete Canvas</div>
                <div className="text-[10px] text-ink-subtle mt-[1px]">Hard delete. Irreversible action.</div>
              </div>
              <Button type="button" variant="danger" onClick={handleDelete}>
                <Trash2 className="w-[14px] h-[14px] mr-[6px]" />
                Delete
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-[10px] pt-[12px] border-t border-hairline">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Save Settings
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'members' && (
        <div className="space-y-[20px] max-h-[70vh] overflow-y-auto pr-[4px] scrollbar-thin">
          {/* Add Members section */}
          <div>
            <h4 className="text-[13px] font-semibold text-ink mb-[8px]">Invite to Canvas</h4>
            <div className="relative mb-[8px]">
              <Search className="absolute left-[10px] top-[10px] w-[14px] h-[14px] text-ink-subtle" />
              <input
                type="text"
                placeholder="Search workspace roster…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-[30px] pr-[12px] py-[8px] text-[12px] bg-surface-3 rounded-lg border border-hairline text-ink focus:outline-none focus:border-white/[0.16]"
              />
            </div>

            {/* Candidate list */}
            {memberSearch.trim() !== '' && (
              <div className="border border-hairline rounded-lg divide-y divide-hairline bg-surface-3/50 max-h-[140px] overflow-y-auto scrollbar-thin">
                {rosterCandidates.length > 0 ? (
                  rosterCandidates.map((c) => (
                    <div key={c.userId} className="flex items-center gap-[10px] px-[12px] py-[8px]">
                      <Avatar src={c.user.avatarUrl} name={c.user.name} size="xs" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium text-ink truncate">{c.user.name}</div>
                        <div className="text-[10px] text-ink-subtle truncate">{c.user.email}</div>
                      </div>
                      <button
                        onClick={() => handleAddMember(c.userId)}
                        className="flex items-center gap-[4px] text-[11px] font-medium text-accent hover:text-accent/80 p-[4px] px-[8px] rounded hover:bg-accent/5 transition-colors"
                      >
                        <UserPlus className="w-[12px] h-[12px]" />
                        Add
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-[12px] text-center text-[12px] text-ink-subtle">
                    No candidates found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Current Members list */}
          <div>
            <h4 className="text-[13px] font-semibold text-ink mb-[8px]">Current Members ({canvasMembers.length})</h4>
            <div className="border border-hairline rounded-lg divide-y divide-hairline">
              {isLoadingMembers ? (
                <div className="py-[24px] text-center text-[12px] text-ink-subtle">
                  Loading members list…
                </div>
              ) : canvasMembers.length > 0 ? (
                canvasMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-[10px] px-[12px] py-[8px] hover:bg-white/[0.01]">
                    <Avatar src={member.user.avatarUrl} name={member.user.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-ink truncate">{member.user.name}</div>
                      <div className="text-[10px] text-ink-subtle truncate">{member.user.email}</div>
                    </div>
                    {canvasMembers.length > 1 ? (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-[6px] rounded hover:bg-danger/5 text-ink-subtle hover:text-danger transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-[14px] h-[14px]" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-ink-subtle font-medium">Owner</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-[24px] text-center text-[12px] text-ink-subtle">
                  No members assigned to this canvas
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
