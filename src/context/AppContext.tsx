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
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => void;
  addProject: (project: Omit<Project, 'id' | 'userId' | 'createdAt'>) => Promise<Project>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<void>;
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
            try {
              await supabaseApi.saveProfile(finalUser);
            } catch (err) {
              console.warn('Could not create profile on session restore:', err);
            }
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

        // Profile row is required (projects.user_id FK) — create it if missing
        if (!freshProfile) {
          try {
            await supabaseApi.saveProfile(finalUser);
          } catch (err) {
            console.warn('Could not create profile on auth change:', err);
          }
        }

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

    if (error) {
      if (/invalid login credentials/i.test(error.message)) {
        throw new Error(
          'Invalid email or password. Use Forgot? to reset your password, or sign up if you do not have an account yet.'
        );
      }
      throw error;
    }
    if (!data.user) throw new Error('Authentication failed.');

    const profile = await supabaseApi.getProfile(data.user.id);
    const finalUser = profile || {
      ...profileFromSessionUser(data.user),
      email: data.user.email || email
    };

    setCurrentUser(finalUser);
    localStorage.setItem('voltsolar_user', JSON.stringify(finalUser));

    if (!profile) {
      try {
        await supabaseApi.saveProfile(finalUser);
      } catch (err) {
        console.warn('Could not create profile on login:', err);
      }
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

    // Email confirmation may leave no session — RLS requires an authenticated JWT
    if (!data.session) {
      throw new Error(
        'Account created. Please confirm your email (if required), then log in before saving projects.'
      );
    }

    const newUser: UserProfile = {
      id: data.user.id,
      fullName,
      companyName,
      email: email.toLowerCase().trim(),
      phone,
      createdAt: new Date().toISOString()
    };

    try {
      await supabaseApi.saveProfile(newUser);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown error';
      throw new Error(
        `Account created, but profile sync failed (${detail}). Please log out, log back in, and try again.`
      );
    }

    setCurrentUser(newUser);
    localStorage.setItem('voltsolar_user', JSON.stringify(newUser));
    setProjects([]);
    localStorage.setItem('voltsolar_projects', JSON.stringify([]));
    return true;
  };

  const requestPasswordReset = async (email: string): Promise<void> => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      throw new Error('Enter the email address for your VoltSolar account.');
    }

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo
    });

    if (error) throw error;
  };

  const updatePassword = async (password: string): Promise<void> => {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const requireSessionUserId = async (): Promise<string> => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error('Your session expired. Please log in again to save projects.');
    }
    return session.user.id;
  };

  const ensureCloudProfile = async (userId: string) => {
    const profile: UserProfile = currentUser
      ? { ...currentUser, id: userId }
      : {
          id: userId,
          fullName: 'Solar Installer',
          companyName: 'My Company',
          email: '',
          phone: '',
          createdAt: new Date().toISOString()
        };

    try {
      await supabaseApi.saveProfile(profile);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown error';
      throw new Error(
        `Could not sync your profile to the cloud (${detail}). Project save was blocked. Try logging out and back in.`
      );
    }
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

  const addProject = async (
    projectData: Omit<Project, 'id' | 'userId' | 'createdAt'>
  ): Promise<Project> => {
    const userId = await requireSessionUserId();
    await ensureCloudProfile(userId);

    const newProject: Project = {
      ...projectData,
      id: 'prj-' + Math.random().toString(36).substr(2, 9),
      userId,
      createdAt: new Date().toISOString()
    };

    try {
      await supabaseApi.saveProject(newProject);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown error';
      throw new Error(
        `Could not save this project to the cloud (${detail}). Check your connection and try again.`
      );
    }

    const updated = [newProject, ...projects];
    setProjects(updated);
    localStorage.setItem('voltsolar_projects', JSON.stringify(updated));
    return newProject;
  };

  const updateProject = async (updatedProject: Project): Promise<void> => {
    const userId = await requireSessionUserId();
    await ensureCloudProfile(userId);

    const projectToSave: Project = {
      ...updatedProject,
      userId
    };

    try {
      await supabaseApi.saveProject(projectToSave);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown error';
      throw new Error(
        `Could not update this project in the cloud (${detail}). Check your connection and try again.`
      );
    }

    const updated = projects.map(p => (p.id === projectToSave.id ? projectToSave : p));
    setProjects(updated);
    localStorage.setItem('voltsolar_projects', JSON.stringify(updated));
  };

  const deleteProject = async (id: string): Promise<void> => {
    await requireSessionUserId();
    try {
      await supabaseApi.deleteProject(id);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown error';
      throw new Error(`Could not delete this project from the cloud (${detail}).`);
    }

    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem('voltsolar_projects', JSON.stringify(updated));
    if (activeProjectId === id) {
      setActiveProjectId(null);
    }
  };

  const duplicateProject = async (id: string): Promise<void> => {
    const source = projects.find(p => p.id === id);
    if (!source) return;

    const userId = await requireSessionUserId();
    await ensureCloudProfile(userId);

    const duplicated: Project = {
      ...source,
      id: 'prj-' + Math.random().toString(36).substr(2, 9),
      userId,
      projectName: `${source.projectName} (Copy)`,
      createdAt: new Date().toISOString()
    };

    try {
      await supabaseApi.saveProject(duplicated);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown error';
      throw new Error(`Could not duplicate this project in the cloud (${detail}).`);
    }

    const updated = [duplicated, ...projects];
    setProjects(updated);
    localStorage.setItem('voltsolar_projects', JSON.stringify(updated));
  };

  const updateProfile = (profileUpdate: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...profileUpdate };
    setCurrentUser(updatedUser);
    localStorage.setItem('voltsolar_user', JSON.stringify(updatedUser));
    void supabaseApi.saveProfile(updatedUser).catch(err => {
      console.warn('Profile update sync failed:', err);
    });
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
        requestPasswordReset,
        updatePassword,
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
