import React from 'react';
import { Sun } from 'lucide-react';
import { SmoothScroll } from './motion/SmoothScroll';

export type PublicPage = 'home' | 'about' | 'contact';

interface PublicChromeProps {
  children: React.ReactNode;
  activePage?: PublicPage;
  isAuthenticated?: boolean;
  onNavigate: (page: PublicPage) => void;
  onGetStarted: () => void;
  onLogin: () => void;
  onEnterApp?: () => void;
  onLogoClick?: () => void;
}

export const PublicChrome: React.FC<PublicChromeProps> = ({
  children,
  activePage = 'home',
  isAuthenticated = false,
  onNavigate,
  onGetStarted,
  onLogin,
  onEnterApp,
  onLogoClick
}) => {
  const linkClass = (page: PublicPage) =>
    `text-sm font-medium transition-colors ${
      activePage === page ? 'text-[#156DB7]' : 'text-slate-600 hover:text-[#156DB7]'
    }`;

  return (
    <SmoothScroll>
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-[#156DB7]/20 selection:text-[#156DB7]">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              onLogoClick?.();
              onNavigate('home');
            }}
            className="flex items-center space-x-3 hover:opacity-90 transition-opacity shrink-0"
            aria-label="VoltSolar homepage"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#123A63] to-[#156DB7] flex items-center justify-center shadow-md">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#123A63]">
              Volt<span className="text-[#156DB7]">Solar</span>
            </span>
          </button>

          <nav className="hidden lg:flex items-center space-x-7">
            {activePage === 'home' ? (
              <>
                <a href="#product" className="text-sm font-medium text-slate-600 hover:text-[#156DB7] transition-colors">
                  Product
                </a>
                <a href="#features" className="text-sm font-medium text-slate-600 hover:text-[#156DB7] transition-colors">
                  Features
                </a>
                <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-[#156DB7] transition-colors">
                  How It Works
                </a>
              </>
            ) : (
              <button type="button" onClick={() => onNavigate('home')} className={linkClass('home')}>
                Product
              </button>
            )}
            <button type="button" onClick={() => onNavigate('about')} className={linkClass('about')}>
              About
            </button>
            <button type="button" onClick={() => onNavigate('contact')} className={linkClass('contact')}>
              Contact
            </button>
          </nav>

          <div className="flex items-center space-x-3 shrink-0">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onEnterApp || onGetStarted}
                className="text-sm font-semibold bg-[#156DB7] hover:bg-[#0F5288] text-white px-4 sm:px-5 py-2.5 rounded-xl shadow-sm transition-all"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onLogin}
                  className="hidden sm:inline text-sm font-semibold text-slate-700 hover:text-[#156DB7] px-3 py-2 transition-colors"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="text-sm font-semibold bg-[#156DB7] hover:bg-[#0F5288] text-white px-4 sm:px-5 py-2.5 rounded-xl shadow-sm transition-all"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {children}

      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#156DB7] flex items-center justify-center">
                <Sun className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Volt<span className="text-[#156DB7]">Solar</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Intelligent solar system design for installers, engineers, EPC contractors, and renewable energy
              professionals.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button type="button" onClick={() => onNavigate('home')} className="hover:text-white transition-colors">
                  VoltSolar Platform
                </button>
              </li>
              <li>
                <a href="#features" onClick={() => onNavigate('home')} className="hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" onClick={() => onNavigate('home')} className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button type="button" onClick={() => onNavigate('about')} className="hover:text-white transition-colors">
                  About
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('contact')} className="hover:text-white transition-colors">
                  Contact
                </button>
              </li>
              <li>
                <span className="text-slate-500">Privacy</span>
              </li>
              <li>
                <span className="text-slate-500">Terms</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-4">Get Started</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button type="button" onClick={onGetStarted} className="hover:text-white transition-colors">
                  Create Free Account
                </button>
              </li>
              <li>
                <button type="button" onClick={onLogin} className="hover:text-white transition-colors">
                  Log in
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('contact')} className="hover:text-white transition-colors">
                  Contact Sales
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-slate-800 mt-12 pt-8 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} VoltSolar. All rights reserved.</p>
        </div>
      </footer>
    </div>
    </SmoothScroll>
  );
};
