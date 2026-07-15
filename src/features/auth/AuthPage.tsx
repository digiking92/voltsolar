import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Sun,
  ArrowLeft,
  Lock,
  Mail,
  User,
  Building,
  Phone,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

type AuthMode = 'login' | 'signup' | 'forgot';

interface AuthPageProps {
  initialMode: AuthMode;
  onBack: () => void;
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode, onBack, onSuccess }) => {
  const { login, signup, requestPasswordReset } = useApp();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccess(null);
    setShowPassword(false);
  }, [initialMode]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setSuccess(null);
    setPassword('');
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (mode === 'forgot') {
        if (!email.trim()) {
          setError('Enter your account email to receive a reset link.');
          return;
        }
        await requestPasswordReset(email);
        setSuccess(
          'If an account exists for that email, a password reset link has been sent. Check your inbox (and spam folder), then open the link to choose a new password.'
        );
        return;
      }

      if (mode === 'login') {
        if (!email || !password) {
          setError('Please fill in all credentials.');
          return;
        }
        await login(email, password);
        onSuccess();
        return;
      }

      if (!email || !fullName || !companyName || !phone || !password) {
        setError('All registration fields are required.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      await signup(fullName, companyName, email, phone, password);
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'An error occurred during authentication. Please check inputs and retry.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const title =
    mode === 'login'
      ? 'Welcome back to VoltSolar'
      : mode === 'signup'
        ? 'Create your VoltSolar Account'
        : 'Reset your password';

  const subtitle =
    mode === 'login'
      ? 'Enter your credentials to access your installation designs.'
      : mode === 'signup'
        ? 'Set up your installer profile to start building projects in minutes.'
        : 'We will email you a secure link to choose a new password.';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6 lg:px-8 relative selection:bg-[#156DB7]/10">
      <div className="absolute top-8 left-8">
        <button
          id="auth-back-btn"
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#123A63] to-[#156DB7] flex items-center justify-center shadow-md shadow-[#156DB7]/10 mb-6">
          <Sun className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-10 px-8 shadow-md border border-slate-200/50 rounded-2xl">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start space-x-3 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start space-x-3 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form id="auth-form" onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <>
                <div>
                  <label
                    htmlFor="full-name"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Full Name
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="full-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#156DB7] focus:border-transparent text-sm transition-all"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="company"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Company Name
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Building className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="company"
                      type="text"
                      required
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#156DB7] focus:border-transparent text-sm transition-all"
                      placeholder="e.g. Solar Pro Systems"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Phone Number
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#156DB7] focus:border-transparent text-sm transition-all"
                      placeholder="e.g. +1 (555) 123-4567"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#156DB7] focus:border-transparent text-sm transition-all"
                  placeholder="e.g. installer@company.com"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                  >
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      id="auth-forgot-btn"
                      onClick={() => switchMode('forgot')}
                      className="text-xs font-semibold text-[#156DB7] hover:text-[#0F5288] transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={mode === 'signup' ? 6 : undefined}
                    className="block w-full pl-10 pr-12 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#156DB7] focus:border-transparent text-sm transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    id="toggle-password-visibility"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <p className="mt-1.5 text-[11px] text-slate-400">At least 6 characters.</p>
                )}
              </div>
            )}

            <button
              id="submit-auth-btn"
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#156DB7] hover:bg-[#0F5288] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#156DB7] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading
                ? mode === 'forgot'
                  ? 'Sending link…'
                  : 'Verifying…'
                : mode === 'login'
                  ? 'Sign In'
                  : mode === 'signup'
                    ? 'Create Free Account'
                    : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            {mode === 'forgot' ? (
              <button
                id="back-to-login-btn"
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs font-semibold text-slate-500 hover:text-[#156DB7] transition-all"
              >
                Back to sign in
              </button>
            ) : (
              <button
                id="switch-auth-mode-btn"
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="text-xs font-semibold text-slate-500 hover:text-[#156DB7] transition-all"
              >
                {mode === 'login'
                  ? "Don't have an installer account? Sign up"
                  : 'Already registered with VoltSolar? Log in'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
