import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Users, Building2, UserPlus, Trash2, Mail, Copy, Check, Shield, Clock, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function WorkspaceSettingsPage() {
  const { workspace, user } = useAuth();
  const { members, invites, isLoadingMembers, isLoadingInvites } = useWorkspace();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'member'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for showing the generated invite link
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Kick member confirmation modal state
  const [memberToKick, setMemberToKick] = useState<{ id: string; name: string } | null>(null);
  const [isKicking, setIsKicking] = useState(false);

  // Find current user's role in workspace
  const currentUserMember = members?.find((m) => m.userId === user?.id);
  const currentUserRole = currentUserMember?.role;
  const canManage = currentUserRole === 'admin' || currentUserRole === 'manager';
  const isAdmin = currentUserRole === 'admin';

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await api.post(`/workspaces/${workspace?.id}/invites`, {
        email: email.trim(),
        role,
      });

      const inviteToken = response.data?.data?.invite?.token;
      if (inviteToken) {
        const clientUrl = window.location.origin;
        setGeneratedLink(`${clientUrl}/invite/${inviteToken}`);
      }

      success('Invitation created', `Email invitation was sent to ${email.trim()}`);
      setEmail('');
      setRole('member');
      
      // Invalidate invites query
      queryClient.invalidateQueries({
        queryKey: ['workspace-invites', workspace?.id],
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to send invitation';
      showError('Error', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'manager' | 'member') => {
    try {
      await api.patch(`/workspaces/${workspace?.id}/members/${memberId}`, {
        role: newRole,
      });
      success('Role updated', 'Member role was updated successfully');
      queryClient.invalidateQueries({
        queryKey: ['workspace-members', workspace?.id],
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to update role';
      showError('Error', errMsg);
    }
  };

  const handleKickMember = async () => {
    if (!memberToKick) return;
    setIsKicking(true);
    try {
      await api.delete(`/workspaces/${workspace?.id}/members/${memberToKick.id}`);
      success('Member expelled', `${memberToKick.name} has been removed from the workspace`);
      setMemberToKick(null);
      queryClient.invalidateQueries({
        queryKey: ['workspace-members', workspace?.id],
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to remove member';
      showError('Error', errMsg);
    } finally {
      setIsKicking(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await api.delete(`/workspaces/${workspace?.id}/invites/${inviteId}`);
      success('Invite revoked', 'Pending invitation has been canceled');
      queryClient.invalidateQueries({
        queryKey: ['workspace-invites', workspace?.id],
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to revoke invite';
      showError('Error', errMsg);
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-[760px] mx-auto px-[40px] py-[40px]">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-[30px]"
        >
          <div className="flex items-center gap-[12px] mb-[4px]">
            <Settings className="w-[22px] h-[22px] text-ink-subtle" />
            <h1 className="text-[24px] font-bold text-ink tracking-display">
              Workspace Settings
            </h1>
          </div>
          <p className="text-[13px] text-ink-muted">Manage your workspace configuration and teammate permissions</p>
        </motion.div>

        {/* Workspace Info */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-surface-2 border border-hairline rounded-xl p-[24px] mb-[24px]"
        >
          <div className="flex items-center gap-[16px]">
            <div className="w-[48px] h-[48px] rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
              <Building2 className="w-[24px] h-[24px] text-accent" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">{workspace?.name}</h2>
              <p className="text-[13px] text-ink-muted">
                {members?.length || 0} active member{(members?.length || 0) !== 1 ? 's' : ''}
                {invites && invites.length > 0 ? ` · ${invites.length} pending invite${invites.length !== 1 ? 's' : ''}` : ''}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Teammates Section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-surface-2 border border-hairline rounded-xl overflow-hidden mb-[24px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-[20px] py-[14px] border-b border-hairline bg-white/[0.01]">
            <div className="flex items-center gap-[8px]">
              <Users className="w-[16px] h-[16px] text-ink-subtle" />
              <h3 className="text-[14px] font-semibold text-ink">Active Members</h3>
            </div>
            {canManage && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsInviteOpen(true)}
                className="flex items-center gap-[6px] h-[28px] text-[11px] px-[10px] rounded-md font-semibold"
              >
                <UserPlus className="w-[12px] h-[12px]" />
                Invite Teammate
              </Button>
            )}
          </div>

          {/* Members List */}
          {isLoadingMembers ? (
            <div className="p-[20px] space-y-[12px]">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-[12px]">
                  <Skeleton variant="circular" width="32px" height="32px" />
                  <Skeleton width="120px" height="14px" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-hairline">
              {members?.map((member) => {
                const isSelf = member.userId === user?.id;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-[12px] px-[20px] py-[12px] hover:bg-white/[0.01] transition-colors"
                  >
                    <Avatar src={member.user.avatarUrl} name={member.user.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-ink truncate">{member.user.name}</span>
                        {isSelf && (
                          <span className="text-[10px] bg-accent/15 text-accent border border-accent/25 px-1.5 py-0.5 rounded font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-ink-subtle truncate">{member.user.email}</p>
                    </div>

                    {/* Role / Controls */}
                    <div className="flex items-center gap-3">
                      {isAdmin && !isSelf ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id!, e.target.value as any)}
                          className="h-[28px] px-2 text-[12px] bg-surface-3 border border-hairline rounded-md text-ink outline-none cursor-pointer focus:border-accent/40"
                        >
                          <option value="member">Member</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <Badge
                          color={member.role === 'manager' ? '#7c3aed' : member.role === 'admin' ? '#0099ff' : '#666666'}
                          variant="subtle"
                          size="sm"
                          className="capitalize font-medium"
                        >
                          {member.role}
                        </Badge>
                      )}

                      {isAdmin && !isSelf && (
                        <button
                          onClick={() => setMemberToKick({ id: member.id!, name: member.user.name })}
                          className="w-7 h-7 rounded-md border border-hairline flex items-center justify-center text-ink-subtle hover:text-danger hover:border-danger/30 hover:bg-danger/5 transition-all"
                          title="Remove Member"
                        >
                          <Trash2 className="w-[14px] h-[14px]" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Pending Invites List */}
        {canManage && (
          <AnimatePresence>
            {(isLoadingInvites || (invites && invites.length > 0)) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="bg-surface-2 border border-hairline rounded-xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center gap-[8px] px-[20px] py-[14px] border-b border-hairline bg-white/[0.01]">
                  <Clock className="w-[16px] h-[16px] text-ink-subtle" />
                  <h3 className="text-[14px] font-semibold text-ink">Pending Invitations ("Waiting to join")</h3>
                </div>

                {/* List */}
                {isLoadingInvites ? (
                  <div className="p-[20px]">
                    <Skeleton width="100%" height="16px" lines={2} />
                  </div>
                ) : (
                  <div className="divide-y divide-hairline">
                    {invites?.map((invite) => {
                      const isExpired = new Date(invite.expiresAt) < new Date();
                      return (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between px-[20px] py-[12px] hover:bg-white/[0.01] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-hairline flex items-center justify-center shrink-0">
                              <Mail className="w-4 h-4 text-ink-subtle" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-ink truncate">{invite.email}</p>
                              <div className="flex items-center gap-1.5 text-[11px] text-ink-subtle mt-0.5">
                                <span className="capitalize">{invite.role}</span>
                                <span>·</span>
                                {isExpired ? (
                                  <span className="text-danger font-medium">Expired</span>
                                ) : (
                                  <span>Expires {new Date(invite.expiresAt).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeInvite(invite.id)}
                            className="text-ink-subtle hover:text-danger hover:bg-danger/5 h-[28px] text-[11px] px-2.5 rounded-md font-semibold border border-hairline hover:border-danger/25"
                          >
                            Revoke
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => {
          setIsInviteOpen(false);
          setEmail('');
          setRole('member');
          setGeneratedLink(null);
          setCopied(false);
        }}
        title="Invite Teammate"
        description={generatedLink ? "Copy the link below and send it to your teammate." : "Send an email invitation for your workspace."}
        size="sm"
      >
        {generatedLink ? (
          <div className="space-y-[20px] py-2">
            <div className="space-y-2">
              <label className="text-[12px] text-ink-subtle font-medium">Shareable Invite Link</label>
              <div className="flex gap-2">
                <div className="flex-1 h-[36px] px-[12px] text-[13px] bg-surface-3 border border-hairline rounded-md text-ink flex items-center overflow-x-auto whitespace-nowrap select-all scrollbar-none font-mono">
                  {generatedLink}
                </div>
                <Button
                  variant={copied ? 'secondary' : 'primary'}
                  onClick={handleCopyLink}
                  className="w-[90px] h-[36px] flex items-center justify-center gap-1.5 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-success" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="p-3 bg-white/[0.02] border border-hairline rounded-lg text-xs text-ink-muted leading-relaxed">
              If Brevo API is configured, the invite email was also sent directly. The link will expire in 7 days.
            </div>
            <div className="flex justify-end pt-4 border-t border-hairline">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsInviteOpen(false);
                  setEmail('');
                  setRole('member');
                  setGeneratedLink(null);
                  setCopied(false);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateInvite} className="space-y-[16px]">
            <Input
              label="Teammate Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. narayan@stride.com"
              required
              autoFocus
            />

            <div className="space-y-[6px]">
              <label className="text-[12px] text-ink-subtle font-medium">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full h-[36px] px-[12px] text-[13px] bg-surface-3 border border-hairline rounded-md text-ink outline-none focus:border-accent/40 transition-colors cursor-pointer"
              >
                <option value="member">Member</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex justify-end gap-[10px] pt-[12px] border-t border-hairline">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => {
                  setIsInviteOpen(false);
                  setEmail('');
                  setRole('member');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isSubmitting}
                disabled={!email.trim()}
              >
                Send Invite
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Kick Member Confirmation Modal */}
      <Modal
        isOpen={memberToKick !== null}
        onClose={() => setMemberToKick(null)}
        title="Expel Member"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 rounded-lg p-3 text-left">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-danger">Warning: High-risk Action</p>
              <p className="text-ink-muted mt-1 leading-relaxed">
                Are you sure you want to remove <span className="font-semibold text-ink">{memberToKick?.name}</span> from the workspace?
                They will lose all access to canvases, cards, and activities immediately.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-hairline">
            <Button variant="secondary" size="sm" onClick={() => setMemberToKick(null)} disabled={isKicking}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" className="bg-danger hover:bg-danger/90 border-none" onClick={handleKickMember} isLoading={isKicking}>
              Confirm Removal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
