import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { LandingPage } from './features/landing/LandingPage';
import { AboutPage } from './features/about/AboutPage';
import { ContactPage } from './features/contact/ContactPage';
import { PrivacyPage } from './features/legal/PrivacyPage';
import { TermsPage } from './features/legal/TermsPage';
import { AuthPage } from './features/auth/AuthPage';
import { Layout } from './components/Layout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProjectsListPage } from './features/projects/ProjectsListPage';
import { ProjectWizard } from './features/wizard/ProjectWizard';
import { ProfilePage } from './features/profile/ProfilePage';
import { SettingsPage } from './features/settings/SettingsPage';
import { PublicPage } from './components/PublicChrome';
import { Project } from './types';
import { useIdleTimeout } from './hooks/useIdleTimeout';

const IDLE_LOGOUT_MS = 30 * 60 * 1000;

const PAGE_PATH: Record<PublicPage, string> = {
  home: '/',
  about: '/about',
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms'
};

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
        Loading…
      </div>
    );
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

function AuthRoute({ mode }: { mode: 'login' | 'signup' }) {
  const { isAuthenticated, authReady } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/app';

  useEffect(() => {
    if (authReady && isAuthenticated) {
      navigate(from.startsWith('/app') ? from : '/app', { replace: true });
    }
  }, [authReady, isAuthenticated, navigate, from]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
        Loading…
      </div>
    );
  }

  if (isAuthenticated) {
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
