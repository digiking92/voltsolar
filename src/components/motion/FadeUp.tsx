import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface FadeUpProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

export const FadeUp: React.FC<FadeUpProps> = ({
  children,
  className,
  delay = 0,
  y = 28
}) => {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};
