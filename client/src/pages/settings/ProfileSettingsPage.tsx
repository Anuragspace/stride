import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Camera, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';

export default function ProfileSettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showError('File too large', 'Please choose an image under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload: Record<string, string> = { name, email };
      if (avatarPreview) {
        payload.avatarUrl = avatarPreview;
      }
      const { data } = await api.patch('/users/me', payload);
      updateUser(data.data.user);
      setAvatarPreview(null);
      success('Profile updated');
    } catch (err: any) {
      showError('Failed to update profile', err?.response?.data?.error?.message || err?.message || 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch {
      setIsLoggingOut(false);
    }
  };

  const displayAvatar = avatarPreview || user?.avatarUrl || null;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-[500px] mx-auto px-[40px] py-[40px]">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-[30px]"
        >
          <div className="flex items-center gap-[12px] mb-[4px]">
            <User className="w-[22px] h-[22px] text-ink-subtle" />
            <h1 className="text-[24px] font-bold text-ink tracking-display">
              Profile
            </h1>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          {/* Avatar section */}
          <div className="flex items-center gap-[20px] mb-[32px]">
            <div className="relative group">
              <Avatar src={displayAvatar} name={user?.name || 'User'} size="lg" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="w-[16px] h-[16px] text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-ink">{user?.name}</p>
              <p className="text-[13px] text-ink-muted">{user?.email}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[12px] text-accent hover:text-accent/80 font-medium mt-[4px] transition-colors"
              >
                {displayAvatar ? 'Change photo' : 'Upload photo'}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-[20px]">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="pt-[8px]">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
              >
                Save Changes
              </Button>
            </div>
          </form>

          {/* Logout section */}
          <div className="mt-[40px] pt-[24px] border-t border-hairline">
            <h3 className="text-[14px] font-semibold text-ink mb-[12px]">Account</h3>
            <Button
              type="button"
              variant="ghost"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="w-[15px] h-[15px] mr-[8px]" />
              Log out
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
