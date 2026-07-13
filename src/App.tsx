import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LandingPage } from './features/landing/LandingPage';
import { AuthPage } from './features/auth/AuthPage';
import { Layout } from './components/Layout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProjectsListPage } from './features/projects/ProjectsListPage';
import { ProjectWizard } from './features/wizard/ProjectWizard';
import { ProfilePage } from './features/profile/ProfilePage';
import { SettingsPage } from './features/settings/SettingsPage';
import { Project } from './types';

function MainApp() {
  const { isAuthenticated, logout } = useApp();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'app'>(
    isAuthenticated ? 'app' : 'landing'
  );
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  // On logout, return to landing. Do not force app view on every auth tick —
  // that would block logo navigation to the homepage while logged in.
  React.useEffect(() => {
    if (!isAuthenticated) {
      setCurrentView('landing');
    }
  }, [isAuthenticated]);

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

  const handleEditProject = (project: Project) => {
    setProjectToEdit(project);
    setActiveTab('new_project');
  };

  const handleCloseWizard = () => {
    setProjectToEdit(null);
    setActiveTab('dashboard');
  };

  if (currentView === 'landing') {
    return (
      <LandingPage
        onGetStarted={handleGetStarted}
        onLogin={handleLogin}
        isAuthenticated={isAuthenticated}
        onEnterApp={() => {
          setCurrentView('app');
          setActiveTab('dashboard');
        }}
      />
    );
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
      setActiveTab={(tab) => {
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
          onNavigateToTab={(tab) => {
            if (tab !== 'new_project') {
              setProjectToEdit(null);
            }
            setActiveTab(tab);
          }} 
          onEditProject={handleEditProject} 
        />
      )}

      {activeTab === 'new_project' && (
        <ProjectWizard 
          projectToEdit={projectToEdit} 
          onClose={handleCloseWizard} 
        />
      )}

      {activeTab === 'projects' && (
        <ProjectsListPage 
          onEditProject={handleEditProject} 
          onNavigateToTab={(tab) => {
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
