import React, { useEffect } from 'react';
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

/** Desktop-only smooth scroll. Lazy-loaded so mobile never downloads Lenis. */
const DesktopLenis: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ReactLenis root options={{ lerp: 0.09, duration: 1.1, smoothWheel: true }}>
    <LenisHashLinks />
    {children}
  </ReactLenis>
);

export default DesktopLenis;
