import React from 'react';
import { PublicChrome, PublicPage, PublicNavigateOptions } from '../../components/PublicChrome';
import { FadeUp } from '../../components/motion/FadeUp';
import { AccentBar, BlobField } from '../../components/landing/SectionDecor';

interface LegalPageProps {
  isAuthenticated?: boolean;
  onNavigate: (page: PublicPage, options?: PublicNavigateOptions) => void;
  onGetStarted: () => void;
  onLogin: () => void;
  onEnterApp?: () => void;
}

export const TermsPage: React.FC<LegalPageProps> = ({
  isAuthenticated,
  onNavigate,
  onGetStarted,
  onLogin,
  onEnterApp
}) => (
  <PublicChrome
    activePage="terms"
    isAuthenticated={isAuthenticated}
    onNavigate={onNavigate}
    onGetStarted={onGetStarted}
    onLogin={onLogin}
    onEnterApp={onEnterApp}
  >
    <section className="relative py-16 sm:py-20 bg-white border-b border-slate-100 overflow-hidden">
      <BlobField variant="soft" className="opacity-40" />
      <div className="relative max-w-3xl mx-auto px-6">
        <FadeUp>
          <p className="text-sm font-semibold text-[#156DB7] mb-3">Legal</p>
          <AccentBar className="mb-4" />
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#123A63]">Terms of Use</h1>
          <p className="mt-3 text-sm text-slate-500">Last updated: July 14, 2026</p>
        </FadeUp>

        <FadeUp delay={0.05} className="mt-10 space-y-6 text-base text-slate-700 leading-relaxed">
          <p>By accessing VoltSolar, you agree to these terms. If you do not agree, do not use the service.</p>
          <div>
            <h2 className="text-lg font-bold text-[#123A63] mb-2">The service</h2>
            <p>
              VoltSolar provides software tools that help size and document photovoltaic designs. Outputs are decision
              support for professionals. You remain responsible for verifying designs, complying with local codes, and
              obtaining required engineering stamps for installed systems.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#123A63] mb-2">Accounts</h2>
            <p>
              You must provide accurate registration information and keep credentials confidential. You are responsible
              for activity under your account.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#123A63] mb-2">Acceptable use</h2>
            <p>
              Do not misuse the platform, attempt unauthorized access, disrupt service, or use VoltSolar for unlawful
              purposes. We may suspend accounts that violate these terms.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#123A63] mb-2">Early access and pricing</h2>
            <p>
              Features and pricing may change during early access. Paid plans, if offered later, will be described
              clearly before purchase. Current free access does not guarantee permanent free availability of every
              feature.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#123A63] mb-2">Disclaimer</h2>
            <p>
              The service is provided &quot;as is&quot; without warranties of merchantability, fitness for a particular purpose,
              or non-infringement, to the fullest extent permitted by law. We are not liable for installation outcomes,
              equipment selection decisions, or consequential damages arising from use of design outputs.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#123A63] mb-2">Contact</h2>
            <p>
              Questions about these terms:{' '}
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="font-semibold text-[#156DB7] hover:underline"
              >
                Contact VoltSolar
              </button>
              .
            </p>
          </div>
        </FadeUp>
      </div>
    </section>
  </PublicChrome>
);
