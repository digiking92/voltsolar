import React from 'react';

/** Soft brand aurora: navy/teal field with lime orb glows. */
export const AuroraBackground: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className = '',
  children
}) => {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#123A63] via-[#156DB7] to-[#0F5288]" />
      <div
        className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[#69BD45]/35 blur-3xl animate-aurora-a"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-[#69BD45]/20 blur-3xl animate-aurora-b"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-white/15 blur-3xl animate-aurora-c"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
