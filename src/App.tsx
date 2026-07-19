import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { PublicPage } from './components/PublicChrome';
import { Project } from './types';
import { useIdleTimeout } from './hooks/useIdleTimeout';

const LandingPage = lazy(() =>
  import('./features/landing/LandingPage').then(m => ({ default: m.LandingPage }))
);
const AboutPage = lazy(() =>
  import('./features/about/AboutPage').then(m => ({ default: m.AboutPage }))
);
const ContactPage = lazy(() =>
  import('./features/contact/ContactPage').then(m => ({ default: m.ContactPage }))
);
const PrivacyPage = lazy(() =>
  import('./features/legal/PrivacyPage').then(m => ({ default: m.PrivacyPage }))
);
const TermsPage = lazy(() =>
  import('./features/legal/TermsPage').then(m => ({ default: m.TermsPage }))
);
const AuthPage = lazy(() =>
  import('./features/auth/AuthPage').then(m => ({ default: m.AuthPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./features/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage }))
);
const Layout = lazy(() =>
  import('./components/Layout').then(m => ({ default: m.Layout }))
);
const DashboardPage = lazy(() =>
  import('./features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage }))
);
const ProjectsListPage = lazy(() =>
  import('./features/projects/ProjectsListPage').then(m => ({ default: m.ProjectsListPage }))
);
const ProjectWizard = lazy(() =>
  import('./features/wizard/ProjectWizard').then(m => ({ default: m.ProjectWizard }))
);
const ProfilePage = lazy(() =>
  import('./features/profile/ProfilePage').then(m => ({ default: m.ProfilePage }))
);
const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then(m => ({ default: m.SettingsPage }))
);

const IDLE_LOGOUT_MS = 30 * 60 * 1000;

const PAGE_PATH: Record<PublicPage, string> = {
  home: '/',
  about: '/about',
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms'
};

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#123A63] to-[#156DB7] animate-pulse" />
        <p className="text-sm text-slate-500">Loading VoltSolar…</p>
      </div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
}

