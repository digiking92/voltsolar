import React from 'react';

const base = {
  width: 28,
  height: 28,
  viewBox: '0 0 48 48',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true as const
};

/** High-contrast brand icons: navy/blue primary, lime used only as bold solid accents. */
export const IconLoad: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...base} className={className}>
    <rect x="6" y="28" width="6" height="14" rx="2" fill="#123A63" opacity="0.35" />
    <rect x="16" y="18" width="6" height="24" rx="2" fill="#156DB7" opacity="0.7" />
    <rect x="26" y="10" width="6" height="32" rx="2" fill="#156DB7" />
    <rect x="36" y="20" width="6" height="22" rx="2" fill="#123A63" />
    <rect x="36" y="20" width="6" height="8" rx="2" fill="#69BD45" />
  </svg>
);

export const IconBattery: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...base} className={className}>
    <rect x="6" y="14" width="32" height="20" rx="4" stroke="#123A63" strokeWidth="2.75" />
    <rect x="38" y="20" width="4" height="8" rx="1.5" fill="#123A63" />
    <rect x="10" y="18" width="18" height="12" rx="2" fill="#156DB7" />
    <rect x="12" y="20" width="8" height="8" rx="1.5" fill="#69BD45" />
  </svg>
);

export const IconInverter: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...base} className={className}>
    <rect x="8" y="8" width="32" height="32" rx="6" stroke="#123A63" strokeWidth="2.75" />
    <path d="M16 30l6-12 5 8 5-10" stroke="#156DB7" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="34" cy="16" r="3" fill="#69BD45" stroke="#123A63" strokeWidth="1" />
  </svg>
);

export const IconPv: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...base} className={className}>
    <rect x="8" y="10" width="32" height="28" rx="3" stroke="#123A63" strokeWidth="2.75" />
    <path d="M8 24h32M24 10v28M8 17h32M8 31h32M16 10v28M32 10v28" stroke="#156DB7" strokeWidth="1.6" />
    <circle cx="38" cy="12" r="4.5" fill="#69BD45" stroke="#123A63" strokeWidth="1.25" />
  </svg>
);

export const IconProtection: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...base} className={className}>
    <path
      d="M24 6l14 6v10c0 9-6.5 14.5-14 17-7.5-2.5-14-8-14-17V12l14-6z"
      stroke="#123A63"
      strokeWidth="2.75"
      fill="#156DB7"
      fillOpacity="0.18"
    />
    <path d="M18 24l4 4 8-9" stroke="#123A63" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 24l4 4 8-9" stroke="#69BD45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconCable: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...base} className={className}>
    <path d="M8 16c8 0 8 16 16 16s8-16 16-16" stroke="#156DB7" strokeWidth="3.25" strokeLinecap="round" />
    <circle cx="8" cy="16" r="4" fill="#123A63" />
    <circle cx="40" cy="16" r="4" fill="#69BD45" stroke="#123A63" strokeWidth="1.25" />
    <path d="M8 32c8 0 8-10 16-10s8 10 16 10" stroke="#123A63" strokeWidth="2.25" opacity="0.55" strokeLinecap="round" />
  </svg>
);

export const IconReport: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...base} className={className}>
    <rect x="10" y="6" width="24" height="36" rx="3" stroke="#123A63" strokeWidth="2.75" fill="#F8FAFC" />
    <path d="M16 16h12M16 22h12M16 28h8" stroke="#156DB7" strokeWidth="2.25" strokeLinecap="round" />
    <circle cx="33" cy="34" r="7.5" fill="#69BD45" stroke="#123A63" strokeWidth="1.5" />
    <path d="M30.5 34l2 2 3.5-4" stroke="#123A63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconDiagram: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="4.5" fill="#69BD45" stroke="#123A63" strokeWidth="1.25" />
    <circle cx="36" cy="12" r="4.5" fill="#156DB7" stroke="#123A63" strokeWidth="1.25" />
    <circle cx="24" cy="36" r="4.5" fill="#123A63" />
    <path d="M15 14l6 18M33 14l-6 18M16 12h16" stroke="#123A63" strokeWidth="2.25" strokeLinecap="round" />
  </svg>
);

export type FeatureIconKey =
  | 'load'
  | 'battery'
  | 'inverter'
  | 'pv'
  | 'protection'
  | 'cable'
  | 'report'
  | 'diagram';

const map = {
  load: IconLoad,
  battery: IconBattery,
  inverter: IconInverter,
  pv: IconPv,
  protection: IconProtection,
  cable: IconCable,
  report: IconReport,
  diagram: IconDiagram
};

export const FeatureIcon: React.FC<{ name: FeatureIconKey; className?: string }> = ({
  name,
  className
}) => {
  const Comp = map[name];
  return <Comp className={className} />;
};
