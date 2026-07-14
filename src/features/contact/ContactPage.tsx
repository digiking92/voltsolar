import React, { useEffect, useState } from 'react';
import { CheckCircle2, Cpu, Mail, ShieldCheck, Sun } from 'lucide-react';
import { PublicChrome, PublicPage, PublicNavigateOptions } from '../../components/PublicChrome';
import { FadeUp } from '../../components/motion/FadeUp';
import { DrawArrow } from '../../components/motion/DrawArrow';
import { MagneticButton } from '../../components/motion/MagneticButton';
import { AccentBar, BlobField } from '../../components/landing/SectionDecor';

interface ContactPageProps {
  isAuthenticated?: boolean;
  onNavigate: (page: PublicPage, options?: PublicNavigateOptions) => void;
  onGetStarted: () => void;
  onLogin: () => void;
  onEnterApp?: () => void;
  initialIntent?: string;
}

const SERVICE_OPTIONS = [
  'Solar System Design',
  'Commercial Solar',
  'Industrial Solar',
  'Custom Software',
  'Web Application',
  'Website',
  'Mobile Application',
  'Automation',
  'Professional plan interest',
  'Enterprise / Sales',
  'Other'
];

const SOLAR_SITES = [
  'Residential homes',
  'Commercial buildings',
  'Factories',
  'Warehouses',
  'Hospitals',
  'Schools',
  'Hotels',
  'Agricultural facilities',
  'Industrial plants'
];

const SOFTWARE_BUILDS = [
  'Business websites',
  'Corporate websites',
  'Custom web applications',
  'Mobile applications',
  'Client portals',
  'Enterprise software',
  'AI-powered solutions',
  'Internal management systems',
  'Workflow automation platforms',
  'Business dashboards',
  'Industry-specific software'
];

const labelClass = 'block text-sm font-semibold text-[#123A63] mb-2';
const inputClass =
  'w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-base font-medium text-[#123A63] placeholder:text-slate-500 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#156DB7]/25 focus:border-[#156DB7] transition-colors';
const selectClass = `${inputClass} appearance-none bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-10`;

