import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, CheckCircle2, AlertTriangle, Loader2, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface InviteData {
  email: string;
  role: string;
  workspaceName: string;
  senderName: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, setWorkspace } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const verifyInvite = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const response = await api.get(`/auth/invite-verify/${token}`);
        setInviteData(response.data.data);
      } catch (err: any) {
        const message = err?.response?.data?.error?.message || 'Failed to verify workspace invitation';
        setErrorMsg(message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      verifyInvite();
    }
  }, [token]);

  const handleAcceptInvite = async () => {
    if (!token || accepting) return;
    setAccepting(true);
    try {
      const response = await api.post('/auth/invite-accept', { token });
      const { workspace } = response.data.data;
      if (workspace) {
        setWorkspace(workspace);
      }
      showSuccess('Welcome!', `Successfully joined "${inviteData?.workspaceName}"`);
      navigate('/');
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || 'Failed to accept invitation';
      showError('Acceptance failed', message);
    } finally {
      setAccepting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showSuccess('Signed out', 'Please sign in or sign up with the invited email address');
    } catch (err: any) {
      showError('Logout failed', 'Something went wrong');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-canvas">
        <div className="text-center space-y-4">
          <h1 className="text-[28px] font-bold text-ink tracking-display animate-pulse">Stride</h1>
          <div className="flex items-center justify-center gap-2 text-ink-subtle">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
            <span className="text-[14px]">Verifying your invitation…</span>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg || !inviteData) {
    return (
      <div className="h-screen flex items-center justify-center bg-canvas px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-[400px] w-full bg-surface-2 border border-hairline rounded-2xl p-8 text-center shadow-xl"
        >
          <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-6 h-6 text-danger" />
          </div>
          <h2 className="text-xl font-semibold text-ink mb-2">Invitation Error</h2>
          <p className="text-sm text-ink-muted leading-relaxed mb-6">
            {errorMsg || 'This invite link is invalid, expired, or has already been accepted.'}
          </p>
          <Button variant="secondary" className="w-full" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  // Determine if logged in user email matches invite email
  const isEmailMatch = isAuthenticated && user && user.email.toLowerCase() === inviteData.email.toLowerCase();

  return (
    <div className="h-screen flex items-center justify-center bg-canvas px-4 relative overflow-hidden">
      {/* Decorative gradient blur blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-[440px] w-full bg-surface-2 border border-hairline rounded-2xl p-8 shadow-2xl relative z-10"
      >
        <div className="text-center mb-6">
          <div className="w-[56px] h-[56px] rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-[22px] font-bold text-ink tracking-tight">Workspace Invitation</h1>
          <p className="text-xs text-ink-muted mt-1">You've been invited to collaborate</p>
        </div>

        <div className="bg-surface-3/50 border border-hairline rounded-xl p-5 mb-6 text-center space-y-3">
          <p className="text-sm text-ink-subtle leading-relaxed">
            <span className="font-semibold text-ink">{inviteData.senderName}</span> has invited you to join the collaborative workspace
          </p>
          <div className="py-2 px-4 bg-white/[0.02] border border-hairline rounded-lg inline-block">
            <span className="text-base font-bold text-ink tracking-wide">{inviteData.workspaceName}</span>
          </div>
          <p className="text-xs text-ink-muted">
            You will join as a <span className="font-medium text-accent capitalize">{inviteData.role}</span>
          </p>
        </div>

        {isAuthenticated ? (
          isEmailMatch ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-success/10 border border-success/20 rounded-lg p-3 text-left">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-success">Signed in with correct email</p>
                  <p className="text-ink-muted mt-0.5">Accepting will connect your account ({user.email}) to this workspace.</p>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleAcceptInvite}
                isLoading={accepting}
              >
                Accept & Join Workspace <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-warning/10 border border-warning/20 rounded-lg p-3 text-left">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-warning">Account mismatch</p>
                  <p className="text-ink-muted mt-1 leading-relaxed">
                    You are signed in as <span className="text-ink font-semibold">{user?.email}</span>.
                    This invitation was sent to <span className="text-ink font-semibold">{inviteData.email}</span>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={handleLogout}>
                  Sign Out
                </Button>
                <Button variant="primary" className="flex-1" onClick={() => navigate('/')}>
                  Go to Portal
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <p className="text-[13px] text-ink-muted text-center leading-relaxed">
              This invitation is for <span className="text-ink font-medium">{inviteData.email}</span>. Please sign in or create an account to accept.
            </p>

            <div className="flex flex-col gap-3">
              <Link to={`/signup?token=${token}`} className="w-full">
                <Button variant="primary" size="lg" className="w-full flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" /> Create Account to Join
                </Button>
              </Link>

              <Link to={`/login?token=${token}`} className="w-full">
                <Button variant="secondary" size="lg" className="w-full flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" /> Sign In to Join
                </Button>
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
