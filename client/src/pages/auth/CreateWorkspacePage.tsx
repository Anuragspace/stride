import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';

export default function CreateWorkspacePage() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setWorkspace } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);

      const { data } = await api.post('/workspaces', { name: name.trim(), slug });
      setWorkspace(data.data.workspace);
      success('Workspace created!', `Welcome to ${name.trim()}`);
      navigate('/');
    } catch (err: any) {
      const serverMessage = err?.response?.data?.error?.message;
      showError('Failed to create workspace', serverMessage || 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-[24px]">
      <div className="text-center mb-[8px]">
        <div className="w-[56px] h-[56px] rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-[16px]">
          <Building2 className="w-[28px] h-[28px] text-accent" />
        </div>
        <h2 className="text-[20px] font-semibold text-ink tracking-heading">
          What's your team called?
        </h2>
        <p className="text-[13px] text-ink-muted mt-[4px]">
          Create a workspace to get started
        </p>
      </div>

      <Input
        label="Workspace Name"
        type="text"
        placeholder="Acme Inc, Design Team, etc."
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        disabled={!name.trim()}
        className="w-full"
        rightIcon={<ArrowRight className="w-[16px] h-[16px]" />}
      >
        Create Workspace
      </Button>
    </form>
  );
}
