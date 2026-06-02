import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, User as UserIcon, Camera } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Google Onboarding State
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [googleCredential, setGoogleCredential] = useState('');
  const [googleProfile, setGoogleProfile] = useState({
    email: '',
    name: '',
    avatarUrl: '',
  });

  const { login, googleLogin, googleRegister } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const navigate = useNavigate();

  // Ref guard to prevent GSI double-initialization in React StrictMode
  const gsiInitializedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGoogleSignInCallback = async (response: any) => {
    const credential = response.credential;
    setIsLoading(true);
    try {
      const result = await googleLogin(credential);
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
        navigate('/');
      }
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || 'Google authentication failed';
      showError('Google sign in failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initGoogleGSI = () => {
      const google = (window as any).google;
      if (google && google.accounts && !isGoogleSignup && !gsiInitializedRef.current) {
        gsiInitializedRef.current = true;
        google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleSignInCallback,
        });
        google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          { 
            theme: 'filled_black', 
            size: 'large', 
            width: 384, 
            text: 'continue_with',
            logo_alignment: 'center',
            shape: 'rectangular'
          }
        );
      }
    };

    // Delay slightly to ensure script is fully resolved in DOM
    const timer = setTimeout(initGoogleGSI, 500);
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
      gsiInitializedRef.current = false;
    };
  }, [isGoogleSignup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!email) { setErrors((prev) => ({ ...prev, email: 'Email is required' })); return; }
    if (!password) { setErrors((prev) => ({ ...prev, password: 'Password is required' })); return; }

    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || 'Invalid email or password';
      showError('Login failed', message);
      setErrors({ email: ' ', password: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setGoogleProfile((prev) => ({ ...prev, avatarUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleGoogleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleProfile.name.trim()) return;

    setIsLoading(true);
    try {
      await googleRegister(googleCredential, googleProfile.name.trim(), googleProfile.avatarUrl);
      showSuccess('Profile confirmed successfully');
      navigate('/');
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || 'Google registration failed';
      showError('Profile setup failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isGoogleSignup) {
    return (
      <form onSubmit={handleGoogleRegisterSubmit} className="space-y-[20px]">
        <div className="text-center mb-[8px]">
          <h2 className="text-[20px] font-semibold text-ink tracking-heading">Confirm your profile</h2>
          <p className="text-[13px] text-ink-muted mt-[4px]">Review your details before joining Stride</p>
        </div>

        <div className="flex flex-col items-center gap-[12px] py-[16px] border border-hairline bg-white/[0.01] rounded-xl">
          <div
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
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
              <span className="text-[10px] text-white font-medium">
                {googleProfile.avatarUrl ? 'Change Photo' : 'Upload Photo'}
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
    <form onSubmit={handleSubmit} className="space-y-[20px]">
      <div className="text-center mb-[8px]">
        <h2 className="text-[20px] font-semibold text-ink tracking-heading">Welcome back</h2>
        <p className="text-[13px] text-ink-muted mt-[4px]">Sign in to your workspace</p>
      </div>

      <div className="w-full flex justify-center">
        <div id="google-signin-btn" className="w-full flex justify-center max-w-[384px]" />
      </div>

      <div className="flex items-center gap-[10px] my-[16px]">
        <div className="h-[1px] bg-hairline flex-1" />
        <span className="text-[11px] text-ink-subtle uppercase tracking-wider font-semibold">or</span>
        <div className="h-[1px] bg-hairline flex-1" />
      </div>

      <Input
        label="Email"
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        leftIcon={<Mail className="w-[15px] h-[15px]" />}
        autoFocus
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
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
        Sign In
      </Button>

      <p className="text-center text-[13px] text-ink-muted mt-[8px]">
        Don't have an account?{' '}
        <Link
          to="/signup"
          className="text-accent hover:text-accent/80 font-medium transition-colors"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
