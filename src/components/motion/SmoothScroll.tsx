import React, { useEffect, useState } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';

function LenisHashLinks() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const id = anchor.getAttribute('href')?.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -72 });
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [lenis]);

  return null;
}

export const SmoothScroll: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setEnabled(!mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ lerp: 0.09, duration: 1.1, smoothWheel: true }}>
      <LenisHashLinks />
      {children}
    </ReactLenis>
  );
};
