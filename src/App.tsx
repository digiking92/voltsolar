import React, { useCallback, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LandingPage } from './features/landing/LandingPage';
import { AboutPage } from './features/about/AboutPage';
import { ContactPage } from './features/contact/ContactPage';
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

type AppView = 'landing' | 'about' | 'contact' | 'auth' | 'app';

const IDLE_LOGOUT_MS = 30 * 60 * 1000;

function MainApp() {
  const { isAuthenticated, logout } = useApp();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentView, setCurrentView] = useState<AppView>(
    isAuthenticated ? 'app' : 'landing'
  );
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [contactIntent, setContactIntent] = useState('');

  React.useEffect(() => {
    if (!isAuthenticated && currentView === 'app') {
      setCurrentView('landing');
    }
  }, [isAuthenticated, currentView]);

  const handleIdleLogout = useCallback(() => {
    setAuthMode('login');
    setCurrentView('auth');
    setProjectToEdit(null);
    setActiveTab('dashboard');
    void logout();
  }, [logout]);

  useIdleTimeout(IDLE_LOGOUT_MS, handleIdleLogout, isAuthenticated && currentView === 'app');

  const handleGetStarted = () => {
    if (isAuthenticated) {
      setCurrentView('app');
      setActiveTab('dashboard');
      return;
    }
    setAuthMode('signup');
    setCurrentView('auth');
  };

  const handleLogin = () => {
    if (isAuthenticated) {
      setCurrentView('app');
      setActiveTab('dashboard');
      return;
    }
    setAuthMode('login');
    setCurrentView('auth');
  };

  const handleSuccessAuth = () => {
    setCurrentView('app');
    setActiveTab('dashboard');
  };

  const handleGoHome = () => {
    setProjectToEdit(null);
    setCurrentView('landing');
  };

  const handlePublicNavigate = (page: PublicPage) => {
    if (page === 'home') setCurrentView('landing');
    else if (page === 'about') setCurrentView('about');
    else if (page === 'contact') {
      setContactIntent('');
      setCurrentView('contact');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditProject = (project: Project) => {
    setProjectToEdit(project);
    setActiveTab('new_project');
  };

  const handleCloseWizard = () => {
    setProjectToEdit(null);
    setActiveTab('dashboard');
  };

  const publicProps = {
    isAuthenticated,
    onNavigate: handlePublicNavigate,
    onGetStarted: handleGetStarted,
    onLogin: handleLogin,
    onEnterApp: () => {
      setCurrentView('app');
      setActiveTab('dashboard');
    }
  };

  if (currentView === 'landing') {
    return <LandingPage {...publicProps} />;
  }

  if (currentView === 'about') {
    return <AboutPage {...publicProps} />;
  }

  if (currentView === 'contact') {
    return <ContactPage {...publicProps} initialIntent={contactIntent} />;
  }

  if (currentView === 'auth') {
    return (
      <AuthPage
        initialMode={authMode}
        onBack={() => setCurrentView('landing')}
        onSuccess={handleSuccessAuth}
      />
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={tab => {
        if (tab !== 'new_project') {
          setProjectToEdit(null);
        }
        setActiveTab(tab);
      }}
      onLogout={logout}
      onLogoClick={handleGoHome}
    >
      {activeTab === 'dashboard' && (
        <DashboardPage
          onNavigateToTab={tab => {
            if (tab !== 'new_project') {
              setProjectToEdit(null);
            }
            setActiveTab(tab);
          }}
          onEditProject={handleEditProject}
        />
      )}

      {activeTab === 'new_project' && (
        <ProjectWizard projectToEdit={projectToEdit} onClose={handleCloseWizard} />
      )}

      {activeTab === 'projects' && (
        <ProjectsListPage
          onEditProject={handleEditProject}
          onNavigateToTab={tab => {
            if (tab !== 'new_project') {
              setProjectToEdit(null);
            }
            setActiveTab(tab);
          }}
        />
      )}

      {activeTab === 'profile' && <ProfilePage />}

      {activeTab === 'settings' && <SettingsPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
