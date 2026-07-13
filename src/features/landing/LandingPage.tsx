import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sun, Zap, Battery, ShieldCheck, ChevronDown, ArrowRight,
  Layers, Activity, Cable, FileText, Cpu, Building2, Users
} from 'lucide-react';
import { PublicChrome, PublicPage } from '../../components/PublicChrome';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  isAuthenticated?: boolean;
  onEnterApp?: () => void;
  onNavigate?: (page: PublicPage) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogin,
  isAuthenticated = false,
  onEnterApp,
  onNavigate = (_page: PublicPage) => undefined
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: 'Is VoltSolar just a solar calculator?',
      answer:
        'No. It is a constraint-solving engineering engine. Designs that fail voltage, current, power, or capacity checks are not published.'
    },
    {
      question: 'Who is VoltSolar for?',
      answer:
        'Professional installers, EPCs, and engineering teams who need repeatable, explainable solar designs, plus businesses that want custom digital products or engineered solar systems delivered by our team.'
    },
    {
      question: 'Do you only build software?',
      answer:
        'No. We design solar systems for residential, commercial, and industrial clients, and we deliver electrical design and controls work grounded in 10+ years of field practice.'
    },
    {
      question: 'Can you build a custom app or website for our brand?',
      answer:
        'Yes. Contact us with your brief. We design and build software, websites, web apps, and mobile apps for businesses across industries.'
    },
    {
      question: 'What standards does the report reference?',
      answer:
        'Designs are prepared in line with common practice under IEC 60364, IEC 62548, and NEC Article 690. Final installation must comply with local authority requirements.'
    },
    {
      question: 'Will VoltSolar stop me from generating a bad design?',
      answer:
        'Yes. Empty loads, incompatible equipment, and failed electrical audits block report generation.'
    }
  ];

  const features = [
    {
      icon: Layers,
      title: 'Load & Peak Demand Engine',
      body: 'Model appliances with real surge behaviour. Capture continuous load, peak demand, and daily energy the way field engineers actually size systems.'
    },
    {
      icon: Battery,
      title: 'Battery Bank Sizing',
      body: 'One energy chain. Commercial capacities. Chemistry-aware DoD and efficiency. No orphaned amp-hour guesses.'
    },
    {
      icon: Zap,
      title: 'Inverter Compatibility',
      body: 'Continuous load, surge, battery voltage, PV voltage, current, and power, validated before recommendation. Failures are rejected, not warned and published.'
    },
    {
      icon: Sun,
      title: 'PV Array & String Layout',
      body: 'Cold-weather Voc, hot-weather Vmp, MPPT windows, and current headroom. Only electrically valid string configurations are shown.'
    },
    {
      icon: Cable,
      title: 'Protection & Cable Schedules',
      body: 'Calculated currents, safety factors, nearest standard ratings, ampacity, voltage drop, and utilization, documented for installers.'
    },
    {
      icon: FileText,
      title: 'Engineering Design Report',
      body: 'Client-ready proposals with inputs, energy flow, design passport, confidence score, and standards references (IEC 60364, IEC 62548, NEC Article 690).'
    }
  ];

  const steps = [
    { title: 'Client & Site', body: 'Capture project identity, location, and classification.' },
    { title: 'Load Schedule', body: 'Build the appliance list that drives every downstream calculation.' },
    { title: 'Energy Demand', body: 'Review continuous load, peak demand, and daily/monthly energy.' },
    { title: 'Backup Requirement', body: 'Set the autonomy your client actually needs.' },
    { title: 'Battery Chemistry & Voltage', body: 'Lock storage parameters to real equipment behaviour.' },
    { title: 'Inverter Topology', body: 'Hybrid, off-grid, or auto-recommend.' },
    { title: 'PV Preference', body: 'Preferred module wattage; the engine finds a valid layout.' },
    { title: 'Engineering Report', body: 'Print, present, or save, only after validation passes.' }
  ];

  return (
    <PublicChrome
      activePage="home"
      isAuthenticated={isAuthenticated}
      onNavigate={onNavigate}
      onGetStarted={onGetStarted}
      onLogin={onLogin}
      onEnterApp={onEnterApp}
      onLogoClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      {/* Hero, brand first, one composition */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden bg-gradient-to-b from-[#E8F1F8] via-white to-slate-50">
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-0 left-1/4 w-[40%] h-[50%] bg-[#156DB7]/15 blur-3xl rounded-full" />
          <div className="absolute top-10 right-1/5 w-[35%] h-[40%] bg-[#69BD45]/10 blur-3xl rounded-full" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs sm:text-sm font-semibold text-[#0F5288] mb-5"
          >
            Professional solar design software, built by practicing power engineers
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#123A63] leading-[1.05]"
          >
            VoltSolar
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-5 text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 max-w-3xl mx-auto leading-snug"
          >
            Size bankable solar systems in minutes, not spreadsheets.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
          >
            VoltSolar turns load schedules into engineered recommendations: battery banks, inverters, PV arrays,
            string layouts, protection, and cables, with validation your clients can trust.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              type="button"
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-4 bg-[#156DB7] hover:bg-[#0F5288] text-white font-semibold rounded-xl shadow-lg shadow-[#156DB7]/15 transition-all inline-flex items-center justify-center gap-2"
            >
              Start Designing Free
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 font-semibold rounded-xl transition-all"
            >
              Talk to Our Engineers
            </button>
          </motion.div>

          <p className="mt-5 text-sm text-slate-500">
            Used by installers who need designs they can defend on site and in the boardroom.
          </p>
        </div>
      </section>

      {/* Trust strip */}
      <section className="py-8 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            '10+ years in power & industrial electrical design',
            'Domestic · Commercial · Industrial solar',
            'Software, web & mobile for operating businesses',
            'Reports aligned to IEC / NEC practice'
          ].map(item => (
            <p key={item} className="text-xs sm:text-sm font-medium text-slate-700 leading-snug">
              {item}
            </p>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#123A63] tracking-tight">
            Spreadsheets don’t fail gracefully. Your reputation does.
          </h2>
          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
            Most solar quotes still start in disconnected tools: load lists in one file, battery math in another,
            string voltage checked by hand. One missed surge factor or MPPT limit becomes an undersized inverter,
            a tripped system, or a client who never calls back.
          </p>
          <p className="mt-6 text-base font-semibold text-slate-800 leading-relaxed">
            VoltSolar was built so every recommendation answers three questions:{' '}
            <em className="not-italic text-[#156DB7]">What is it? How was it calculated? Why was it selected?</em>
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-sm font-semibold text-[#156DB7] mb-2">Platform</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#123A63] tracking-tight">
              An engineering workflow, not another calculator.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              From connected load to a print-ready design proposal, VoltSolar keeps every decision electrically consistent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <div className="w-11 h-11 rounded-xl bg-[#156DB7]/10 text-[#156DB7] flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-sm font-semibold text-[#156DB7] mb-2">Workflow</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#123A63] tracking-tight">
              Eight steps. One coherent design.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Structured enough for juniors. Rigorous enough for chartered-level review.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((step, i) => (
              <div key={step.title} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="w-9 h-9 rounded-full bg-[#123A63] text-white text-sm font-bold flex items-center justify-center mb-4">
                  {i + 1}
                </div>
                <h3 className="font-bold text-slate-900 mb-1.5">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-sm font-semibold text-slate-700">
            If the design cannot be validated, VoltSolar will not publish it.
          </p>
        </div>
      </section>

      {/* Dual offer */}
      <section className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-sm font-semibold text-[#156DB7] mb-2">Beyond the platform</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#123A63] tracking-tight">
              Need more than software? Our engineers build the systems, and the tools behind them.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50">
              <Sun className="w-7 h-7 text-[#69BD45] mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Solar & Electrical Engineering</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                We design and specify solar systems for homes, companies, and industrial facilities, backed by a
                decade of power systems, controls, panels, and motor installation experience.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="text-sm font-semibold text-[#156DB7] inline-flex items-center gap-1.5 hover:underline"
              >
                Request a Solar Design
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50">
              <Cpu className="w-7 h-7 text-[#156DB7] mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Custom Software & Applications</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                The same team that built VoltSolar designs and ships websites, web apps, and mobile apps for brands
                across industries, purpose-built, not template-bound.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="text-sm font-semibold text-[#156DB7] inline-flex items-center gap-1.5 hover:underline"
              >
                Brief Our Product Team
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Audience */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#123A63] tracking-tight text-center mb-12">
            Built for people who sign their name under the design.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Activity,
                title: 'Installer / EPC',
                body: 'Win bids faster with reports that look engineered, because they are.'
              },
              {
                icon: Users,
                title: 'Engineering leads',
                body: 'Enforce consistency across juniors with validation that blocks unsafe combinations.'
              },
              {
                icon: Building2,
                title: 'Facility & business owners',
                body: 'Commission solar and digital systems from a team that understands both the plant floor and the product roadmap.'
              }
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white border border-slate-200 rounded-2xl p-6">
                  <Icon className="w-6 h-6 text-[#156DB7] mb-4" />
                  <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-sm font-semibold text-[#156DB7] mb-2">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#123A63] tracking-tight">
              Clear plans. Serious capability.
            </h2>
            <p className="mt-4 text-lg text-slate-600">Start free. Scale when your pipeline demands it.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase text-[#123A63]">Starter</h3>
                <div className="flex items-baseline mt-4">
                  <span className="text-4xl font-extrabold text-slate-900">$0</span>
                  <span className="text-slate-500 text-sm ml-2">/ free</span>
                </div>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  For installers validating the workflow on real projects.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-700">
                  {['Full sizing engine', 'Engineering report', 'Project save & manage'].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#69BD45] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={onGetStarted}
                className="mt-8 w-full py-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded-xl"
              >
                Start Free
              </button>
            </div>

            <div className="bg-gradient-to-b from-[#123A63] to-[#0A2540] text-white rounded-2xl p-8 border border-slate-800 flex flex-col justify-between relative shadow-xl lg:-translate-y-1">
              <div className="absolute top-4 right-4 bg-[#156DB7] text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full">
                Popular
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase text-[#69BD45]">Professional</h3>
                <div className="flex items-baseline mt-4">
                  <span className="text-4xl font-extrabold">$49</span>
                  <span className="text-slate-400 text-sm ml-2">/ month</span>
                </div>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed">For teams quoting weekly.</p>
                <ul className="mt-6 space-y-3 text-sm text-slate-200">
                  {[
                    'Everything in Starter',
                    'Priority calculation throughput',
                    'Multi-project workspace',
                    'Report branding controls'
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#69BD45] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={onGetStarted}
                className="mt-8 w-full py-3 bg-[#156DB7] hover:bg-[#0F5288] text-white font-semibold rounded-xl"
              >
                Go Professional
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase text-[#123A63]">Enterprise</h3>
                <div className="flex items-baseline mt-4">
                  <span className="text-4xl font-extrabold text-slate-900">Custom</span>
                </div>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  For EPCs and multi-branch operators.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-700">
                  {[
                    'Dedicated onboarding',
                    'Custom equipment catalogs',
                    'Team governance',
                    'Optional Ops stack integration'
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#69BD45] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="mt-8 w-full py-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded-xl"
              >
                Contact Sales
              </button>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-slate-500 max-w-2xl mx-auto">
            Custom software, websites, mobile apps, and turnkey solar/electrical design are quoted separately via Contact.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#123A63] tracking-tight">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={faq.question} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between font-semibold text-slate-900 hover:text-[#156DB7]"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-500 transition-transform ${
                      activeFaq === idx ? 'rotate-180 text-[#156DB7]' : ''
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-[#123A63] text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Stop guessing. Start engineering.</h2>
          <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed">
            Open VoltSolar and produce your next design proposal, or bring our engineers in to design the system
            or build the software your business needs.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={onGetStarted}
              className="px-8 py-4 bg-[#156DB7] hover:bg-[#0F5288] rounded-xl font-semibold inline-flex items-center justify-center gap-2"
            >
              Start Designing Free
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="px-8 py-4 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl font-semibold"
            >
              Contact VoltSolar
            </button>
          </div>
        </div>
      </section>
    </PublicChrome>
  );
};
