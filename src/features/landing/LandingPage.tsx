import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown, Building2, Users, Home, Factory, Wrench, Layers, CheckCircle2, ShieldCheck
} from 'lucide-react';
import { PublicChrome, PublicPage } from '../../components/PublicChrome';
import { FadeUp } from '../../components/motion/FadeUp';
import { CountUp } from '../../components/motion/CountUp';
import { DrawArrow } from '../../components/motion/DrawArrow';
import { MagneticButton } from '../../components/motion/MagneticButton';
import { HeroRotation, HeroSlide } from '../../components/motion/HeroRotation';
import { FeatureCard } from '../../components/landing/FeatureCard';
import { FeatureIcon, FeatureIconKey } from '../../components/landing/FeatureIcons';
import { AccentBar, BlobField } from '../../components/landing/SectionDecor';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  isAuthenticated?: boolean;
  onEnterApp?: () => void;
  onNavigate?: (page: PublicPage, options?: { intent?: string; hash?: string }) => void;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    headline: 'Design Accurate Solar\nSystems in Minutes -\nWith Engineering Confidence.',
    subheadline:
      'Calculate loads, size batteries, configure PV arrays, match inverters, validate every recommendation, and generate professional engineering reports, all from one intelligent platform.',
    cta: 'Start Designing Free',
    image: '/images/solar-farm-hills.png'
  },
  {
    headline: 'Size Batteries,\nInverters, and PV Arrays\nWith Confidence.',
    subheadline:
      'Eliminate guesswork with intelligent calculations, automatic equipment validation, and engineering-grade sizing for residential, commercial, and industrial projects.',
    cta: 'Start Designing Free',
    image: '/images/field-digital-tablet.png'
  },
  {
    headline: 'Validate Every\nRecommendation Before\nYou Deliver It.',
    subheadline:
      'Every design is checked for voltage, current, MPPT compatibility, battery sizing, cable sizing, and protection coordination before it reaches your client.',
    cta: 'Generate Your First Design',
    image: '/images/field-engineer-laptop.png'
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogin,
  isAuthenticated = false,
  onEnterApp,
  onNavigate = (_page: PublicPage, _options?: { intent?: string; hash?: string }) => undefined
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [heroSlide, setHeroSlide] = useState(0);
  const heroImage = HERO_SLIDES[heroSlide]?.image ?? '/images/solar-farm-hills.png';

  const features: { icon: FeatureIconKey; title: string; body: string }[] = [
    {
      icon: 'load',
      title: 'Accurate Load Analysis',
      body: 'Automatically calculate connected load, surge demand, daily energy consumption, and monthly usage.'
    },
    {
      icon: 'battery',
      title: 'Battery Sizing',
      body: 'Size lithium or lead-acid battery banks using engineering safety margins, depth of discharge, backup hours, and efficiency losses.'
    },
    {
      icon: 'inverter',
      title: 'Smart Inverter Selection',
      body: 'Recommend compatible inverter sizes based on continuous load, starting surge, battery voltage, PV power, and future expansion.'
    },
    {
      icon: 'pv',
      title: 'PV Array Design',
      body: 'Automatically determine the required solar array, panel quantity, string configuration, MPPT compatibility, and expected daily generation.'
    },
    {
      icon: 'protection',
      title: 'Electrical Protection',
      body: 'Generate correctly sized DC and AC protection recommendations including breakers, isolators, fuses, and surge protection devices.'
    },
    {
      icon: 'cable',
      title: 'Cable Sizing',
      body: 'Calculate recommended cable sizes using current carrying capacity and voltage drop calculations.'
    },
    {
      icon: 'report',
      title: 'Engineering Reports',
      body: 'Produce professional client-ready proposals with calculations, engineering notes, equipment schedules, and printable documentation.'
    },
    {
      icon: 'diagram',
      title: 'Single-Line Diagrams',
      body: 'Generate dynamic electrical single-line diagrams based on each project configuration.'
    }
  ];

  const audiences = [
    { icon: Home, label: 'Residential Installers' },
    { icon: Building2, label: 'Commercial EPC Companies' },
    { icon: Factory, label: 'Industrial Engineers' },
    { icon: Users, label: 'Renewable Energy Consultants' },
    { icon: Wrench, label: 'Electrical Contractors' },
    { icon: Layers, label: 'Engineering Firms' }
  ];

  const validations = [
    'Battery Compatibility',
    'PV Voltage Limits',
    'MPPT Current Limits',
    'Inverter Capacity',
    'Cable Sizing',
    'Protection Coordination',
    'Energy Balance',
    'Future Expansion'
  ];

  const steps = [
    { title: 'Create a Project', body: 'Open a new design and capture site and client details.' },
    { title: 'Enter Customer Loads', body: 'Add the appliances and operating hours that drive the system.' },
    { title: 'Select Design Preferences', body: 'Set backup hours, battery chemistry, voltage, and PV preferences.' },
    { title: 'VoltSolar Calculates Everything', body: 'Loads, storage, inverter, array, protection, and cables in one pass.' },
    { title: 'Review Engineering Report', body: 'Inspect every recommendation with transparent engineering notes.' },
    { title: 'Export and Install', body: 'Download or print a client-ready proposal and move to installation.' }
  ];

  const faqs = [
    {
      question: 'Is VoltSolar just a solar calculator?',
      answer:
        'No. VoltSolar is an intelligent solar system design platform. It calculates, validates, and documents complete PV designs so you can deliver professional engineering work faster.'
    },
    {
      question: 'Who is VoltSolar for?',
      answer:
        'Solar installers, solar engineers, EPC companies, electrical contractors, and renewable energy professionals who need accurate, repeatable system designs.'
    },
    {
      question: 'Does VoltSolar validate designs before recommending them?',
      answer:
        'Yes. Battery compatibility, PV voltage limits, MPPT current limits, inverter capacity, cable sizing, protection coordination, energy balance, and expansion headroom are checked. Only validated designs are presented.'
    },
    {
      question: 'What does the engineering report include?',
      answer:
        'Client-ready proposals with calculations, engineering notes, equipment schedules, protection and cable recommendations, and printable documentation aligned to common IEC and NEC practice.'
    },
    {
      question: 'Can your team also design a solar system for our site?',
      answer:
        'Yes. Engineering services are available through Contact. Use VoltSolar yourself for day-to-day design work, or engage our engineers when you need a full delivered design.'
    },
    {
      question: 'Do you build custom software as well?',
      answer:
        'Yes, as a second business line. Visit About or Contact if you need websites, web apps, mobile apps, or business systems. The VoltSolar product remains our primary platform for solar design.'
    }
  ];

  const manualList = [
    'Connected Load',
    'Daily Energy Consumption',
    'Battery Capacity',
    'Inverter Selection',
    'Solar Panel Quantity',
    'PV String Layout',
    'Protection Devices',
    'Cable Sizes',
    'Single-Line Diagrams'
  ];

  const stats = [
    { to: 10, suffix: '+', label: 'Years of engineering practice' },
    { to: 8, suffix: '', label: 'Validation checks per design' },
    { to: 6, suffix: '', label: 'Steps from loads to report' },
    { to: 1, suffix: '', label: 'Platform for complete PV design' }
  ];

  return (
    <PublicChrome
      activePage="home"
      isAuthenticated={isAuthenticated}
      onNavigate={onNavigate}
      onGetStarted={onGetStarted}
      onLogin={onLogin}
      onEnterApp={onEnterApp}
    >
      {/* Hero - full bleed image + aurora */}
      <section className="relative min-h-[88vh] overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0">
          <AnimatePresence mode="sync" initial={false}>
            <motion.img
              key={heroImage}
              src={heroImage}
              alt=""
              decoding="async"
              fetchPriority="high"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#123A63]/88 via-[#156DB7]/78 to-[#0F5288]/92" />
        <div
          className="pointer-events-none absolute -top-20 left-10 h-72 w-72 rounded-full bg-[#69BD45]/30 blur-3xl animate-aurora-a"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-10 right-0 h-80 w-80 rounded-full bg-[#69BD45]/20 blur-3xl animate-aurora-b"
          aria-hidden
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-20 sm:pt-28 sm:pb-32">
          <div className="max-w-6xl mx-auto text-center min-w-0">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-5 sm:mb-8"
            >
              <span className="block text-[28px] sm:text-[32px] lg:text-[37px] font-extrabold tracking-tight text-white leading-[0.95] drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
                Volt<span className="text-[#69BD45]">Solar</span>
              </span>
              <span className="mt-3 sm:mt-4 inline-flex max-w-full items-center justify-center rounded-full bg-[#69BD45] px-3 sm:px-4 py-2 text-[11px] sm:text-sm font-bold uppercase tracking-[0.08em] sm:tracking-[0.14em] text-[#123A63] shadow-sm text-center leading-snug">
                Intelligent solar design platform
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="min-w-0"
            >
              <HeroRotation
                slides={HERO_SLIDES}
                onSlideChange={setHeroSlide}
                onPrimaryCta={isAuthenticated ? onEnterApp || onGetStarted : onGetStarted}
                secondaryCta={
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 rounded-xl border border-white/50 text-white font-semibold hover:bg-white/10 transition-colors backdrop-blur-sm"
                  >
                    Watch how it works
                  </a>
                }
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="mt-8 sm:mt-10 mx-auto w-full max-w-4xl min-w-0"
            >
              <div className="flex w-full flex-col lg:flex-row lg:items-center lg:justify-center gap-3 lg:gap-4 rounded-2xl border border-white/40 bg-[#0d2d4d]/80 px-3 py-3.5 sm:px-5 backdrop-blur-md shadow-xl shadow-black/25">
                <div className="flex items-center justify-center gap-2.5 shrink-0">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#69BD45] text-[#123A63] shadow-sm">
                    <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
                  </span>
                  <span className="text-left">
                    <span className="inline-flex rounded-md bg-[#69BD45] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#123A63]">
                      Trusted engineering
                    </span>
                    <span className="mt-1 block text-sm font-bold text-white leading-tight">
                      10+ years in the field
                    </span>
                  </span>
                </div>
                <span className="hidden lg:block h-8 w-px bg-white/35 shrink-0" aria-hidden />
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {['Industrial power', 'Electrical design', 'Automation', 'Renewables'].map(label => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#123A63] shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#156DB7] shrink-0" strokeWidth={2.5} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative border-b border-slate-200 bg-slate-100 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {stats.map((stat, i) => (
              <FadeUp key={stat.label} delay={i * 0.06}>
                <div className="stat-card group h-full">
                  <div className="stat-card-inner h-full px-4 py-6 sm:px-5 sm:py-7 text-center">
                    <p className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#123A63]">
                      <CountUp to={stat.to} suffix={stat.suffix} />
                    </p>
                    <p className="mt-2 text-sm sm:text-[15px] font-semibold text-slate-700 leading-snug">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Problem - split with image */}
      <section className="relative py-20 sm:py-24 bg-white border-b border-slate-100 overflow-hidden">
        <BlobField variant="soft" />
        <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <FadeUp>
            <p className="text-sm font-semibold text-[#156DB7] mb-3">The Problem</p>
            <AccentBar className="mb-4" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#123A63]">
              Most Solar Designs Are Still Done Manually.
            </h2>
            <div className="mt-6 space-y-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              <p>
                Many installers still rely on spreadsheets, WhatsApp calculations, guesswork, or years of personal
                experience to size solar systems.
              </p>
              <p>
                That approach is slow, inconsistent, and often results in oversized systems that increase project
                costs, or undersized systems that fail when customers need them most.
              </p>
              <p className="font-semibold text-slate-800">Even experienced engineers spend valuable time calculating:</p>
            </div>
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {manualList.map(item => (
                <li
                  key={item}
                  className="flex items-center gap-2.5 text-sm font-medium text-slate-700 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <span className="w-2 h-2 rounded-full bg-gradient-to-br from-[#156DB7] to-[#69BD45] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-base sm:text-lg text-[#123A63] font-semibold">
              Every project starts from scratch. VoltSolar changes that.
            </p>
          </FadeUp>

          <FadeUp delay={0.12} className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-[#156DB7]/15 to-[#69BD45]/15 blur-xl" />
            <div className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 shadow-xl shadow-[#123A63]/10">
              <img
                src="/images/load-calc-desk.png"
                alt="Manual electrical load calculation worksheet on a desk"
                loading="lazy"
                decoding="async"
                className="img-reveal w-full h-[420px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#123A63]/70 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#69BD45]">Field reality</p>
                <p className="mt-1 text-sm font-semibold leading-snug">
                  Manual sizing still slows quotes, coordination, and install confidence.
                </p>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden sm:flex animate-float-y items-center gap-2 rounded-2xl border border-white bg-white px-4 py-3 shadow-lg">
              <FeatureIcon name="report" className="w-7 h-7" />
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Replace with</p>
                <p className="text-sm font-bold text-[#123A63]">Validated digital design</p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Solution + features */}
      <section id="product" className="relative py-20 sm:py-24 bg-slate-50 border-b border-slate-100 overflow-hidden">
        <BlobField variant="mesh" />
        <div className="relative max-w-7xl mx-auto px-6">
          <FadeUp className="max-w-3xl">
            <p className="text-sm font-semibold text-[#156DB7] mb-3">The Solution</p>
            <AccentBar className="mb-4" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#123A63]">
              One Intelligent Platform. Complete Solar Design.
            </h2>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
              VoltSolar automates the engineering calculations behind professional photovoltaic system design
              while still giving installers complete control over every decision.
            </p>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              Simply enter your customer&apos;s electrical loads, installation preferences, and backup
              requirements. VoltSolar performs the calculations and produces a complete engineering-ready design
              in minutes.
            </p>
          </FadeUp>

          <div id="features" className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.04}>
                <FeatureCard icon={f.icon} title={f.title} body={f.body} />
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Built for professionals */}
      <section className="relative py-20 bg-white border-b border-slate-100 overflow-hidden">
        <BlobField variant="dots" className="opacity-25" />
        <div className="relative max-w-7xl mx-auto px-6">
          <FadeUp className="max-w-3xl mb-12">
            <p className="text-sm font-semibold text-[#156DB7] mb-3">Built for Professionals</p>
            <AccentBar className="mb-4" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#123A63]">
              Whether You&apos;re Designing One Home or One Hundred Commercial Projects.
            </h2>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {audiences.map((a, i) => {
              const Icon = a.icon;
              return (
                <FadeUp key={a.label} delay={i * 0.05}>
                  <div className="audience-chip flex items-center gap-3 px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#123A63] to-[#156DB7] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#156DB7]/20">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-slate-800">{a.label}</span>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why VoltSolar */}
      <section className="relative overflow-hidden py-20 text-white border-b border-slate-200">
        <img
          src="/images/solar-farm-night.png"
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#123A63]/92 via-[#156DB7]/85 to-[#0F5288]/88" />
        <div className="pointer-events-none absolute -top-16 right-10 h-64 w-64 rounded-full bg-[#69BD45]/25 blur-3xl animate-aurora-a" />
        <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <FadeUp>
            <p className="inline-flex items-center rounded-full bg-[#69BD45] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#123A63] mb-4">
              Why VoltSolar?
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Transparent Engineering, Not Guesswork.
            </h2>
            <p className="mt-5 text-lg text-white leading-relaxed">
              Instead of telling you what equipment to buy, VoltSolar explains why every recommendation was made.
            </p>
            <div className="mt-8 space-y-3 text-base text-white">
              {[
                'Every inverter recommendation is validated.',
                'Every battery is checked.',
                'Every PV string is verified.',
                'Every cable is sized.',
                'Every protection device is justified.'
              ].map(line => (
                <p key={line} className="flex items-start gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-[#69BD45] shrink-0 ring-2 ring-[#69BD45]/30" />
                  {line}
                </p>
              ))}
            </div>
            <p className="mt-8 text-lg font-semibold text-white">
              Because professional engineering should be transparent, not guesswork.
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="relative rounded-[1.75rem] border border-white/30 bg-[#0d2d4d]/75 backdrop-blur-md p-6 sm:p-8 shadow-2xl">
              <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-[#69BD45]/35 blur-2xl" />
              <p className="inline-flex items-center rounded-md bg-[#69BD45] px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-[#123A63]">
                Design passport
              </p>
              <div className="mt-5 space-y-3">
                {['Loads verified', 'Storage sized', 'Inverter matched', 'PV string validated', 'Protection scheduled'].map(
                  (item, i) => (
                    <div
                      key={item}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white/12 border border-white/20 px-4 py-3"
                    >
                      <span className="text-sm font-semibold text-white">{item}</span>
                      <span className="shrink-0 rounded-md bg-[#69BD45] px-2 py-1 text-[11px] font-bold tracking-wide text-[#123A63]">
                        PASS 0{i + 1}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Engineering confidence */}
      <section className="relative py-20 sm:py-24 bg-white border-b border-slate-100 overflow-hidden">
        <BlobField variant="mesh" />
        <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <FadeUp>
            <p className="text-sm font-semibold text-[#156DB7] mb-3">Engineering Confidence</p>
            <AccentBar className="mb-4" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#123A63] leading-tight">
              Every Design Is Validated Before It Is Recommended.
            </h2>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
              VoltSolar doesn&apos;t simply calculate. It validates. Only validated system designs are presented.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {validations.map((item, i) => (
                <FadeUp key={item} delay={i * 0.04}>
                  <div className="audience-chip flex items-center gap-2.5 px-4 py-3.5 rounded-xl border border-emerald-100 bg-emerald-50/70">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800">{item}</span>
                  </div>
                </FadeUp>
              ))}
            </div>
          </FadeUp>
          <FadeUp delay={0.1} className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-[#156DB7]/15 to-[#69BD45]/15 blur-xl" />
            <div className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 shadow-xl shadow-[#123A63]/10">
              <img
                src="/images/engineer-desk.png"
                alt="Engineer validating system designs on dual monitors"
                loading="lazy"
                decoding="async"
                className="img-reveal w-full h-[420px] object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#123A63]/75 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#69BD45]">Validation first</p>
                <p className="mt-1 text-sm font-semibold leading-snug">
                  Recommendations only ship after voltage, current, and compatibility checks pass.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative py-20 sm:py-24 bg-slate-50 border-b border-slate-100 overflow-hidden">
        <BlobField variant="soft" />
        <div className="relative max-w-7xl mx-auto px-6">
          <FadeUp className="max-w-3xl mb-12">
            <p className="text-sm font-semibold text-[#156DB7] mb-3">How It Works</p>
            <AccentBar className="mb-4" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#123A63]">
              From Loads to Installation in Six Steps.
            </h2>
          </FadeUp>
          <FadeUp delay={0.05} className="mb-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {[
                { src: '/images/load-calc-desk.png', label: 'Capture loads' },
                { src: '/images/field-digital-tablet.png', label: 'Size & validate' },
                { src: '/images/field-engineer-laptop.png', label: 'Deliver designs' }
              ].map(shot => (
                <div
                  key={shot.label}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
                >
                  <img
                    src={shot.src}
                    alt={shot.label}
                    loading="lazy"
                    decoding="async"
                    className="img-reveal h-40 sm:h-48 w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#123A63]/80 via-transparent to-transparent" />
                  <p className="absolute bottom-3 left-3 right-3 text-sm font-bold text-white">{shot.label}</p>
                </div>
              ))}
            </div>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {steps.map((step, i) => (
              <FadeUp key={step.title} delay={i * 0.05}>
                <div className="step-card relative p-6 bg-white border border-slate-200 rounded-2xl h-full overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#156DB7]/10 to-transparent rounded-bl-[3rem]" />
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#123A63] text-white text-xs font-bold">
                      {i + 1}
                    </span>
                    {i < steps.length - 1 ? (
                      <DrawArrow className="w-5 h-5 text-[#69BD45]" stroke="#69BD45" />
                    ) : null}
                  </div>
                  <h3 className="relative mt-4 text-lg font-bold text-slate-900">{step.title}</h3>
                  <p className="relative mt-2 text-sm text-slate-600 leading-relaxed">{step.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Built by engineers */}
      <section className="relative py-20 bg-white border-b border-slate-100 overflow-hidden">
        <BlobField variant="dots" className="opacity-20" />
        <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
          <FadeUp className="lg:col-span-3">
            <p className="text-sm font-semibold text-[#156DB7] mb-3">Our Origin</p>
            <AccentBar className="mb-4" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#123A63]">
              Built by Engineers.
              <br />
              Not Software Developers Guessing.
            </h2>
            <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed">
              VoltSolar was created by engineers with years of experience designing electrical systems for
              industrial facilities, power generation plants, renewable energy projects, motor control systems,
              automation, and high-reliability electrical infrastructure.
            </p>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              Every engineering decision inside VoltSolar is based on real-world installation experience, not
              assumptions.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#156DB7] hover:text-[#0F5288]"
            >
              Learn more about our team
              <DrawArrow className="w-4 h-4" stroke="#156DB7" />
            </button>
          </FadeUp>
          <FadeUp delay={0.1} className="lg:col-span-2">
            <div className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 shadow-lg">
              <img
                src="/images/industrial-roof-solar.png"
                alt="Industrial facility with rooftop solar arrays"
                loading="lazy"
                decoding="async"
                className="img-reveal h-80 w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#123A63]/75 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <p className="text-sm font-bold">Real installation experience, encoded in software.</p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-20 bg-slate-50 border-b border-slate-100 overflow-hidden">
        <BlobField variant="mesh" />
        <div className="relative max-w-7xl mx-auto px-6">
          <FadeUp className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-sm font-semibold text-[#156DB7] mb-3">Pricing</p>
            <AccentBar className="mb-4 mx-auto" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#123A63]">
              Free during early access. Scale with us as we grow.
            </h2>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              Billing is not live yet. Every account currently gets the full design workflow at no charge while we
              finish paid plans.
            </p>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FadeUp delay={0.05}>
              <div className="feature-card p-7 rounded-2xl border border-slate-200 bg-white h-full">
                <h3 className="text-lg font-bold text-slate-900">Early Access</h3>
                <p className="mt-2 text-3xl font-extrabold text-[#123A63]">$0</p>
                <p className="text-sm text-slate-500 mt-1">Available now for installers and engineers</p>
                <ul className="mt-6 space-y-2 text-sm text-slate-600">
                  <li>Full sizing engine</li>
                  <li>Engineering report export</li>
                  <li>Project save and manage</li>
                </ul>
                <MagneticButton
                  onClick={onGetStarted}
                  className="mt-8 w-full py-3 rounded-xl bg-[#156DB7] text-white font-semibold hover:bg-[#0F5288]"
                >
                  Create Free Account
                </MagneticButton>
              </div>
            </FadeUp>
            <FadeUp delay={0.1}>
              <div className="feature-card p-7 rounded-2xl border-2 border-[#156DB7] bg-white shadow-md relative h-full">
                <span className="absolute -top-3 left-6 text-[10px] font-bold uppercase tracking-wider bg-[#156DB7] text-white px-2.5 py-1 rounded-full">
                  Coming soon
                </span>
                <h3 className="text-lg font-bold text-slate-900">Professional</h3>
                <p className="mt-2 text-3xl font-extrabold text-[#123A63]">
                  TBA
                </p>
                <p className="text-sm text-slate-500 mt-1">Planned for teams quoting weekly</p>
                <ul className="mt-6 space-y-2 text-sm text-slate-600">
                  <li>Everything in Early Access</li>
                  <li>Team workspace (planned)</li>
                  <li>Report branding (planned)</li>
                  <li>Priority support (planned)</li>
                </ul>
                <button
                  type="button"
                  onClick={() => onNavigate('contact', { intent: 'Professional plan interest' })}
                  className="mt-8 w-full py-3 rounded-xl bg-[#123A63] text-white font-semibold hover:bg-[#0d2d4d]"
                >
                  Join waitlist
                </button>
              </div>
            </FadeUp>
            <FadeUp delay={0.15}>
              <div className="feature-card p-7 rounded-2xl border border-slate-200 bg-white h-full">
                <h3 className="text-lg font-bold text-slate-900">Enterprise</h3>
                <p className="mt-2 text-3xl font-extrabold text-[#123A63]">Custom</p>
                <p className="text-sm text-slate-500 mt-1">For EPCs and multi-branch operators</p>
                <ul className="mt-6 space-y-2 text-sm text-slate-600">
                  <li>Dedicated onboarding</li>
                  <li>Custom equipment catalogs</li>
                  <li>Team governance</li>
                </ul>
                <button
                  type="button"
                  onClick={() => onNavigate('contact', { intent: 'Enterprise / Sales' })}
                  className="mt-8 w-full py-3 rounded-xl border border-slate-300 text-slate-800 font-semibold hover:bg-slate-50"
                >
                  Contact Sales
                </button>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-20 bg-white border-b border-slate-100 overflow-hidden">
        <BlobField variant="soft" />
        <div className="relative max-w-3xl mx-auto px-6">
          <FadeUp>
            <p className="text-sm font-semibold text-[#156DB7] mb-3">FAQ</p>
            <AccentBar className="mb-4" />
            <h2 className="text-3xl font-bold tracking-tight text-[#123A63] mb-10">Frequently Asked Questions</h2>
          </FadeUp>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FadeUp key={faq.question} delay={i * 0.04}>
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 hover:border-[#156DB7]/35 transition-colors">
                  <button
                    type="button"
                    id={`faq-trigger-${i}`}
                    aria-expanded={activeFaq === i}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="font-semibold text-slate-900">{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        activeFaq === i ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {activeFaq === i && (
                      <motion.div
                        id={`faq-panel-${i}`}
                        role="region"
                        aria-labelledby={`faq-trigger-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-24">
        <img
          src="/images/solar-farm-water.png"
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#123A63]/85" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(105,189,69,0.25),transparent_50%)]" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <FadeUp>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Start Your First Solar Design Today.
            </h2>
            <p className="mt-4 text-lg text-white/90">
              Professional solar engineering begins with accurate calculations.
            </p>
            <MagneticButton
              onClick={onGetStarted}
              className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-[#123A63] font-semibold shadow-lg hover:bg-slate-50"
            >
              Create Free Account
              <DrawArrow className="w-4 h-4" stroke="#123A63" />
            </MagneticButton>
          </FadeUp>
        </div>
      </section>
    </PublicChrome>
  );
};
