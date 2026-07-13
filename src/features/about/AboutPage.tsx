import React from 'react';
import { ArrowRight, Building2, Cpu, Sun, Zap } from 'lucide-react';
import { PublicChrome, PublicPage } from '../../components/PublicChrome';

interface AboutPageProps {
  isAuthenticated?: boolean;
  onNavigate: (page: PublicPage) => void;
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
  return (
    <PublicChrome
      activePage="about"
      isAuthenticated={isAuthenticated}
      onNavigate={onNavigate}
      onGetStarted={onGetStarted}
      onLogin={onLogin}
      onEnterApp={onEnterApp}
    >
      <section className="relative pt-16 pb-20 overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sm font-semibold text-[#156DB7] mb-3">About Us</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#123A63] leading-tight">
            We design power systems.
            <br />
            <span className="text-slate-800">We build the software that scales them.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-3xl">
            VoltSolar sits at the intersection of field engineering and product craft: a decade of solar,
            industrial electrical, and controls experience, and a design team that ships software, web,
            and mobile products for businesses that need more than a brochure site.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#123A63] tracking-tight">
            Born on the job site. Refined in the product lab.
          </h2>
          <div className="mt-6 space-y-4 text-base text-slate-600 leading-relaxed">
            <p>
              Before VoltSolar was a platform, it was a problem we lived every week: sizing solar correctly
              under time pressure, documenting decisions clients could understand, and keeping juniors from
              publishing unsafe combinations.
            </p>
            <p>
              We had already spent years designing electrical systems for homes and industry, solar arrays,
              distribution, control panels, motor installations, and industrial controls. Building VoltSolar
              was the natural next step: encode that discipline into software other professionals can trust.
            </p>
            <p>
              Today we operate as one practice with two strengths:{' '}
              <strong className="text-slate-800">power and solar engineering</strong> for the built
              environment, and <strong className="text-slate-800">digital product engineering</strong> for
              brands that need purpose-built tools.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#123A63] tracking-tight text-center">
            Three capabilities. One standard of rigor.
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-7">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-5">
                <Sun className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Solar System Design</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Residential rooftops. Commercial facilities. Industrial sites. We design solar systems sized
                to real loads, real autonomy, and real equipment for domestic and industrial sites, with
                documentation suitable for installers, facility managers, and decision-makers.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-7">
              <div className="w-11 h-11 rounded-xl bg-[#156DB7]/10 text-[#156DB7] flex items-center justify-center mb-5">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Power Systems & Industrial Electrical</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Over 10 years designing and supporting power systems, industrial electrical infrastructure,
                electric design and controls, control panels, and electric motor installations. We understand
                plants, not just panels.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-7">
              <div className="w-11 h-11 rounded-xl bg-[#69BD45]/10 text-[#69BD45] flex items-center justify-center mb-5">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Software, Web & Mobile Products</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Our design and engineering team builds software, websites, web apps, and mobile applications
                for businesses across industries, from internal operations tools to customer-facing platforms.
                VoltSolar is proof we ship engineering-grade products.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-xl font-bold text-[#123A63] text-center mb-8">
            Experience you can feel in the details.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700">
            {[
              '10+ years in power systems and industrial electrical design',
              'Solar design for houses, companies, domestic and industrial facilities',
              'Controls, control panels, and electric motor installation expertise',
              'Full-stack product delivery: software · websites · web apps · mobile',
              'Engineering reports aligned to international electrical practice'
            ].map(item => (
              <div key={item} className="flex gap-3 items-start bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <Building2 className="w-4 h-4 text-[#156DB7] mt-0.5 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#123A63] tracking-tight">Clarity first. Then construction.</h2>
          <ol className="mt-8 space-y-5">
            {[
              { t: 'Discover', d: 'Loads, constraints, commercial goals, users.' },
              { t: 'Design', d: 'System architecture or product UX, with decisions written down.' },
              { t: 'Engineer', d: 'Electrical validation or software build with the same intolerance for ambiguity.' },
              { t: 'Deliver', d: 'Commissionable designs or shippable products, with handover your team can own.' }
            ].map((step, i) => (
              <li key={step.t} className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-[#123A63] text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold text-slate-900">{step.t}</p>
                  <p className="text-sm text-slate-600 mt-1">{step.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-20 bg-[#123A63] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Whether you need a solar design or a digital product, start with a conversation.
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="px-7 py-3.5 bg-[#156DB7] hover:bg-[#0F5288] rounded-xl font-semibold inline-flex items-center justify-center gap-2"
            >
              Contact Us
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              className="px-7 py-3.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl font-semibold"
            >
              Explore VoltSolar Software
            </button>
          </div>
        </div>
      </section>
    </PublicChrome>
  );
};
