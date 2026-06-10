import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/Skeleton';

// Lazy-loaded pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'));
const CreateWorkspacePage = lazy(() => import('@/pages/auth/CreateWorkspacePage'));
const LandingPage = lazy(() => import('@/pages/public/LandingPage'));
const HomePage = lazy(() => import('@/pages/HomePage'));
const CanvasPage = lazy(() => import('@/pages/canvas/CanvasPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const ActivityPage = lazy(() => import('@/pages/ActivityPage'));
const WorkspaceSettingsPage = lazy(() => import('@/pages/settings/WorkspaceSettingsPage'));
const ProfileSettingsPage = lazy(() => import('@/pages/settings/ProfileSettingsPage'));
const InvitePage = lazy(() => import('@/pages/auth/InvitePage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-[300px] space-y-[16px]">
        <Skeleton width="80%" height="20px" />
        <Skeleton width="60%" height="14px" />
        <Skeleton lines={3} />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, workspace } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-canvas">
        <div className="text-center">
          <h1 className="text-[24px] font-bold text-ink tracking-display mb-[8px]">Stride</h1>
          <div className="flex items-center gap-[8px] text-ink-subtle">
            <div className="w-[16px] h-[16px] border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
            <span className="text-[13px]">Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!workspace && location.pathname !== '/create-workspace') {
    return <Navigate to="/create-workspace" replace />;
  }

  if (workspace && location.pathname === '/create-workspace') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth routes */}
          <Route
            element={
              <PublicRoute>
                <AuthLayout />
              </PublicRoute>
            }
          >
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          {/* Invite landing page */}
          <Route path="/invite/:token" element={<InvitePage />} />

          {/* Create workspace (authenticated but no workspace) */}
          <Route
            path="/create-workspace"
            element={
              <ProtectedRoute>
                <AuthLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CreateWorkspacePage />} />
          </Route>

          {/* Public Landing Page */}
          <Route 
            path="/" 
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            } 
          />

          {/* App routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="canvas/:canvasId" element={<CanvasPage />} />
            <Route path="canvas/:canvasId/card/:cardId" element={<CanvasPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="settings" element={<WorkspaceSettingsPage />} />
            <Route path="settings/profile" element={<ProfileSettingsPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
