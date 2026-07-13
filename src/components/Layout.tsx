import React from 'react';
import { Sun, LayoutDashboard, PlusCircle, FolderHeart, User, Sliders, LogOut, Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onLogoClick?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onLogout, onLogoClick }) => {
  const { currentUser } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigation = [
    { name: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { name: 'New Project', id: 'new_project', icon: PlusCircle },
    { name: 'Projects', id: 'projects', icon: FolderHeart },
    { name: 'Profile', id: 'profile', icon: User },
    { name: 'Settings', id: 'settings', icon: Sliders },
  ];

  const handleLogoClick = () => {
    onLogoClick?.();
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row selection:bg-[#156DB7]/10 selection:text-[#156DB7]">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shrink-0">
        <button
          type="button"
          id="mobile-logo-btn"
          onClick={handleLogoClick}
          className="flex items-center space-x-2 hover:opacity-90 transition-opacity"
          aria-label="Go to homepage"
        >
          <div className="w-8 h-8 rounded-lg bg-[#156DB7] flex items-center justify-center">
            <Sun className="w-4 h-4 text-white" />
          </div>
          <span className="text-md font-bold tracking-tight text-[#123A63]">VoltSolar</span>
        </button>
        <button
          id="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 text-slate-500 hover:text-slate-900 focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="md:hidden fixed inset-0 z-40 bg-slate-900/40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — overlay on mobile, in-flow on desktop */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200
          flex flex-col justify-between transition-transform duration-200 ease-in-out
          md:static md:translate-x-0 md:h-screen md:sticky md:top-0 md:shrink-0
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex-1 flex flex-col pt-6 overflow-y-auto">
          <button
            type="button"
            id="sidebar-logo-btn"
            onClick={handleLogoClick}
            className="px-6 flex items-center space-x-3 mb-8 text-left hover:opacity-90 transition-opacity"
            aria-label="Go to homepage"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#123A63] to-[#156DB7] flex items-center justify-center shadow-md shadow-[#156DB7]/5">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#123A63]">
              Volt<span className="text-[#156DB7]">Solar</span>
            </span>
          </button>

          <nav className="flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  id={`nav-item-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-150
                    ${isActive
                      ? 'bg-slate-100 text-[#156DB7]'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}
                  `}
                >
                  <IconComp className={`mr-3 h-5 w-5 ${isActive ? 'text-[#156DB7]' : 'text-slate-400'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3 px-2 py-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#156DB7] text-white flex items-center justify-center font-bold text-sm tracking-wide shadow-sm uppercase">
              {currentUser?.fullName.substring(0, 2) || 'US'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate leading-none mb-1">
                {currentUser?.fullName}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {currentUser?.companyName || 'Solar Pro'}
              </p>
            </div>
          </div>

          <button
            id="sidebar-logout-btn"
            onClick={() => {
              onLogout();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center px-4 py-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
          >
            <LogOut className="mr-3 h-4 w-4 text-rose-500" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-h-0 overflow-y-auto relative bg-slate-50/50 p-4 md:p-8 md:h-screen">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
