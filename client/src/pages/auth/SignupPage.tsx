import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { User as UserIcon, Mail, Lock, Camera } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { SEO } from '@/components/SEO';
import api from '@/lib/api';
import { compressAvatar } from '@/lib/image';

export default function SignupPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const location = useLocation();
  const state = location.state as { googleCredential?: string; googleProfile?: any } | null;

  // Google Onboarding State
  const [isGoogleSignup, setIsGoogleSignup] = useState(!!state?.googleCredential);
  const [googleCredential, setGoogleCredential] = useState(state?.googleCredential || '');
  const [googleProfile, setGoogleProfile] = useState(state?.googleProfile || {
    email: '',
    name: '',
    avatarUrl: '',
  });

  const { signup, googleLogin, googleRegister, setWorkspace } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      api.get(`/auth/invite-verify/${token}`)
        .then((res) => {
          const inviteEmail = res.data?.data?.email;
          if (inviteEmail) {
            setEmail(inviteEmail);
          }
        })
        .catch((err) => {
          console.error('Failed to verify token for prefilling email:', err);
        });
    }
  }, [token]);
  const gsiInitialized = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGoogleSignInCallback = async (response: any) => {
    const credential = response.credential;
    setIsLoading(true);
    try {
      const result = await googleLogin(credential, token || undefined);
      if (result.isNewUser) {
        setGoogleCredential(credential);
        setGoogleProfile({
          email: result.email || '',
          name: result.name || '',
          avatarUrl: result.avatarUrl || '',
        });
        setIsGoogleSignup(true);
      } else {
        showSuccess('Logged in successfully');
        navigate('/app');
      }
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || 'Google authentication failed';
      showError('Google sign in failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  // Update global callback ref
  useEffect(() => {
    (window as any).gsiCallback = handleGoogleSignInCallback;
  }, [handleGoogleSignInCallback]);

  useEffect(() => {
    if (isGoogleSignup) return;

    const initGoogleGSI = () => {
      const google = (window as any).google;
      const btnEl = document.getElementById('google-signup-btn');
      if (google && google.accounts && btnEl) {
        if (!(window as any).gsiInitialized) {
          (window as any).gsiInitialized = true;
          google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: (res: any) => {
              if (typeof (window as any).gsiCallback === 'function') {
                (window as any).gsiCallback(res);
              }
            },
          });
        }
        google.accounts.id.renderButton(btnEl, {
          theme: 'filled_black',
          size: 'large',
          width: 356,
          text: 'signup_with',
          logo_alignment: 'center',
          shape: 'rectangular',
        });
      }
    };

    const timer = setTimeout(initGoogleGSI, 300);
    return () => {
      clearTimeout(timer);
      const google = (window as any).google;
      if (google && google.accounts) {
        try {
          google.accounts.id.cancel();
        } catch (e) {
          console.error('Error cancelling google login prompt:', e);
        }
      }
    };
  }, [isGoogleSignup]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    showError('Not supported', 'Please set your avatar from the Profile Settings page after signup.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!name) { setErrors((prev) => ({ ...prev, name: 'Name is required' })); return; }
    if (!email) { setErrors((prev) => ({ ...prev, email: 'Email is required' })); return; }
    if (password.length < 8) {
      setErrors((prev) => ({ ...prev, password: 'Password must be at least 8 characters' }));
      return;
    }

    setIsLoading(true);
    try {
      await signup(name, email, password);
      if (token) {
        try {
          const acceptRes = await api.post('/auth/invite-accept', { token });
          const { workspace } = acceptRes.data.data;
          if (workspace) {
            setWorkspace(workspace);
          }
          showSuccess('Welcome!', 'Successfully accepted workspace invitation');
          navigate('/app');
        } catch (err: any) {
          const msg = err?.response?.data?.error?.message || 'Failed to accept invitation';
          showError('Invitation Error', msg);
          navigate('/app');
        }
      } else {
        navigate('/create-workspace');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Signup failed';
      showError('Signup failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleProfile.name.trim()) return;

    setIsLoading(true);
    try {
      await googleRegister(googleCredential, googleProfile.name.trim(), googleProfile.avatarUrl, token || undefined);
      showSuccess('Profile confirmed successfully');
      navigate('/app');
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || 'Google registration failed';
      showError('Profile setup failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isGoogleSignup) {
    return (
      <form onSubmit={handleGoogleRegisterSubmit} className="space-y-[20px]" key="google-confirm">
        <div className="text-center mb-[8px]">
          <h2 className="text-[20px] font-semibold text-ink tracking-heading">Confirm your profile</h2>
          <p className="text-[13px] text-ink-muted mt-[4px]">Review your details before joining Stride</p>
        </div>

        <div className="flex flex-col items-center gap-[12px] py-[16px] border border-hairline bg-white/[0.01] rounded-xl">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {googleProfile.avatarUrl ? (
              <img
                src={googleProfile.avatarUrl}
                alt={googleProfile.name}
                className="w-[80px] h-[80px] rounded-full object-cover border-2 border-accent/40 shadow-md"
              />
            ) : (
              <div className="w-[80px] h-[80px] rounded-full bg-accent/10 border-2 border-accent/40 flex items-center justify-center">
                <UserIcon className="w-[32px] h-[32px] text-accent" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-[16px] h-[16px] text-white mb-[2px]" />
              <span className="text-[9px] text-white font-medium">
                {googleProfile.avatarUrl ? 'Change' : 'Upload'}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div className="text-center">
            <span className="text-[12px] text-ink-subtle font-medium">{googleProfile.email}</span>
          </div>
        </div>

        <Input
          label="Your Name"
          type="text"
          placeholder="Enter your name"
          value={googleProfile.name}
          onChange={(e) => setGoogleProfile(prev => ({ ...prev, name: e.target.value }))}
          leftIcon={<UserIcon className="w-[15px] h-[15px]" />}
          autoFocus
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          disabled={!googleProfile.name.trim()}
          className="w-full"
        >
          Confirm & Continue
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsGoogleSignup(false)}
          className="w-full text-ink-subtle hover:text-ink"
        >
          Cancel
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-[20px]" key="signup-main">
      <SEO title="Sign Up | Stride" />
      <div className="text-center mb-[8px]">
        <h2 className="text-[20px] font-semibold text-ink tracking-heading">Create account</h2>
        <p className="text-[13px] text-ink-muted mt-[4px]">Get started with Stride</p>
      </div>

      <div className="w-full flex justify-center">
        <div className="relative w-full max-w-[356px] h-[40px] group">
          {/* Custom Button styling */}
          <div className="absolute inset-0 flex items-center justify-center gap-[10px] rounded-lg border border-hairline bg-white/[0.03] group-hover:bg-white/[0.08] active:bg-white/[0.05] text-[14px] font-medium text-ink transition-colors pointer-events-none group-focus-within:ring-2 group-focus-within:ring-accent/50 group-focus-within:border-accent">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign up with Google</span>
          </div>
          {/* Invisible real Google Button on top */}
          <div 
            id="google-signup-btn" 
            className="absolute inset-0 opacity-0 cursor-pointer"
            style={{ colorScheme: 'light' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-[10px]">
        <div className="h-[1px] bg-hairline flex-1" />
        <span className="text-[11px] text-ink-subtle uppercase tracking-wider font-semibold">or</span>
        <div className="h-[1px] bg-hairline flex-1" />
      </div>

      <Input
        label="Full Name"
        type="text"
        placeholder="John Doe"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        leftIcon={<UserIcon className="w-[15px] h-[15px]" />}
      />

      <Input
        label="Email"
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        leftIcon={<Mail className="w-[15px] h-[15px]" />}
        disabled={!!token}
      />

      <Input
        label="Password"
        type="password"
        placeholder="Minimum 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        leftIcon={<Lock className="w-[15px] h-[15px]" />}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        Create Account
      </Button>

      <p className="text-center text-[13px] text-ink-muted mt-[8px]">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-accent hover:text-accent/80 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
