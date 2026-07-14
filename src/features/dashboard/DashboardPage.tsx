import React from 'react';
import { motion } from 'motion/react';
import { Plus, FolderHeart, User, Sliders, TrendingUp, Cpu, Battery, Layers, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Project } from '../../types';

interface DashboardPageProps {
  onNavigateToTab: (tab: string) => void;
  onEditProject: (project: Project) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateToTab, onEditProject }) => {
  const { currentUser, projects, duplicateProject } = useApp();

  // Stats calculation
  const totalProjects = projects.length;
  const totalDesigns = projects.filter(p => p.calculations).length;
  const totalSaved = projects.length; // Local persistence counts all as saved

  // Date formatter
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const recentProjects = projects.slice(0, 3);

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateProject(id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not duplicate this project.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome header banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {currentUser?.fullName.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Build and manage high-quality solar energy designs for your residential clients.
          </p>
        </div>
        <button
          id="dash-create-btn"
          onClick={() => onNavigateToTab('new_project')}
          className="inline-flex items-center space-x-2 bg-[#156DB7] hover:bg-[#0F5288] text-white px-5 py-3 rounded-xl font-semibold text-sm shadow-md shadow-[#156DB7]/10 transition-all duration-150 transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          <span>New Design Project</span>
        </button>
      </div>

      {/* Quick Statistics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-[#156DB7]/10 flex items-center justify-center text-[#156DB7]">
            <FolderHeart className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Projects</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalProjects}</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-[#69BD45]/10 flex items-center justify-center text-[#69BD45]">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Designs Generated</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalDesigns}</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Battery className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saved Projects</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalSaved}</h3>
          </div>
        </div>
      </div>

      {/* Primary Grid: Recent Projects & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects */}
        <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Recent Sizing Projects</h2>
            <button 
              id="dash-view-all-projects"
              onClick={() => onNavigateToTab('projects')} 
              className="text-xs font-semibold text-[#156DB7] hover:text-[#0F5288] inline-flex items-center space-x-1 transition-colors"
            >
              <span>View All Projects</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="text-center py-10 space-y-4">
              <FolderHeart className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-700">No projects started yet</p>
                <p className="text-xs text-slate-400 mt-1">Begin your first solar design calculations using our guided wizard.</p>
              </div>
              <button
                id="dash-empty-create"
                onClick={() => onNavigateToTab('new_project')}
                className="inline-flex items-center space-x-2 text-xs font-semibold text-[#156DB7] hover:text-[#0F5288] transition-colors"
              >
                <span>Launch Wizard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentProjects.map((p) => (
                <div key={p.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 hover:text-[#156DB7] cursor-pointer" onClick={() => onEditProject(p)}>
                      {p.projectName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Client: <span className="font-semibold text-slate-700">{p.clientName}</span> • Location: <span className="font-semibold text-slate-700">{p.location}</span>
                    </p>
                    <p className="text-[10px] font-mono text-slate-400">
                      Created: {formatDate(p.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {p.calculations && (
                      <div className="hidden sm:block text-right mr-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#69BD45]/15 text-[#5AAB3C]">
                          {p.calculations.solarArrayKw} kWp PV Array
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{p.calculations.batteryQuantity}x Batteries</p>
                      </div>
                    )}
                    <button
                      id={`recent-view-${p.id}`}
                      onClick={() => onEditProject(p)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 rounded-lg border border-slate-200 transition-colors"
                    >
                      View / Edit
                    </button>
                    <button
                      id={`recent-dup-${p.id}`}
                      onClick={() => void handleDuplicate(p.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                      title="Duplicate"
                    >
                      <Layers className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 pb-4 border-b border-slate-100">Quick Actions</h2>
            <div className="space-y-3 mt-4">
              <button
                id="qa-new-project"
                onClick={() => onNavigateToTab('new_project')}
                className="w-full flex items-center px-4 py-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl text-left border border-slate-200/60 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#156DB7]/10 flex items-center justify-center text-[#156DB7] mr-3">
                  <Plus className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#156DB7]">New Design</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Launches the sizing wizard.</p>
                </div>
              </button>

              <button
                id="qa-all-projects"
                onClick={() => onNavigateToTab('projects')}
                className="w-full flex items-center px-4 py-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl text-left border border-slate-200/60 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#69BD45]/10 flex items-center justify-center text-[#69BD45] mr-3">
                  <FolderHeart className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#69BD45]">My Projects</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Explore your completed layouts.</p>
                </div>
              </button>

              <button
                id="qa-profile"
                onClick={() => onNavigateToTab('profile')}
                className="w-full flex items-center px-4 py-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl text-left border border-slate-200/60 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 mr-3">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-amber-600">Installer Profile</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Update names and companies.</p>
                </div>
              </button>

              <button
                id="qa-settings"
                onClick={() => onNavigateToTab('settings')}
                className="w-full flex items-center px-4 py-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl text-left border border-slate-200/60 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 mr-3">
                  <Sliders className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-purple-600">Preferences</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Configure system metrics & tools.</p>
                </div>
              </button>
            </div>
          </div>

          {/* Premium Help Note */}
          <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed">
            <span className="font-bold text-[#123A63] block mb-1">Calculation Standards</span>
            All calculation results generated by the VoltSolar platform conform to residential sizing safety factors and battery Depth of Discharge (DoD) allowances.
          </div>
        </div>
      </div>
    </div>
  );
};
