import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, Zap, Battery, ShieldCheck, ClipboardList, TrendingUp, 
  ChevronDown, ArrowRight, Star, Layers, Activity, Lock
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  isAuthenticated?: boolean;
  onEnterApp?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogin,
  isAuthenticated = false,
  onEnterApp
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "How does VoltSolar calculate peak starting loads?",
      answer: "VoltSolar applies specific surge multiplier indexes to inductive loads (like compressor refrigerators, borehole pumps, and air conditioners) as part of our automated engineering workflows. This ensures your inverter is appropriately scaled for high starting currents, preventing continuous tripping."
    },
    {
      question: "Can I customize the wattage ratings for individual appliances?",
      answer: "Yes. While VoltSolar provides standardized baseline ratings for 25+ standard residential appliances, you can customize the operating wattage of any device in the wizard to reflect specific manufacturer nameplates."
    },
    {
      question: "What system voltages does VoltSolar support?",
      answer: "We support standard low-voltage and high-voltage DC configurations, including 12V, 24V, and 48V. Our smart engine can also auto-recommend the ideal system voltage based on total connected wattages and safety limits."
    },
    {
      question: "Is battery chemistry factored into storage depth sizing?",
      answer: "Absolutely. VoltSolar dynamically adjusts Depth of Discharge (DoD) allowances based on your choice: 90% for Lithium, 60% for Tubular Deep Cycle, and 50% for standard AGM/Gel cells to preserve operational lifespan."
    },
    {
      question: "Can I save, copy, and manage multiple projects?",
      answer: "Yes, VoltSolar is a fully-featured SaaS platform. Once you create a project, it's saved to your dashboard where you can view, duplicate, edit, or delete designs in seconds."
    },
    {
      question: "Are there any design reports I can export?",
      answer: "Yes! While the core design outputs are fully viewable instantly, professional client PDF exports and Bill of Materials (BOM) compilers are currently in active development and slated for our next version update."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-[#156DB7]/20 selection:text-[#156DB7]">
      {/* Navigation */}
      <header id="nav" className="sticky top-0 z-50 backdrop-blur-md bg-white/75 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            id="landing-logo-btn"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center space-x-3 hover:opacity-90 transition-opacity"
            aria-label="VoltSolar homepage"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#123A63] to-[#156DB7] flex items-center justify-center shadow-md">
              <Sun className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#123A63]">
              Volt<span className="text-[#156DB7]">Solar</span>
            </span>
          </button>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-[#156DB7] transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-[#156DB7] transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-[#156DB7] transition-colors">Pricing</a>
            <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-[#156DB7] transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <button
                id="enter-app-btn"
                onClick={onEnterApp || onGetStarted}
                className="text-sm font-semibold bg-[#156DB7] hover:bg-[#0F5288] text-white px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all duration-200"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button 
                  id="login-btn"
                  onClick={onLogin} 
                  className="text-sm font-semibold text-slate-700 hover:text-[#156DB7] px-4 py-2 transition-colors"
                >
                  Log in
                </button>
                <button 
                  id="get-started-btn"
                  onClick={onGetStarted} 
                  className="text-sm font-semibold bg-[#156DB7] hover:bg-[#0F5288] text-white px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all duration-200"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        {/* Abstract Background Accents */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden opacity-30">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[80%] bg-radial from-[#156DB7]/10 to-transparent blur-3xl rounded-full" />
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[70%] bg-radial from-[#69BD45]/10 to-transparent blur-3xl rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center space-x-2 bg-white border border-slate-200 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#123A63] mb-8 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-[#69BD45] fill-[#69BD45]" />
            <span>Introducing VoltSolar v1.0 MVP Platform</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight"
          >
            Design Professional Solar Systems <span className="bg-gradient-to-r from-[#156DB7] to-[#69BD45] bg-clip-text text-transparent">in Minutes</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mt-6 leading-relaxed"
          >
            VoltSolar helps professional solar installers calculate electrical loads, size battery banks, select inverters, and specify solar panel grids through a structured, compliant engineering workflow.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
          >
            <button 
              id="hero-start-free"
              onClick={onGetStarted} 
              className="w-full sm:w-auto px-8 py-4 bg-[#156DB7] hover:bg-[#0F5288] text-white font-semibold rounded-xl shadow-lg shadow-[#156DB7]/10 hover:shadow-xl hover:shadow-[#156DB7]/15 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <span>Start Free Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              id="hero-demo"
              onClick={onGetStarted} 
              className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-200"
            >
              Watch Demo Mockup
            </button>
          </motion.div>

          {/* Premium Dashboard Mockup Graphic */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative mt-16 max-w-5xl mx-auto bg-slate-900 rounded-2xl p-3 shadow-2xl border border-slate-800"
          >
            <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-r from-slate-800 to-transparent rounded-t-2xl pointer-events-none" />
            <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 aspect-[16/10] flex flex-col">
              {/* Window chrome */}
              <div className="h-10 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-xs font-mono text-slate-500 bg-slate-950/50 px-6 py-0.5 rounded border border-slate-800">
                  voltsolar.com/installer/dashboard
                </div>
                <div className="w-16" />
              </div>
              
              {/* Fake dashboard content */}
              <div className="flex-1 grid grid-cols-5 text-left p-6 gap-6 font-sans">
                {/* Mock sidebar */}
                <div className="col-span-1 space-y-4 border-r border-slate-800/60 pr-4">
                  <div className="h-8 bg-slate-800/40 rounded-lg w-full flex items-center px-2">
                    <div className="w-4 h-4 rounded bg-[#156DB7] mr-2" />
                    <div className="w-16 h-3 bg-slate-700/60 rounded" />
                  </div>
                  <div className="space-y-2 pl-2">
                    <div className="w-20 h-2 bg-slate-800 rounded" />
                    <div className="w-16 h-2 bg-slate-800 rounded" />
                    <div className="w-24 h-2 bg-slate-800 rounded" />
                  </div>
                </div>

                {/* Mock body */}
                <div className="col-span-4 space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="w-36 h-4 bg-slate-700/80 rounded" />
                      <div className="w-24 h-2 bg-slate-800 rounded mt-2" />
                    </div>
                    <div className="w-24 h-8 bg-gradient-to-r from-[#156DB7] to-[#0F5288] rounded-lg" />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                      <div className="w-12 h-2 bg-slate-500/60 rounded" />
                      <div className="w-20 h-5 bg-white/90 rounded" />
                    </div>
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                      <div className="w-12 h-2 bg-slate-500/60 rounded" />
                      <div className="w-24 h-5 bg-white/90 rounded" />
                    </div>
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                      <div className="w-16 h-2 bg-slate-500/60 rounded" />
                      <div className="w-16 h-5 bg-white/90 rounded" />
                    </div>
                  </div>

                  {/* Calculations breakdown chart mockup */}
                  <div className="p-4 bg-slate-900/60 border border-slate-800/60 rounded-xl space-y-4">
                    <div className="flex justify-between">
                      <div className="w-48 h-3 bg-slate-700/60 rounded" />
                      <div className="w-12 h-3 bg-slate-800 rounded" />
                    </div>
                    <div className="h-28 bg-slate-950 rounded border border-slate-900 flex items-end justify-between p-3">
                      <div className="w-8 bg-[#156DB7]/40 rounded-t h-[40%]" />
                      <div className="w-8 bg-[#156DB7]/60 rounded-t h-[60%]" />
                      <div className="w-8 bg-[#156DB7] rounded-t h-[90%]" />
                      <div className="w-8 bg-[#69BD45]/50 rounded-t h-[50%]" />
                      <div className="w-8 bg-[#69BD45] rounded-t h-[75%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl tracking-tight">
              Engineered for Speed, Scaled for Safety
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Stop relying on fragmented spreadsheets and unformatted notes. VoltSolar consolidates solar calculations into one unified installer workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 bg-slate-50 rounded-2xl hover:bg-slate-100/80 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-[#156DB7]/10 flex items-center justify-center text-[#156DB7] mb-6">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Load Calculation</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Add and customize appliance quantities, run-times, and surge indexes. Determine total connected and peak starting loads accurately.
              </p>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl hover:bg-slate-100/80 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-[#69BD45]/10 flex items-center justify-center text-[#69BD45] mb-6">
                <Battery className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Battery Sizing</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Size battery capacity based on daily usage and backup hour metrics. Supports Lithium, AGM, Gel, and Tubular Deep Cycle parameters.
              </p>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl hover:bg-slate-100/80 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-[#7B4AA8]/10 flex items-center justify-center text-[#7B4AA8] mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Solar Panel Grid Sizing</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Automate PV array size and config calculations using 450W to 650W panels. Optimize layout grids for selected system voltages.
              </p>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl hover:bg-slate-100/80 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Inverter Matching</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Receive instant sizing matching (kVA) recommendations complete with continuous load clearances and startup safety buffer reasons.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl tracking-tight">
              Simple 5-Step System Design
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Design, optimize, and present premium residential solar architectures in under ten minutes.
            </p>
          </div>

          <div className="relative">
            {/* Visual connector line for steps */}
            <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-slate-200 z-0" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 relative z-10">
              <div className="text-center px-4">
                <div className="w-12 h-12 rounded-full bg-[#123A63] text-white flex items-center justify-center font-bold text-lg mx-auto mb-6 shadow-md shadow-[#123A63]/10">
                  1
                </div>
                <h3 className="font-semibold text-slate-950 mb-2">Create Project</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter name, location, contact, and system profile settings.
                </p>
              </div>

              <div className="text-center px-4">
                <div className="w-12 h-12 rounded-full bg-[#156DB7] text-white flex items-center justify-center font-bold text-lg mx-auto mb-6 shadow-md shadow-[#156DB7]/10">
                  2
                </div>
                <h3 className="font-semibold text-slate-950 mb-2">Add Appliances</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Select and edit lighting, kitchen, and motor ratings.
                </p>
              </div>

              <div className="text-center px-4">
                <div className="w-12 h-12 rounded-full bg-[#69BD45] text-white flex items-center justify-center font-bold text-lg mx-auto mb-6 shadow-md shadow-[#69BD45]/10">
                  3
                </div>
                <h3 className="font-semibold text-slate-950 mb-2">Set Backup Hours</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Choose run-times and preferred battery cell chemistries.
                </p>
              </div>

              <div className="text-center px-4">
                <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-lg mx-auto mb-6 shadow-md shadow-amber-500/10">
                  4
                </div>
                <h3 className="font-semibold text-slate-950 mb-2">Generate Design</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Calculators compile and match system equipment sizes.
                </p>
              </div>

              <div className="text-center px-4">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg mx-auto mb-6 shadow-md shadow-emerald-600/10">
                  5
                </div>
                <h3 className="font-semibold text-slate-950 mb-2">Save Project</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Archive to your dashboard, ready for quick duplication.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl tracking-tight">
              Straightforward, Scalable Pricing
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Get access to premium calculation engines for free while we build out enterprise quotation exports.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-all duration-200">
              <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase text-[#123A63]">Starter Plan</h3>
                <div className="flex items-baseline mt-4">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-900">$0</span>
                  <span className="text-slate-500 text-sm ml-2">/ free forever</span>
                </div>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  Perfect for independent installers getting started with digital solar layouts.
                </p>
                <ul className="mt-6 space-y-3.5">
                  <li className="flex items-center text-xs text-slate-700">
                    <ShieldCheck className="w-4.5 h-4.5 text-[#69BD45] mr-2" />
                    <span>Unlimited design runs</span>
                  </li>
                  <li className="flex items-center text-xs text-slate-700">
                    <ShieldCheck className="w-4.5 h-4.5 text-[#69BD45] mr-2" />
                    <span>25+ standard appliances list</span>
                  </li>
                  <li className="flex items-center text-xs text-slate-700">
                    <ShieldCheck className="w-4.5 h-4.5 text-[#69BD45] mr-2" />
                    <span>Instant solar & battery sizing</span>
                  </li>
                </ul>
              </div>
              <button 
                id="pricing-starter"
                onClick={onGetStarted} 
                className="mt-8 w-full py-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-xl transition-all"
              >
                Start Designing Free
              </button>
            </div>

            {/* Professional */}
            <div className="bg-gradient-to-b from-[#123A63] to-[#0A2540] text-white rounded-2xl p-8 border border-slate-800 flex flex-col justify-between relative shadow-xl transform lg:-translate-y-2">
              <div className="absolute top-4 right-4 bg-gradient-to-r from-[#156DB7] to-[#69BD45] text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full text-white">
                Popular
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase text-[#156DB7]">Professional</h3>
                <div className="flex items-baseline mt-4">
                  <span className="text-4xl font-extrabold tracking-tight">$49</span>
                  <span className="text-slate-400 text-sm ml-2">/ month</span>
                </div>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                  Elevate client interaction with design proposal compilation.
                </p>
                <ul className="mt-6 space-y-3.5">
                  <li className="flex items-center text-xs text-slate-200">
                    <ShieldCheck className="w-4.5 h-4.5 text-[#69BD45] mr-2" />
                    <span>Everything in Starter</span>
                  </li>
                  <li className="flex items-center text-xs text-slate-200">
                    <ShieldCheck className="w-4.5 h-4.5 text-[#69BD45] mr-2" />
                    <span className="font-semibold text-amber-400">[COMING SOON]</span>
                    <span className="ml-1">Client PDF Reports</span>
                  </li>
                  <li className="flex items-center text-xs text-slate-200">
                    <ShieldCheck className="w-4.5 h-4.5 text-[#69BD45] mr-2" />
                    <span className="font-semibold text-amber-400">[COMING SOON]</span>
                    <span className="ml-1">Bill of Materials compiler</span>
                  </li>
                </ul>
              </div>
              <button 
                id="pricing-pro"
                onClick={onGetStarted} 
                className="mt-8 w-full py-3 bg-[#156DB7] hover:bg-[#0F5288] text-white font-semibold rounded-xl transition-all shadow-md shadow-[#156DB7]/10"
              >
                Join Waitlist
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-all duration-200">
              <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase text-[#7B4AA8]">Enterprise</h3>
                <div className="flex items-baseline mt-4">
                  <span className="text-4xl font-extrabold tracking-tight">Custom</span>
                </div>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  Engineered for national installation networks and volume sales teams.
                </p>
                <ul className="mt-6 space-y-3.5">
                  <li className="flex items-center text-xs text-slate-700">
                    <ShieldCheck className="w-4.5 h-4.5 text-[#69BD45] mr-2" />
                    <span>Collaborative design workspaces</span>
                  </li>
                  <li className="flex items-center text-xs text-slate-700">
                    <ShieldCheck className="w-4.5 h-4.5 text-[#69BD45] mr-2" />
                    <span className="font-semibold text-amber-400">[COMING SOON]</span>
                    <span className="ml-1">Custom logo PDF branding</span>
                  </li>
                  <li className="flex items-center text-xs text-slate-700">
                    <ShieldCheck className="w-4.5 h-4.5 text-[#69BD45] mr-2" />
                    <span>API data integration endpoints</span>
                  </li>
                </ul>
              </div>
              <button 
                id="pricing-enterprise"
                onClick={onGetStarted} 
                className="mt-8 w-full py-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-xl transition-all"
              >
                Talk to Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-slate-600">
              Understand our sizing algorithms and calculation benchmarks.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all duration-200"
              >
                <button
                  id={`faq-btn-${idx}`}
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between font-semibold text-slate-900 hover:text-[#156DB7]"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${activeFaq === idx ? 'transform rotate-180 text-[#156DB7]' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {activeFaq === idx && (
                    <motion.div
                      id={`faq-answer-${idx}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
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

      {/* Footer */}
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
            <p className="text-xs text-slate-400 leading-relaxed">
              Precision solar design platform for residential electrical modeling, load calculations, and hardware sizing.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-4">Company</h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-4">Features</h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#" className="hover:text-white transition-colors">Load sizing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Battery configuration</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Inverter matching</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-4">Legal & Support</h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-slate-800 mt-12 pt-8 text-center text-xs">
          <p>© {new Date().getFullYear()} VoltSolar Technologies Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
