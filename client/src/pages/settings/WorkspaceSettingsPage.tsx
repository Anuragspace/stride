import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Users, Building2, UserPlus } from 'lucide-react';
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
  const { workspace } = useAuth();
  const { members, isLoadingMembers } = useWorkspace();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'member'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post(`/workspaces/${workspace?.id}/members`, {
        email: email.trim(),
        role,
      });
      success('Teammate added successfully');
      setEmail('');
      setRole('member');
      setIsAddOpen(false);
      // Invalidate workspace members query so it updates instantly
      queryClient.invalidateQueries({
        queryKey: ['workspace-members', workspace?.id],
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to add member';
      error('Error', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-[700px] mx-auto px-[40px] py-[40px]">
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
        </motion.div>

        {/* Workspace Info */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-surface-2 border border-hairline rounded-xl p-[24px] mb-[20px]"
        >
          <div className="flex items-center gap-[16px]">
            <div className="w-[48px] h-[48px] rounded-xl bg-accent/10 flex items-center justify-center">
              <Building2 className="w-[24px] h-[24px] text-accent" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">{workspace?.name}</h2>
              <p className="text-[13px] text-ink-muted">
                {members?.length || 0} member{(members?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Members */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-surface-2 border border-hairline rounded-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-[20px] py-[14px] border-b border-hairline">
            <div className="flex items-center gap-[8px]">
              <Users className="w-[16px] h-[16px] text-ink-subtle" />
              <h3 className="text-[14px] font-semibold text-ink">Members</h3>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-[6px] h-[28px] text-[11px] px-[10px] rounded-md font-semibold"
            >
              <UserPlus className="w-[12px] h-[12px]" />
              Add Teammate
            </Button>
          </div>

          {isLoadingMembers ? (
            <div className="p-[20px] space-y-[12px]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-[12px]">
                  <Skeleton variant="circular" width="32px" height="32px" />
                  <Skeleton width="120px" height="14px" />
                </div>
              ))}
            </div>
          ) : (
            <div>
               {members?.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-[12px] px-[20px] py-[12px] border-b border-hairline last:border-none hover:bg-white/[0.02] transition-colors"
                >
                  <Avatar src={member.user.avatarUrl} name={member.user.name} size="md" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-ink">{member.user.name}</p>
                    <p className="text-[12px] text-ink-subtle">{member.user.email}</p>
                  </div>
                  <Badge
                    color={member.role === 'manager' ? '#7c3aed' : member.role === 'admin' ? '#0099ff' : '#666666'}
                    variant="subtle"
                    size="sm"
                  >
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Add Teammate Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEmail('');
          setRole('member');
        }}
        title="Add Teammate"
        description="Directly enroll a user into your workspace. They must have an account on Stride."
        size="sm"
      >
        <form onSubmit={handleAddMember} className="space-y-[16px]">
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
                setIsAddOpen(false);
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
              Add Teammate
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
