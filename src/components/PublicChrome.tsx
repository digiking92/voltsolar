import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Sun, X } from 'lucide-react';
import { SmoothScroll } from './motion/SmoothScroll';

export type PublicPage = 'home' | 'about' | 'contact' | 'privacy' | 'terms';

export type PublicNavigateOptions = {
  intent?: string;
  hash?: string;
};

interface PublicChromeProps {
  children: React.ReactNode;
  activePage?: PublicPage;
  isAuthenticated?: boolean;
  onNavigate: (page: PublicPage, options?: PublicNavigateOptions) => void;
  onGetStarted: () => void;
  onLogin: () => void;
  onEnterApp?: () => void;
  onLogoClick?: () => void;
}

const sectionLinks = [
  { hash: 'product', label: 'Product' },
  { hash: 'features', label: 'Features' },
  { hash: 'how-it-works', label: 'How It Works' },
  { hash: 'pricing', label: 'Pricing' }
];

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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [activePage]);

  const goHomeSection = (hash: string) => {
    onNavigate('home', { hash });
    setMobileOpen(false);
  };

  return (
    <SmoothScroll>
      <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-[#156DB7]/20 selection:text-[#156DB7]">
        <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <Link
              to="/"
              onClick={() => onLogoClick?.()}
              className="flex items-center space-x-3 hover:opacity-90 transition-opacity shrink-0"
              aria-label="VoltSolar homepage"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#123A63] to-[#156DB7] flex items-center justify-center shadow-md">
                <Sun className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#123A63]">
                Volt<span className="text-[#156DB7]">Solar</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center space-x-7" aria-label="Primary">
              {sectionLinks.map(link =>
                activePage === 'home' ? (
                  <a
                    key={link.hash}
                    href={`#${link.hash}`}
                    className="text-sm font-medium text-slate-600 hover:text-[#156DB7] transition-colors"
                  >
                    {link.label}
                  </a>
                ) : (
                  <button
                    key={link.hash}
                    type="button"
                    onClick={() => goHomeSection(link.hash)}
                    className="text-sm font-medium text-slate-600 hover:text-[#156DB7] transition-colors"
                  >
                    {link.label}
                  </button>
                )
              )}
              <NavLink
                to="/about"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? 'text-[#156DB7]' : 'text-slate-600 hover:text-[#156DB7]'
                  }`
                }
              >
                About
              </NavLink>
              <NavLink
                to="/contact"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? 'text-[#156DB7]' : 'text-slate-600 hover:text-[#156DB7]'
                  }`
                }
              >
                Contact
              </NavLink>
            </nav>

            <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
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
              <button
                type="button"
                className="lg:hidden inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-700"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMobileOpen(o => !o)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileOpen ? (
            <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-1">
              {sectionLinks.map(link => (
                <button
                  key={link.hash}
                  type="button"
                  onClick={() => goHomeSection(link.hash)}
                  className="block w-full text-left rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {link.label}
                </button>
              ))}
              <Link
                to="/about"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                About
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Contact
              </Link>
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onLogin();
                  }}
                  className="sm:hidden block w-full text-left rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Log in
                </button>
              ) : null}
            </div>
          ) : null}
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
                  <button
                    type="button"
                    onClick={() => goHomeSection('features')}
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => goHomeSection('how-it-works')}
                    className="hover:text-white transition-colors"
                  >
                    How It Works
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => goHomeSection('pricing')}
                    className="hover:text-white transition-colors"
                  >
                    Pricing
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/about" className="hover:text-white transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-white transition-colors">
                    Terms
                  </Link>
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
                  <button
                    type="button"
                    onClick={() => onNavigate('contact', { intent: 'Enterprise / Sales' })}
                    className="hover:text-white transition-colors"
                  >
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
