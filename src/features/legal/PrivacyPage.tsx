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

export const PrivacyPage: React.FC<LegalPageProps> = ({
  isAuthenticated,
  onNavigate,
  onGetStarted,
  onLogin,
  onEnterApp
}) => (
  <PublicChrome
    activePage="privacy"
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
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#123A63]">Privacy Policy</h1>
          <p className="mt-3 text-sm text-slate-500">Last updated: July 14, 2026</p>
        </FadeUp>

        <FadeUp delay={0.05} className="mt-10 space-y-6 text-base text-slate-700 leading-relaxed">
          <p>
            VoltSolar (&quot;we&quot;, &quot;us&quot;) provides solar design software and related services. This policy explains what
            information we collect and how we use it.
          </p>
          <div>
            <h2 className="text-lg font-bold text-[#123A63] mb-2">Information we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account details such as name, company, email, and phone when you register.</li>
              <li>Project and design data you enter in the platform.</li>
              <li>Contact form submissions, including inquiry details you send us.</li>
              <li>Basic technical logs needed to operate and secure the service.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#123A63] mb-2">How we use information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide, maintain, and improve VoltSolar.</li>
              <li>To respond to support and sales inquiries.</li>
              <li>To secure accounts and prevent abuse.</li>
              <li>To communicate important service updates.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#123A63] mb-2">Sharing</h2>
            <p>
              We do not sell personal data. We may use trusted processors (such as hosting, authentication, and email
              delivery providers) solely to operate the product. We may disclose information if required by law.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#123A63] mb-2">Data retention and security</h2>
            <p>
              We retain account and project data while your account remains active, and contact inquiries as needed for
              business records. We use reasonable technical and organizational safeguards, but no system is perfectly
              secure.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#123A63] mb-2">Your choices</h2>
            <p>
              You may update profile details in-app. To request account deletion or a copy of your data, contact us
              through the Contact page. We will respond within a reasonable period.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#123A63] mb-2">Contact</h2>
            <p>
              Privacy questions:{' '}
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