function HashScroller() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (pathname !== '/' || !hash) return;
    const id = hash.replace('#', '');
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [pathname, hash]);

  return null;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authReady } = useApp();
  const location = useLocation();

  if (!authReady) {
    return <RouteFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

function PublicMarketing({
  children
}: {
  children: (props: {
    isAuthenticated: boolean;
    onNavigate: (page: PublicPage, options?: { intent?: string; hash?: string }) => void;
    onGetStarted: () => void;
    onLogin: () => void;
    onEnterApp: () => void;
  }) => React.ReactNode;
}) {
  const { isAuthenticated } = useApp();
  const navigate = useNavigate();

  const onNavigate = useCallback(
    (page: PublicPage, options?: { intent?: string; hash?: string }) => {
      if (page === 'contact' && options?.intent) {
        navigate(`/contact?intent=${encodeURIComponent(options.intent)}`);
        return;
      }
      if (page === 'home' && options?.hash) {
        navigate(`/#${options.hash}`);
        return;
      }
      navigate(PAGE_PATH[page]);
    },
    [navigate]
  );

  const onGetStarted = useCallback(() => {
    navigate(isAuthenticated ? '/app' : '/signup');
  }, [isAuthenticated, navigate]);

  const onLogin = useCallback(() => {
    navigate(isAuthenticated ? '/app' : '/login');
  }, [isAuthenticated, navigate]);

  const onEnterApp = useCallback(() => {
    navigate('/app');
  }, [navigate]);

  return (
    <>
      {children({
        isAuthenticated,
        onNavigate,
        onGetStarted,
        onLogin,
        onEnterApp
      })}
    </>
  );
}

function ContactRoute() {
  const [params] = useSearchParams();
  const intent = params.get('intent') || '';

  return (
    <PublicMarketing>
      {props => <ContactPage {...props} initialIntent={intent} />}
    </PublicMarketing>
  );
}

function AuthRoute({ mode }: { mode: 'login' | 'signup' | 'forgot' }) {
  const { isAuthenticated, authReady } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/app';

  useEffect(() => {
    if (authReady && isAuthenticated && mode !== 'forgot') {
      navigate(from.startsWith('/app') ? from : '/app', { replace: true });
    }
  }, [authReady, isAuthenticated, navigate, from, mode]);

  if (!authReady) {
    return <RouteFallback />;
  }

  if (isAuthenticated && mode !== 'forgot') {
    return <Navigate to="/app" replace />;
  }

  return (
    <AuthPage
      initialMode={mode}
      onBack={() => navigate('/')}
      onSuccess={() => navigate('/app', { replace: true })}
    />
  );
}

function ResetPasswordRoute() {
  const navigate = useNavigate();

  return (
    <ResetPasswordPage
      onBack={() => navigate('/login')}
      onSuccess={() => navigate('/app', { replace: true })}
    />
  );
}

const TAB_FROM_PATH: Record<string, string> = {
  '/app': 'dashboard',
  '/app/projects': 'projects',
  '/app/new': 'new_project',
  '/app/profile': 'profile',
  '/app/settings': 'settings'
};

function AppShell() {
  const { logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const activeTab = TAB_FROM_PATH[location.pathname];

  useEffect(() => {
    if (!activeTab) {
      navigate('/app', { replace: true });
    }
  }, [activeTab, navigate]);

  if (!activeTab) {
    return null;
  }
  const setActiveTab = (tab: string) => {
    if (tab !== 'new_project') {
      setProjectToEdit(null);
    }
    const path =
      tab === 'dashboard'
        ? '/app'
        : tab === 'projects'
          ? '/app/projects'
          : tab === 'new_project'
            ? '/app/new'
            : tab === 'profile'
              ? '/app/profile'
              : tab === 'settings'
                ? '/app/settings'
                : '/app';
    navigate(path);
  };

  const handleIdleLogout = useCallback(() => {
    setProjectToEdit(null);
    void logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  useIdleTimeout(IDLE_LOGOUT_MS, handleIdleLogout, true);

  const handleEditProject = (project: Project) => {
    setProjectToEdit(project);
    navigate('/app/new');
  };

  const handleCloseWizard = () => {
    setProjectToEdit(null);
    navigate('/app');
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={() => {
        void logout();
        navigate('/');
      }}
      onLogoClick={() => navigate('/')}
    >
      {activeTab === 'dashboard' && (
        <DashboardPage onNavigateToTab={setActiveTab} onEditProject={handleEditProject} />
      )}
      {activeTab === 'new_project' && (
        <ProjectWizard projectToEdit={projectToEdit} onClose={handleCloseWizard} />
      )}
      {activeTab === 'projects' && (
        <ProjectsListPage onEditProject={handleEditProject} onNavigateToTab={setActiveTab} />
      )}
      {activeTab === 'profile' && <ProfilePage />}
      {activeTab === 'settings' && <SettingsPage />}
    </Layout>
  );
}

function MainApp() {
  return (
    <>
      <ScrollToTop />
      <HashScroller />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/"
            element={
              <PublicMarketing>{props => <LandingPage {...props} />}</PublicMarketing>
            }
          />
          <Route
            path="/about"
            element={<PublicMarketing>{props => <AboutPage {...props} />}</PublicMarketing>}
          />
          <Route path="/contact" element={<ContactRoute />} />
          <Route
            path="/privacy"
            element={<PublicMarketing>{props => <PrivacyPage {...props} />}</PublicMarketing>}
          />
          <Route
            path="/terms"
            element={<PublicMarketing>{props => <TermsPage {...props} />}</PublicMarketing>}
          />
          <Route path="/login" element={<AuthRoute mode="login" />} />
          <Route path="/signup" element={<AuthRoute mode="signup" />} />
          <Route path="/forgot-password" element={<AuthRoute mode="forgot" />} />
          <Route path="/reset-password" element={<ResetPasswordRoute />} />
          <Route
            path="/app/*"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
