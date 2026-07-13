import React, { useState } from 'react';
import { Search, FolderHeart, Plus, Copy, Trash2, Edit, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Project } from '../../types';

interface ProjectsListPageProps {
  onEditProject: (project: Project) => void;
  onNavigateToTab: (tab: string) => void;
}

export const ProjectsListPage: React.FC<ProjectsListPageProps> = ({ onEditProject, onNavigateToTab }) => {
  const { projects, duplicateProject, deleteProject } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProjects = projects.filter(p => {
    const search = searchTerm.toLowerCase();
    return (
      p.projectName.toLowerCase().includes(search) ||
      p.clientName.toLowerCase().includes(search) ||
      p.location.toLowerCase().includes(search)
    );
  });

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the project "${name}"?`)) {
      deleteProject(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Projects Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and access all previously drafted system sizing calculators.</p>
        </div>
        <button
          id="plist-new-btn"
          onClick={() => onNavigateToTab('new_project')}
          className="inline-flex items-center space-x-2 bg-[#156DB7] hover:bg-[#0F5288] text-white px-5 py-3 rounded-xl font-semibold text-sm shadow transition-all duration-150"
        >
          <Plus className="w-5 h-5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Directory Table Area */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        {/* Search Header */}
        <div className="p-5 border-b border-slate-100 flex items-center">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="project-search"
              type="text"
              className="block w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#156DB7] focus:border-transparent text-xs transition-all"
              placeholder="Search by project name, client, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Project Table list */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <FolderHeart className="w-16 h-16 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-700">No projects found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm ? "No projects matched your active search query." : "You have not saved any solar projects yet."}
              </p>
            </div>
            {!searchTerm && (
              <button
                id="plist-create-empty-btn"
                onClick={() => onNavigateToTab('new_project')}
                className="inline-flex items-center space-x-2 text-xs font-semibold text-[#156DB7] hover:text-[#0F5288]"
              >
                <span>Launch New Wizard</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Project Details</th>
                  <th className="px-6 py-4">Client Contact</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Sizing Details</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 hover:text-[#156DB7] cursor-pointer" onClick={() => onEditProject(p)}>
                        {p.projectName}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 capitalize">{p.projectType} layout</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">{p.clientName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{p.email || p.phone}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{p.location}</td>
                    <td className="px-6 py-4 font-medium text-slate-400">{formatDate(p.createdAt)}</td>
                    <td className="px-6 py-4">
                      {p.calculations ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#69BD45]/10 text-[#5AAB3C]">
                            {p.calculations.solarArrayKw} kWp PV
                          </span>
                          <div className="text-[10px] text-slate-400">
                            {p.calculations.batteryCapacityKwh} kWh storage • {p.calculations.inverterSizeKva} kVA Inverter
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">Wizard incomplete</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          id={`plist-edit-${p.id}`}
                          onClick={() => onEditProject(p)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                          title="Open Design Sizer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          id={`plist-dup-${p.id}`}
                          onClick={() => duplicateProject(p.id)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                          title="Duplicate Sizer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          id={`plist-del-${p.id}`}
                          onClick={() => handleDelete(p.id, p.projectName)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
