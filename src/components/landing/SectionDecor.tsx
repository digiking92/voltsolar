import React from 'react';

interface BlobFieldProps {
  variant?: 'soft' | 'mesh' | 'dots';
  className?: string;
}

/** Decorative background patterns using brand colors only. */
export const BlobField: React.FC<BlobFieldProps> = ({ variant = 'soft', className = '' }) => {
  if (variant === 'dots') {
    return (
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 opacity-[0.35] pattern-dots ${className}`}
      />
    );
  }

  if (variant === 'mesh') {
    return (
      <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
        <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-[#156DB7]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#69BD45]/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 h-40 w-40 rounded-full bg-[#123A63]/8 blur-2xl" />
        <div className="absolute inset-0 pattern-grid opacity-40" />
      </div>
    );
  }

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg className="absolute -top-10 -left-10 w-[420px] h-[420px] opacity-60" viewBox="0 0 400 400" fill="none">
        <path
          d="M60 180C40 80 140 40 210 70C290 104 330 40 360 110C392 186 320 230 300 290C276 360 180 370 120 320C60 270 80 280 60 180Z"
          fill="#156DB7"
          fillOpacity="0.12"
        />
        <path
          d="M90 220C80 140 160 120 210 150C270 186 300 140 330 190C360 240 300 280 260 310C210 348 140 340 110 290C88 254 98 280 90 220Z"
          fill="#69BD45"
          fillOpacity="0.14"
        />
      </svg>
      <svg className="absolute -bottom-24 -right-16 w-[380px] h-[380px] opacity-50" viewBox="0 0 400 400" fill="none">
        <path
          d="M80 200C70 110 160 80 230 110C300 140 350 90 370 160C390 230 330 270 290 310C240 360 150 350 110 300C78 260 90 270 80 200Z"
          fill="#123A63"
          fillOpacity="0.1"
        />
      </svg>
    </div>
  );
};

export const AccentBar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    aria-hidden
    className={`inline-block h-1 w-14 rounded-full bg-gradient-to-r from-[#156DB7] to-[#69BD45] ${className}`}
  />
);
