import React from 'react';
import { Building2, CheckCircle2, Cpu, ShieldCheck, Sun, Zap } from 'lucide-react';
import { PublicChrome, PublicPage, PublicNavigateOptions } from '../../components/PublicChrome';
import { FadeUp } from '../../components/motion/FadeUp';
import { DrawArrow } from '../../components/motion/DrawArrow';
import { MagneticButton } from '../../components/motion/MagneticButton';
import { AccentBar, BlobField } from '../../components/landing/SectionDecor';

interface AboutPageProps {
  isAuthenticated?: boolean;
  onNavigate: (page: PublicPage, options?: PublicNavigateOptions) => void;
  onGetStarted: () => void;
  onLogin: () => void;
  onEnterApp?: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  isAuthenticated,
  onNavigate,
  onGetStarted,
  onLogin,
  onEnterApp
}) => {
  const renewable = [
    'Residential solar systems',
    'Commercial solar systems',
    'Industrial solar power plants',
    'Battery energy storage systems',
    'Hybrid energy systems',
    'Grid-tied and off-grid solutions'
  ];

  const electrical = [
    'Industrial electrical system design',
    'Power distribution systems',
    'Electrical control panel design',
    'Motor control centers (MCC)',
    'Variable frequency drive (VFD) systems',
    'Industrial automation',
    'PLC and control systems',
    'Electrical installation supervision',
    'Commissioning and testing',
    'Power system troubleshooting'
  ];

  const software = [
    'Business software',
    'Custom web applications',
    'Enterprise software',
    'SaaS platforms',
    'Mobile applications',
    'Internal business tools',
    'Automation software',
    'Engineering software',
    'Client portals',
    'API integrations',
    'AI-powered business applications'
  ];

  const whyUs = [
    'Over a decade of engineering experience.',
    'Cross-disciplinary expertise.',
    'Industrial-scale problem solving.',
    'Software built around real engineering workflows.',
    'Solutions that scale with businesses.'
  ];

  const pillars = [
    {
      title: 'Renewable Energy Engineering',
      icon: Sun,
      iconClass: 'bg-[#69BD45] text-[#123A63]',
      items: renewable
    },
    {
      title: 'Electrical Engineering',
      icon: Zap,
      iconClass: 'bg-[#156DB7] text-white',
      items: electrical
    },
    {
      title: 'Software Engineering',
      icon: Cpu,
      iconClass: 'bg-[#123A63] text-white',
      items: software
    }
  ];

  return (
    <PublicChrome
      activePage="about"
      isAuthenticated={isAuthenticated}
      onNavigate={onNavigate}
      onGetStarted={onGetStarted}
      onLogin={onLogin}
      onEnterApp={onEnterApp}
    >
      {/* Hero */}
      <section className="relative min-h-[58vh] overflow-hidden border-b border-slate-200">
        <img src="/images/solar-farm-aerial.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#123A63]/88 via-[#156DB7]/78 to-[#0F5288]/92" />
        <div className="pointer-events-none absolute -top-16 left-8 h-64 w-64 rounded-full bg-[#69BD45]/25 blur-3xl animate-aurora-a" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[#69BD45]/20 blur-3xl animate-aurora-b" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24">
          <FadeUp className="max-w-3xl mx-auto text-center">
            <p className="inline-flex rounded-full bg-[#69BD45] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#123A63] mb-5">
              About
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Engineering Meets Intelligent Software.
            </h1>
            <p className="mt-6 text-lg text-white leading-relaxed">
              VoltSolar exists to bridge the gap between practical engineering experience and intelligent software.
              We believe engineers should spend less time repeating calculations and more time solving real
              problems.
            </p>
            <div className="mt-8 inline-flex items-center gap-2.5 rounded-2xl border border-white/40 bg-[#0d2d4d]/80 px-4 py-3 backdrop-blur-md">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#69BD45] text-[#123A63]">
                <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="text-left">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-white/80">Built by</span>
                <span className="block text-sm font-bold text-white">Field engineers, not guesswork</span>
              </span>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Story split */}
      <section className="relative py-20 sm:py-24 bg-white border-b border-slate-100 overflow-hidden">
        <BlobField variant="soft" />
        <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <FadeUp>
            <p className="text-sm font-semibold text-[#156DB7] mb-3">Our Story</p>
            <AccentBar className="mb-4" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#123A63]">
              Born on the job site. Refined in software.
            </h2>
            <div className="mt-6 space-y-4 text-base sm:text-lg text-slate-700 leading-relaxed">
              <p>
                VoltSolar was founded by engineers who spent years designing, troubleshooting, commissioning, and
                maintaining industrial electrical systems, renewable energy projects, power distribution networks,
                and automation systems.
              </p>
              <p className="font-semibold text-[#123A63]">Throughout those years one challenge remained constant.</p>
              <p>
                Solar system sizing was still heavily dependent on manual calculations, spreadsheets, and personal
                experience.
              </p>
              <p>We built VoltSolar to modernize that process.</p>
              <p>
                Today, VoltSolar helps engineers and installers produce faster, smarter, and more accurate solar
                designs backed by engineering validation.
              </p>
            </div>
          </FadeUp>
          <FadeUp delay={0.1} className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-[#156DB7]/15 to-[#69BD45]/15 blur-xl" />
            <div className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 shadow-xl shadow-[#123A63]/10">
              <img
                src="/images/field-engineer-laptop.png"
                alt="Engineer reviewing solar design diagrams on a laptop in the field"
                className="img-reveal w-full h-[420px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#123A63]/75 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider">
                  <span className="inline-flex rounded-md bg-[#69BD45] px-2 py-0.5 text-[#123A63]">Real field practice</span>
                </p>
                <p className="mt-2 text-sm font-semibold leading-snug">
                  Every product decision starts with how systems are actually installed and commissioned.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Capabilities */}
      <section className="relative py-20 sm:py-24 bg-slate-50 border-b border-slate-100 overflow-hidden">
        <BlobField variant="mesh" />
        <div className="relative max-w-7xl mx-auto px-6">
          <FadeUp className="max-w-3xl mb-12">
            <p className="text-sm font-semibold text-[#156DB7] mb-3">Beyond Solar</p>
            <AccentBar className="mb-4" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#123A63]">
              Engineering and Technology Across Industries.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-700 leading-relaxed">
              Our expertise extends far beyond photovoltaic system design. Our engineering and technology teams
              design and develop solutions across multiple industries, combining electrical engineering with
              modern software development to solve complex business and industrial challenges.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {pillars.map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <FadeUp key={pillar.title} delay={i * 0.06}>
                  <div className="feature-card-shell h-full">
                    <div className="feature-card-inner h-full p-6 sm:p-7">
                      <div
                        className={`feature-card-icon mb-5 flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ${pillar.iconClass}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-bold text-[#123A63] mb-4">{pillar.title}</h3>
                      <ul className="space-y-2.5">
                        {pillar.items.map(item => (
                          <li key={item} className="text-sm text-slate-700 flex gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-[#156DB7] shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why clients */}
      <section className="relative py-20 bg-white border-b border-slate-100 overflow-hidden">
        <BlobField variant="dots" className="opacity-25" />
        <div className="relative max-w-7xl mx-auto px-6">
          <FadeUp className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#156DB7] text-white">
                <Building2 className="w-5 h-5" />
              </span>
              <p className="text-sm font-semibold text-[#156DB7]">Why Clients Work With Us</p>
            </div>
            <AccentBar className="mb-4" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#123A63] max-w-3xl">
              Cross-disciplinary teams with industrial-scale experience.
            </h2>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {whyUs.map((item, i) => (
              <FadeUp key={item} delay={i * 0.05}>
                <div className="audience-chip h-full flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <CheckCircle2 className="w-5 h-5 text-[#156DB7] shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-[#123A63] leading-snug">{item}</span>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-20">
        <img src="/images/industrial-roof-solar.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[#123A63]/85" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(105,189,69,0.25),transparent_50%)]" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <FadeUp>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Ready to design with VoltSolar, or talk about a project?
            </h2>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <MagneticButton
                onClick={onGetStarted}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-[#123A63] font-semibold shadow-lg"
              >
                Start Designing Free
                <DrawArrow className="w-4 h-4" stroke="#123A63" />
              </MagneticButton>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-white/50 text-white font-semibold hover:bg-white/10"
              >
                Contact Us
              </button>
            </div>
          </FadeUp>
        </div>
      </section>
    </PublicChrome>
  );
};