export const ContactPage: React.FC<ContactPageProps> = ({
  isAuthenticated,
  onNavigate,
  onGetStarted,
  onLogin,
  onEnterApp,
  initialIntent = ''
}) => {
  const [intent, setIntent] = useState(initialIntent);

  useEffect(() => {
    setIntent(initialIntent);
  }, [initialIntent]);
  const [submitted, setSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    company: '',
    email: '',
    phone: '',
    country: '',
    summary: '',
    budget: '',
    website: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !intent || !form.summary.trim()) {
      setSubmitError('Please complete name, email, service required, and project description.');
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
          website: form.website,
          summary: [
            form.country.trim() ? `Country: ${form.country.trim()}` : '',
            form.summary.trim()
          ]
            .filter(Boolean)
            .join('\n\n'),
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
      {/* Hero */}
      <section className="relative min-h-[52vh] overflow-hidden border-b border-slate-200">
        <img src="/images/solar-farm-water.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#123A63]/88 via-[#156DB7]/80 to-[#0F5288]/92" />
        <div className="pointer-events-none absolute -top-16 right-10 h-64 w-64 rounded-full bg-[#69BD45]/25 blur-3xl animate-aurora-a" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-20">
          <FadeUp className="max-w-3xl mx-auto text-center">
            <p className="inline-flex rounded-full bg-[#69BD45] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#123A63] mb-5">
              Contact
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Let&apos;s Build Something Exceptional Together.
            </h1>
            <p className="mt-6 text-lg text-white leading-relaxed">
              Whether you need a professionally designed solar energy system or custom business software, our
              engineering team is ready to help.
            </p>
            <div className="mt-8 inline-flex items-center gap-2.5 rounded-2xl border border-white/40 bg-[#0d2d4d]/80 px-4 py-3 backdrop-blur-md">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#69BD45] text-[#123A63]">
                <Mail className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="text-left">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-white/80">Direct email</span>
                <a
                  href="mailto:frohitedigitals@gmail.com"
                  className="block text-sm font-bold text-white hover:underline"
                >
                  frohitedigitals@gmail.com
                </a>
              </span>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Service cards */}
      <section className="relative py-16 sm:py-20 bg-slate-50 border-b border-slate-100 overflow-hidden">
        <BlobField variant="mesh" />
        <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <FadeUp>
            <div className="feature-card-shell h-full">
              <div className="feature-card-inner h-full p-6 sm:p-8">
                <div className="feature-card-icon mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#69BD45] text-[#123A63] shadow-sm">
                  <Sun className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-[#123A63] mb-3">Solar Engineering</h2>
                <p className="text-sm text-slate-700 leading-relaxed mb-5">
                  Need a professionally designed solar solution? We design systems for:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                  {SOLAR_SITES.map(item => (
                    <li key={item} className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#156DB7] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Whether your project requires a grid-tied, hybrid, or off-grid system, our engineers can deliver
                  a complete, professionally engineered design tailored to your energy requirements.
                </p>
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.08}>
            <div className="feature-card-shell h-full">
              <div className="feature-card-inner h-full p-6 sm:p-8">
                <div className="feature-card-icon mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#156DB7] text-white shadow-sm">
                  <Cpu className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-[#123A63] mb-3">Custom Software Development</h2>
                <p className="text-sm text-slate-700 leading-relaxed mb-5">
                  Looking to digitize your business or automate your operations? Our software engineering team
                  develops modern digital solutions that improve productivity, streamline operations, and support
                  long-term growth. We build:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SOFTWARE_BUILDS.map(item => (
                    <li key={item} className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#156DB7] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Form */}
      <section className="relative py-16 sm:pb-24 bg-slate-50 overflow-hidden">
        <BlobField variant="soft" className="opacity-50" />
        <div className="relative max-w-3xl mx-auto px-6">
          <FadeUp className="mb-10 text-center sm:text-left">
            <p className="text-sm font-bold uppercase tracking-wider text-[#156DB7] mb-3">Project brief</p>
            <AccentBar className="mb-4 mx-auto sm:mx-0" />
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#123A63]">
              Tell us about your project.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-700 leading-relaxed max-w-2xl">
              Whether it&apos;s powering a facility or building the software that runs your business, we&apos;ll
              help you design a solution that&apos;s engineered for long-term success.
            </p>
            <p className="mt-3 text-sm font-medium text-slate-600">
              Fields marked with <span className="text-[#156DB7] font-bold">*</span> are required.
            </p>
          </FadeUp>

          {submitted ? (
            <FadeUp>
              <div className="rounded-2xl border-2 border-emerald-200 bg-white p-8 sm:p-10 text-center shadow-sm">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-[#123A63]">Message received</h3>
                <p className="mt-3 text-base text-slate-700 leading-relaxed max-w-md mx-auto">
                  Thank you. A VoltSolar specialist will review your brief and respond shortly, usually within one
                  business day.
                </p>
                <MagneticButton
                  onClick={onGetStarted}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#156DB7] text-white text-base font-semibold"
                >
                  Start Designing Free
                  <DrawArrow className="w-4 h-4" stroke="#fff" />
                </MagneticButton>
              </div>
            </FadeUp>
          ) : (
            <FadeUp delay={0.05}>
              <form
                onSubmit={handleSubmit}
                className="relative rounded-2xl border-2 border-slate-200 bg-white p-6 sm:p-9 shadow-[0_12px_40px_-24px_rgba(18,58,99,0.35)]"
                style={{
                  backgroundImage:
                    'linear-gradient(#fff, #fff), linear-gradient(135deg, #c5d8ea, #d7e4f0 45%, #c8e6b8)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                  border: '2px solid transparent'
                }}
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div>
                      <label htmlFor="contact-name" className={labelClass}>
                        Full name <span className="text-[#156DB7]">*</span>
                      </label>
                      <input
                        id="contact-name"
                        required
                        autoComplete="name"
                        value={form.fullName}
                        onChange={e => setForm({ ...form, fullName: e.target.value })}
                        placeholder="Your full name"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-company" className={labelClass}>
                        Company
                      </label>
                      <input
                        id="contact-company"
                        autoComplete="organization"
                        value={form.company}
                        onChange={e => setForm({ ...form, company: e.target.value })}
                        placeholder="Company or organisation"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div>
                      <label htmlFor="contact-email" className={labelClass}>
                        Email <span className="text-[#156DB7]">*</span>
                      </label>
                      <input
                        id="contact-email"
                        required
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="you@company.com"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-phone" className={labelClass}>
                        Phone number
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="Include country code"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div>
                      <label htmlFor="contact-country" className={labelClass}>
                        Country
                      </label>
                      <input
                        id="contact-country"
                        autoComplete="country-name"
                        value={form.country}
                        onChange={e => setForm({ ...form, country: e.target.value })}
                        placeholder="Where is the project?"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-service" className={labelClass}>
                        Service required <span className="text-[#156DB7]">*</span>
                      </label>
                      <select
                        id="contact-service"
                        required
                        value={intent}
                        onChange={e => setIntent(e.target.value)}
                        className={`${selectClass} ${intent ? 'text-[#123A63]' : 'text-slate-500'}`}
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23123A63' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`
                        }}
                      >
                        <option value="">Select service</option>
                        {SERVICE_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-budget" className={labelClass}>
                      Project budget
                    </label>
                    <input
                      id="contact-budget"
                      value={form.budget}
                      onChange={e => setForm({ ...form, budget: e.target.value })}
                      placeholder="Optional - e.g. $5,000 to $20,000"
                      className={inputClass}
                    />
                  </div>

                  <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                    <label htmlFor="contact-website">Website</label>
                    <input
                      id="contact-website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={e => setForm({ ...form, website: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-summary" className={labelClass}>
                      Project description <span className="text-[#156DB7]">*</span>
                    </label>
                    <textarea
                      id="contact-summary"
                      required
                      rows={6}
                      value={form.summary}
                      onChange={e => setForm({ ...form, summary: e.target.value })}
                      placeholder="Share scope, timeline, location, and any constraints."
                      className={`${inputClass} resize-y min-h-[9rem] leading-relaxed`}
                    />
                  </div>

                  {submitError ? (
                    <p
                      role="alert"
                      className="text-sm font-medium text-red-800 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3"
                    >
                      {submitError}
                    </p>
                  ) : null}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
                    <MagneticButton
                      type="submit"
                      disabled={isSending}
                      className="w-full sm:w-auto px-9 py-3.5 bg-[#156DB7] hover:bg-[#0F5288] disabled:opacity-60 text-white text-base font-bold rounded-xl shadow-sm"
                    >
                      {isSending ? 'Sending…' : 'Submit project brief'}
                    </MagneticButton>
                    <p className="text-sm text-slate-600">
                      We typically reply within one business day.
                    </p>
                  </div>
                </div>
              </form>
            </FadeUp>
          )}

          <FadeUp delay={0.1}>
            <div className="mt-10 rounded-2xl border-2 border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123A63] text-white shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#123A63] mb-1.5">Prefer to reach us directly?</h3>
                  <p className="text-base text-slate-700 leading-relaxed">
                    Email:{' '}
                    <a
                      href="mailto:frohitedigitals@gmail.com"
                      className="font-semibold text-[#156DB7] hover:underline"
                    >
                      frohitedigitals@gmail.com
                    </a>
                  </p>
                  <p className="text-base text-slate-700 mt-1.5">Hours: Mon-Fri, 09:00-17:00 (local)</p>
                </div>
              </div>
            </div>
          </FadeUp>

          <p className="mt-8 text-base text-slate-700 text-center">
            Prefer to design systems yourself?{' '}
            <button type="button" onClick={onGetStarted} className="font-semibold text-[#156DB7] hover:underline">
              Start Designing Free →
            </button>
          </p>
        </div>
      </section>
    </PublicChrome>
  );
};
