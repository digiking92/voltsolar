import { createClient } from '@supabase/supabase-js';
import { Project, UserProfile } from '../types';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://cgqiewurebpskemkhlpb.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_xB4xSZvlEWY3pppOoUWkBw_E8Rw5BfN';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Self-healing, defensive Supabase API operations.
 * If tables do not exist or there is a database issue, they return null or empty array and do not crash the application.
 */

export const supabaseApi = {
  /**
   * Fetch User Profile
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.warn('Supabase getProfile warning:', error.message);
        }
        return null;
      }

      return {
        id: data.id,
        fullName: data.full_name,
        companyName: data.company_name,
        email: data.email,
        phone: data.phone,
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.warn('Supabase profiles query failed. Falling back to local state:', err);
      return null;
    }
  },

  /**
   * Fetch User Profile by Email
   */
  async getProfileByEmail(email: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', email.trim())
        .maybeSingle();

      if (error) {
        console.warn('Supabase getProfileByEmail warning:', error.message);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        fullName: data.full_name,
        companyName: data.company_name,
        email: data.email,
        phone: data.phone,
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.warn('Supabase profiles query by email failed:', err);
      return null;
    }
  },

  /**
   * Save or Update User Profile
   */
  async saveProfile(profile: UserProfile): Promise<boolean> {
    try {
      const payload = {
        id: profile.id,
        full_name: profile.fullName,
        company_name: profile.companyName,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatarUrl || '',
        created_at: profile.createdAt,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('Supabase saveProfile warning:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase saveProfile failed:', err);
      return false;
    }
  },

  /**
   * Fetch Projects for a User
   */
  async getProjects(userId: string): Promise<Project[] | null> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase getProjects warning:', error.message);
        return null;
      }

      return data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        projectName: item.project_name,
        clientName: item.client_name,
        phone: item.phone,
        email: item.email,
        location: item.location,
        projectType: item.project_type,
        backupHours: Number(item.backup_hours),
        batteryType: item.battery_type,
        systemVoltage: item.system_voltage,
        inverterType: item.inverter_type,
        panelSize: Number(item.panel_size),
        createdAt: item.created_at,
        appliances: Array.isArray(item.appliances) ? item.appliances : [],
        calculations: item.calculations || undefined,
      }));
    } catch (err) {
      console.warn('Supabase projects query failed. Falling back to local state:', err);
      return null;
    }
  },

  /**
   * Save or Update a Project
   */
  async saveProject(project: Project): Promise<boolean> {
    try {
      const payload = {
        id: project.id,
        user_id: project.userId,
        project_name: project.projectName,
        client_name: project.clientName,
        phone: project.phone,
        email: project.email,
        location: project.location,
        project_type: project.projectType,
        backup_hours: project.backupHours,
        battery_type: project.batteryType,
        system_voltage: project.systemVoltage,
        inverter_type: project.inverterType,
        panel_size: project.panelSize,
        created_at: project.createdAt,
        appliances: project.appliances,
        calculations: project.calculations || null,
      };

      const { error } = await supabase
        .from('projects')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('Supabase saveProject warning:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase saveProject failed:', err);
      return false;
    }
  },

  /**
   * Delete a Project
   */
  async deleteProject(projectId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        console.warn('Supabase deleteProject warning:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase deleteProject failed:', err);
      return false;
    }
  }
};

/**
 * SQL snippet required for creating the database schema on Supabase:
 * 
 * CREATE TABLE IF NOT EXISTS public.profiles (
 *     id TEXT PRIMARY KEY,
 *     full_name TEXT NOT NULL,
 *     company_name TEXT NOT NULL,
 *     email TEXT NOT NULL,
 *     phone TEXT,
 *     avatar_url TEXT,
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 * 
 * CREATE TABLE IF NOT EXISTS public.projects (
 *     id TEXT PRIMARY KEY,
 *     user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 *     project_name TEXT NOT NULL,
 *     client_name TEXT NOT NULL,
 *     phone TEXT,
 *     email TEXT,
 *     location TEXT,
 *     project_type TEXT NOT NULL,
 *     backup_hours NUMERIC NOT NULL,
 *     battery_type TEXT NOT NULL,
 *     system_voltage TEXT NOT NULL,
 *     inverter_type TEXT NOT NULL,
 *     panel_size NUMERIC NOT NULL,
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     appliances JSONB NOT NULL DEFAULT '[]'::jsonb,
 *     calculations JSONB
 * );
 * 
 * -- Enable Row Level Security (RLS) optionally:
 * ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
 * 
 * -- Open access rules (simplified anonymous access or user-specific permissions):
 * CREATE POLICY "Allow public read/write profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
 * CREATE POLICY "Allow public read/write projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
 */
