import React, { Suspense, lazy, useEffect, useState } from 'react';

const DesktopLenis = lazy(() => import('./DesktopLenis'));

function shouldEnableSmoothScroll(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.matchMedia('(pointer: coarse)').matches) return false;
  if (window.matchMedia('(max-width: 900px)').matches) return false;
  return true;
}

export const SmoothScroll: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => setEnabled(shouldEnableSmoothScroll());
    sync();

    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqPointer = window.matchMedia('(pointer: coarse)');
    const mqWidth = window.matchMedia('(max-width: 900px)');

    mqMotion.addEventListener('change', sync);
    mqPointer.addEventListener('change', sync);
    mqWidth.addEventListener('change', sync);
    return () => {
      mqMotion.removeEventListener('change', sync);
      mqPointer.removeEventListener('change', sync);
      mqWidth.removeEventListener('change', sync);
    };
  }, []);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={<>{children}</>}>
      <DesktopLenis>{children}</DesktopLenis>
    </Suspense>
  );
};
