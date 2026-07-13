import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, UserProfile } from '../types';
import { supabase, supabaseApi } from '../lib/supabase';

interface AppContextType {
  currentUser: UserProfile | null;
  projects: Project[];
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (fullName: string, companyName: string, email: string, phone: string, password?: string) => Promise<boolean>;
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Initialize from LocalStorage and sync with Supabase
  useEffect(() => {
    const initAndSync = async () => {
      // 1. Check for active Supabase session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const freshProfile = await supabaseApi.getProfile(session.user.id);
          const finalUser: UserProfile = freshProfile || {
            id: session.user.id,
            fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Solar Installer',
            companyName: session.user.user_metadata?.company_name || 'Apex Solar Solutions',
            email: session.user.email || '',
            phone: session.user.user_metadata?.phone || '',
            createdAt: session.user.created_at || new Date().toISOString()
          };
          
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
          return;
        }
      } catch (err) {
        console.warn('Supabase session retrieval failed, falling back to local storage:', err);
      }

      // 2. Fallback to localStorage if offline/no session
      const storedUser = localStorage.getItem('voltsolar_user');
      const storedProjects = localStorage.getItem('voltsolar_projects');

      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      }
    };

    initAndSync();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        const freshProfile = await supabaseApi.getProfile(session.user.id);
        const finalUser: UserProfile = freshProfile || {
          id: session.user.id,
          fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Solar Installer',
          companyName: session.user.user_metadata?.company_name || 'Apex Solar Solutions',
          email: session.user.email || '',
          phone: session.user.user_metadata?.phone || '',
          createdAt: session.user.created_at || new Date().toISOString()
        };
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
    try {
      if (password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) throw error;

        if (data.user) {
          const profile = await supabaseApi.getProfile(data.user.id);
          const finalUser: UserProfile = profile || {
            id: data.user.id,
            fullName: data.user.user_metadata?.full_name || email.split('@')[0],
            companyName: data.user.user_metadata?.company_name || 'Apex Solar Solutions',
            email: data.user.email || email,
            phone: data.user.user_metadata?.phone || '',
            createdAt: data.user.created_at || new Date().toISOString()
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
        }
      }
    } catch (err: any) {
      console.warn('Supabase real login failed. Trying custom offline login fallback:', err);
      
      // Check if we can do an offline matching login for testing purposes
      const storedUser = localStorage.getItem('voltsolar_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.email.toLowerCase() === email.toLowerCase().trim()) {
          setCurrentUser(parsed);
          return true;
        }
      }
      throw new Error(err.message || 'Authentication failed');
    }
    return false;
  };

  const signup = async (fullName: string, companyName: string, email: string, phone: string, password?: string): Promise<boolean> => {
    try {
      if (password) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: fullName,
              company_name: companyName,
              phone: phone,
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          const newUser: UserProfile = {
            id: data.user.id,
            fullName,
            companyName,
            email: email.toLowerCase().trim(),
            phone,
            createdAt: new Date().toISOString()
          };

          // Save profile to database
          await supabaseApi.saveProfile(newUser);

          setCurrentUser(newUser);
          localStorage.setItem('voltsolar_user', JSON.stringify(newUser));
          setProjects([]);
          localStorage.setItem('voltsolar_projects', JSON.stringify([]));
          return true;
        }
      }
    } catch (err: any) {
      console.warn('Supabase real signup failed. Trying local sandbox fallback:', err);

      // Create fallback sandbox local user
      const localId = 'usr-' + Math.random().toString(36).substr(2, 9);
      const mockUser: UserProfile = {
        id: localId,
        fullName,
        companyName,
        email: email.toLowerCase().trim(),
        phone,
        createdAt: new Date().toISOString()
      };

      await supabaseApi.saveProfile(mockUser);

      setCurrentUser(mockUser);
      localStorage.setItem('voltsolar_user', JSON.stringify(mockUser));
      setProjects([]);
      localStorage.setItem('voltsolar_projects', JSON.stringify([]));
      return true;
    }
    return false;
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

    // Write to Supabase asynchronously
    supabaseApi.saveProject(newProject);

    return newProject;
  };

  const updateProject = (updatedProject: Project) => {
    const updated = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    setProjects(updated);
    localStorage.setItem('voltsolar_projects', JSON.stringify(updated));

    // Write to Supabase asynchronously
    supabaseApi.saveProject(updatedProject);
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem('voltsolar_projects', JSON.stringify(updated));
    if (activeProjectId === id) {
      setActiveProjectId(null);
    }

    // Write to Supabase asynchronously
    supabaseApi.deleteProject(id);
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

    // Write to Supabase asynchronously
    supabaseApi.saveProject(duplicated);
  };

  const updateProfile = (profileUpdate: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...profileUpdate };
    setCurrentUser(updatedUser);
    localStorage.setItem('voltsolar_user', JSON.stringify(updatedUser));

    // Write to Supabase asynchronously
    supabaseApi.saveProfile(updatedUser);
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      projects,
      isAuthenticated: !!currentUser,
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
    }}>
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
