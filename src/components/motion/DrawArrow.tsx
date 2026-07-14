import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface DrawArrowProps {
  className?: string;
  stroke?: string;
}

/** SVG stroke-draw accent arrow for CTAs and section details. */
export const DrawArrow: React.FC<DrawArrowProps> = ({
  className = 'w-4 h-4',
  stroke = 'currentColor'
}) => {
  const reduce = useReducedMotion();

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <motion.path
        d="M5 12h13M13 6l6 6-6 6"
        stroke={stroke}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0, opacity: 0.35 }}
        whileInView={reduce ? undefined : { pathLength: 1, opacity: 1 }}
        animate={reduce ? { pathLength: 1, opacity: 1 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      />
    </svg>
  );
};
