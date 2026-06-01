import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import api, { setAccessToken } from '@/lib/api';
import type { User, Workspace } from '@/types';

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setWorkspace: (workspace: Workspace) => void;
  updateUser: (user: User) => void;
  googleLogin: (credential: string) => Promise<{ isNewUser: boolean; email?: string; name?: string; avatarUrl?: string }>;
  googleRegister: (credential: string, name: string, avatarUrl: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    workspace: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Try silent refresh on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await api.post('/auth/refresh');
        const { user, accessToken } = response.data.data;
        setAccessToken(accessToken);

        // Fetch user's workspaces
        let workspace: Workspace | null = null;
        try {
          const wsResponse = await api.get('/workspaces');
          const workspaces = wsResponse.data.data?.workspaces;
          if (workspaces && workspaces.length > 0) {
            workspace = workspaces[0];
          }
        } catch {
          // No workspaces yet
        }

        setState({
          user,
          workspace,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const response = await api.post('/auth/login', { email, password });
    const { user, accessToken } = response.data.data;
    setAccessToken(accessToken);

    // Fetch user's workspaces
    let workspace: Workspace | null = null;
    try {
      const wsResponse = await api.get('/workspaces');
      const workspaces = wsResponse.data.data?.workspaces;
      if (workspaces && workspaces.length > 0) {
        workspace = workspaces[0];
      }
    } catch {
      // No workspaces yet
    }

    setState({
      user,
      workspace,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string): Promise<void> => {
    const response = await api.post('/auth/signup', { name, email, password });
    const { user, accessToken } = response.data.data;
    setAccessToken(accessToken);
    setState({
      user,
      workspace: null,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    setAccessToken(null);
    setState({
      user: null,
      workspace: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const setWorkspace = useCallback((workspace: Workspace) => {
    setState((prev) => ({ ...prev, workspace }));
  }, []);

  const updateUser = useCallback((user: User) => {
    setState((prev) => ({ ...prev, user }));
  }, []);

  const googleLogin = useCallback(async (credential: string) => {
    const response = await api.post('/auth/google', { credential });
    const { isNewUser } = response.data.data;

    if (!isNewUser) {
      const { user, accessToken } = response.data.data;
      setAccessToken(accessToken);

      // Fetch user's workspaces
      let workspace: Workspace | null = null;
      try {
        const wsResponse = await api.get('/workspaces');
        const workspaces = wsResponse.data.data?.workspaces;
        if (workspaces && workspaces.length > 0) {
          workspace = workspaces[0];
        }
      } catch {
        // No workspaces yet
      }

      setState({
        user,
        workspace,
        isAuthenticated: true,
        isLoading: false,
      });
    }

    return response.data.data;
  }, []);

  const googleRegister = useCallback(async (credential: string, name: string, avatarUrl: string): Promise<void> => {
    const response = await api.post('/auth/google/register', { credential, name, avatarUrl });
    const { user, accessToken } = response.data.data;
    setAccessToken(accessToken);

    setState({
      user,
      workspace: null,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signup,
        logout,
        setWorkspace,
        updateUser,
        googleLogin,
        googleRegister,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
