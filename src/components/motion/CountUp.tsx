import React, { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'motion/react';

interface CountUpProps {
  to: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  to,
  suffix = '',
  prefix = '',
  durationMs = 1400,
  className
}) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [value, setValue] = useState(reduce ? to : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setValue(to);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(to * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, durationMs, reduce]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
};
