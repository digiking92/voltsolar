import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, UserProfile } from '../types';
import { supabase, supabaseApi } from '../lib/supabase';

interface AppContextType {
  currentUser: UserProfile | null;
  projects: Project[];
  isAuthenticated: boolean;
  authReady: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (
    fullName: string,
    companyName: string,
    email: string,
    phone: string,
    password?: string
  ) => Promise<boolean>;
  logout: () => void;
  addProject: (project: Omit<Project, 'id' | 'userId' | 'createdAt'>) => Project;
  updateProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function profileFromSessionUser(user: {
  id: string;
  email?: string | null;
  created_at?: string;
  user_metadata?: Record<string, unknown>;
}): UserProfile {
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    fullName: String(meta.full_name || user.email?.split('@')[0] || 'Solar Installer'),
    companyName: String(meta.company_name || 'My Company'),
    email: user.email || '',
    phone: String(meta.phone || ''),
    createdAt: user.created_at || new Date().toISOString()
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const initAndSync = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (session?.user) {
          const freshProfile = await supabaseApi.getProfile(session.user.id);
          const finalUser = freshProfile || profileFromSessionUser(session.user);
          setCurrentUser(finalUser);
          localStorage.setItem('voltsolar_user', JSON.stringify(finalUser));

          if (!freshProfile) {
            await supabaseApi.saveProfile(finalUser);
          }

          const freshProjects = await supabaseApi.getProjects(session.user.id);
          if (freshProjects) {
            setProjects(freshProjects);
            localStorage.setItem('voltsolar_projects', JSON.stringify(freshProjects));
          }
        } else {
          setCurrentUser(null);
          setProjects([]);
          localStorage.removeItem('voltsolar_user');
          localStorage.removeItem('voltsolar_projects');
        }
      } catch (err) {
        console.warn('Supabase session retrieval failed:', err);
        setCurrentUser(null);
        setProjects([]);
      } finally {
        setAuthReady(true);
      }
    };

    void initAndSync();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const freshProfile = await supabaseApi.getProfile(session.user.id);
        const finalUser = freshProfile || profileFromSessionUser(session.user);
        setCurrentUser(finalUser);
        localStorage.setItem('voltsolar_user', JSON.stringify(finalUser));

        const freshProjects = await supabaseApi.getProjects(session.user.id);
        if (freshProjects) {
          setProjects(freshProjects);
          localStorage.setItem('voltsolar_projects', JSON.stringify(freshProjects));
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setProjects([]);
        localStorage.removeItem('voltsolar_user');
        localStorage.removeItem('voltsolar_projects');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    if (!password) {
      throw new Error('Password is required.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) throw error;
    if (!data.user) throw new Error('Authentication failed.');

    const profile = await supabaseApi.getProfile(data.user.id);
    const finalUser = profile || {
      ...profileFromSessionUser(data.user),
      email: data.user.email || email
    };

    setCurrentUser(finalUser);
    localStorage.setItem('voltsolar_user', JSON.stringify(finalUser));

    if (!profile) {
      await supabaseApi.saveProfile(finalUser);
    }

    const freshProjects = await supabaseApi.getProjects(data.user.id);
    if (freshProjects) {
      setProjects(freshProjects);
      localStorage.setItem('voltsolar_projects', JSON.stringify(freshProjects));
    }

    return true;
  };

  const signup = async (
    fullName: string,
    companyName: string,
    email: string,
    phone: string,
    password?: string
  ): Promise<boolean> => {
    if (!password) {
      throw new Error('Password is required.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
          phone
        }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error('Could not create account.');

    const newUser: UserProfile = {
      id: data.user.id,
      fullName,
      companyName,
      email: email.toLowerCase().trim(),
      phone,
      createdAt: new Date().toISOString()
    };

    await supabaseApi.saveProfile(newUser);
    setCurrentUser(newUser);
    localStorage.setItem('voltsolar_user', JSON.stringify(newUser));
    setProjects([]);
    localStorage.setItem('voltsolar_projects', JSON.stringify([]));
    return true;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut failed:', err);
    }
    setCurrentUser(null);
    setProjects([]);
    localStorage.removeItem('voltsolar_user');
    localStorage.removeItem('voltsolar_projects');
  };

  const addProject = (projectData: Omit<Project, 'id' | 'userId' | 'createdAt'>): Project => {
    const newProject: Project = {
      ...projectData,
      id: 'prj-' + Math.random().toString(36).substr(2, 9),
      userId: currentUser?.id || 'guest',
      createdAt: new Date().toISOString()
    };

    const updated = [newProject, ...projects];
    setProjects(updated);
    localStorage.setItem('voltsolar_projects', JSON.stringify(updated));
    void supabaseApi.saveProject(newProject);
    return newProject;
  };

  const updateProject = (updatedProject: Project) => {
    const updated = projects.map(p => (p.id === updatedProject.id ? updatedProject : p));
    setProjects(updated);
    localStorage.setItem('voltsolar_projects', JSON.stringify(updated));
    void supabaseApi.saveProject(updatedProject);
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem('voltsolar_projects', JSON.stringify(updated));
    if (activeProjectId === id) {
      setActiveProjectId(null);
    }
    void supabaseApi.deleteProject(id);
  };

  const duplicateProject = (id: string) => {
    const source = projects.find(p => p.id === id);
    if (!source) return;

    const duplicated: Project = {
      ...source,
      id: 'prj-' + Math.random().toString(36).substr(2, 9),
      projectName: `${source.projectName} (Copy)`,
      createdAt: new Date().toISOString()
    };

    const updated = [duplicated, ...projects];
    setProjects(updated);
    localStorage.setItem('voltsolar_projects', JSON.stringify(updated));
    void supabaseApi.saveProject(duplicated);
  };

  const updateProfile = (profileUpdate: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...profileUpdate };
    setCurrentUser(updatedUser);
    localStorage.setItem('voltsolar_user', JSON.stringify(updatedUser));
    void supabaseApi.saveProfile(updatedUser);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        projects,
        isAuthenticated: !!currentUser,
        authReady,
        login,
        signup,
        logout,
        addProject,
        updateProject,
        deleteProject,
        duplicateProject,
        updateProfile,
        activeProjectId,
        setActiveProjectId
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
