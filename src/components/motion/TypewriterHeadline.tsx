import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

interface TypewriterHeadlineProps {
  phrases: [string, string, string];
  className?: string;
  charMs?: number;
  pauseMs?: number;
  as?: 'h1' | 'h2' | 'p';
}

export const TypewriterHeadline: React.FC<TypewriterHeadlineProps> = ({
  phrases,
  className,
  charMs = 80,
  pauseMs = 2000,
  as: Tag = 'h1'
}) => {
  const reduce = useReducedMotion();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [display, setDisplay] = useState(reduce ? phrases[0] : '');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduce) {
      setDisplay(phrases[0]);
      return;
    }

    const full = phrases[phraseIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (!deleting && display === full) {
      timer = setTimeout(() => setDeleting(true), pauseMs);
    } else if (deleting && display === '') {
      setDeleting(false);
      setPhraseIndex(i => (i + 1) % phrases.length);
    } else if (deleting) {
      timer = setTimeout(() => setDisplay(full.slice(0, display.length - 1)), charMs / 1.6);
    } else {
      timer = setTimeout(() => setDisplay(full.slice(0, display.length + 1)), charMs);
    }

    return () => clearTimeout(timer);
  }, [display, deleting, phraseIndex, phrases, charMs, pauseMs, reduce]);

  return (
    <Tag className={className} aria-live="polite">
      <span>{display}</span>
      {!reduce ? (
        <span
          className="inline-block w-[0.08em] h-[0.9em] ml-1 align-[-0.08em] bg-white/90 animate-type-caret"
          aria-hidden
        />
      ) : null}
    </Tag>
  );
};
