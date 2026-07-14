import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface RevealWordsProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'p';
}

export const RevealWords: React.FC<RevealWordsProps> = ({
  text,
  className,
  as: Tag = 'h1'
}) => {
  const reduce = useReducedMotion();
  const words = text.split(' ');

  if (reduce) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden mr-[0.28em] last:mr-0 align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{
              duration: 0.55,
              delay: 0.12 + i * 0.055,
              ease: [0.22, 1, 0.36, 1]
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
};
