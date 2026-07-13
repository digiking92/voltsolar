import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Cpu, Sun } from 'lucide-react';
import { PublicChrome, PublicPage } from '../../components/PublicChrome';

interface ContactPageProps {
  isAuthenticated?: boolean;
  onNavigate: (page: PublicPage) => void;
  onGetStarted: () => void;
  onLogin: () => void;
  onEnterApp?: () => void;
  initialIntent?: string;
}

const INTENT_OPTIONS = [
  'Custom software',
  'Website',
  'Web app',
  'Mobile app',
  'Solar for home',
  'Solar for business',
  'Industrial electrical',
  'VoltSolar product',
  'Other'
];

export const ContactPage: React.FC<ContactPageProps> = ({
  isAuthenticated,
  onNavigate,
  onGetStarted,
  onLogin,
  onEnterApp,
  initialIntent = ''
}) => {
  const [intent, setIntent] = useState(initialIntent);
  const [submitted, setSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    company: '',
    email: '',
    phone: '',
    summary: '',
    budget: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !intent || !form.summary.trim()) {
      setSubmitError('Please complete name, email, inquiry type, and project summary.');
      return;
    }

    setIsSending(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          company: form.company.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          intent,
          summary: form.summary.trim(),
          budget: form.budget.trim()
        })
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Could not send your message. Please try again.');
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Could not send your message. Please try again or email frohitedigitals@gmail.com.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <PublicChrome
      activePage="contact"
      isAuthenticated={isAuthenticated}
      onNavigate={onNavigate}
      onGetStarted={onGetStarted}
      onLogin={onLogin}
      onEnterApp={onEnterApp}
    >
      <section className="pt-16 pb-12 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sm font-semibold text-[#156DB7] mb-3">Contact</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#123A63] leading-tight">
            Tell us what you need built.
          </h1>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-3xl">
            Engage us for tailor-made software, websites, web apps, and mobile apps, or bring our expert
            engineers to design a solar system for your company or home.
          </p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <button
            type="button"
            onClick={() => setIntent('Custom software')}
            className={`text-left p-6 rounded-2xl border transition-all ${
              intent.startsWith('Custom') || intent === 'Website' || intent === 'Web app' || intent === 'Mobile app'
                ? 'border-[#156DB7] bg-[#156DB7]/5'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50'
            }`}
          >
            <Cpu className="w-6 h-6 text-[#156DB7] mb-3" />
            <h3 className="font-bold text-slate-900 mb-2">Custom software & digital experiences</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Need a brand website, internal web app, customer portal, or mobile application? Brief our
              product team. We design and build for businesses across industries.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setIntent('Solar for business')}
            className={`text-left p-6 rounded-2xl border transition-all ${
              intent.includes('Solar') || intent === 'Industrial electrical'
                ? 'border-[#69BD45] bg-[#69BD45]/5'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50'
            }`}
          >
            <Sun className="w-6 h-6 text-[#69BD45] mb-3" />
            <h3 className="font-bold text-slate-900 mb-2">Solar & power system design</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Want a properly engineered solar system for your house or company, domestic or industrial?
              Our engineers size, specify, and document systems grounded in real power-systems practice.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setIntent('VoltSolar product')}
            className={`text-left p-6 rounded-2xl border transition-all ${
              intent === 'VoltSolar product'
                ? 'border-[#123A63] bg-[#123A63]/5'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50'
            }`}
          >
            <CheckCircle2 className="w-6 h-6 text-[#123A63] mb-3" />
            <h3 className="font-bold text-slate-900 mb-2">VoltSolar product & enterprise</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Questions about plans, team rollout, equipment catalogs, or enterprise onboarding.
            </p>
          </button>
        </div>
      </section>

      <section className="pb-20 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          {submitted ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900">Message received</h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Thank you. A VoltSolar specialist will review your brief and respond shortly, usually within
                one business day.
              </p>
              <button
                type="button"
                onClick={onGetStarted}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#156DB7]"
              >
                Start Designing Free
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Full name</label>
                  <input
                    required
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#156DB7]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Company or organisation</label>
                  <input
                    value={form.company}
                    onChange={e => setForm({ ...form, company: e.target.value })}
                    placeholder="Optional for residential solar"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#156DB7]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Work email</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#156DB7]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="Include country code"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#156DB7]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">What do you need?</label>
                <select
                  required
                  value={intent}
                  onChange={e => setIntent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#156DB7]/30"
                >
                  <option value="">Select inquiry type</option>
                  {INTENT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Tell us about the project</label>
                <textarea
                  required
                  rows={5}
                  value={form.summary}
                  onChange={e => setForm({ ...form, summary: e.target.value })}
                  placeholder="Scope, timeline, location or users, constraints"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#156DB7]/30 resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Approximate budget</label>
                <input
                  value={form.budget}
                  onChange={e => setForm({ ...form, budget: e.target.value })}
                  placeholder="Optional, helps us route correctly"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#156DB7]/30"
                />
              </div>

              {submitError ? (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                  {submitError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSending}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#156DB7] hover:bg-[#0F5288] disabled:opacity-60 text-white font-semibold rounded-xl shadow-sm transition-all"
              >
                {isSending ? 'Sending…' : 'Send message'}
              </button>

              <p className="text-xs text-slate-500 leading-relaxed">
                No spam. No generic sales scripts. Routed to engineering or product based on your inquiry type.
                Domestic, commercial, and industrial projects welcome.
              </p>
            </form>
          )}

          <div className="mt-10 p-6 rounded-2xl border border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-900 mb-2">Prefer to reach us directly?</h3>
            <p className="text-sm text-slate-600">
              Email:{' '}
              <a
                href="mailto:frohitedigitals@gmail.com"
                className="font-semibold text-[#156DB7] hover:underline"
              >
                frohitedigitals@gmail.com
              </a>
            </p>
            <p className="text-sm text-slate-600 mt-1">Hours: Mon-Fri, 09:00-17:00 (local)</p>
            <p className="text-xs text-slate-500 mt-3">
              For urgent site or commissioning issues, include “URGENT” in the subject line of your email.
            </p>
          </div>

          <p className="mt-8 text-sm text-slate-600 text-center">
            If you’re ready to design with the platform yourself:{' '}
            <button type="button" onClick={onGetStarted} className="font-semibold text-[#156DB7] hover:underline">
              Start Designing Free →
            </button>
          </p>
        </div>
      </section>
    </PublicChrome>
  );
};
