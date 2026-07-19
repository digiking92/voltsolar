import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { DrawArrow } from './DrawArrow';
import { MagneticButton } from './MagneticButton';

export interface HeroSlide {
  /** Use \\n for intentional breaks. Max 3 lines. */
  headline: string;
  subheadline: string;
  cta: string;
  image?: string;
}

interface HeroRotationProps {
  slides: HeroSlide[];
  intervalMs?: number;
  charMs?: number;
  onPrimaryCta: () => void;
  secondaryCta?: React.ReactNode;
  onSlideChange?: (index: number) => void;
}

function toThreeLines(headline: string): string {
  const lines = headline
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 3);
  return lines.join('\n');
}

export const HeroRotation: React.FC<HeroRotationProps> = ({
  slides,
  intervalMs = 6500,
  charMs = 28,
  onPrimaryCta,
  secondaryCta,
  onSlideChange
}) => {
  const reduceMotion = useReducedMotion();
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const sync = () => setIsCoarsePointer(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  const reduce = !!reduceMotion || isCoarsePointer;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [typed, setTyped] = useState('');
  const [typingDone, setTypingDone] = useState(!!reduce);
  const slide = slides[index] ?? slides[0];
  const fullHeadline = toThreeLines(slide?.headline ?? '');

  useEffect(() => {
    onSlideChange?.(index);
  }, [index, onSlideChange]);


  // Type the current headline; subheadline is not typed
  useEffect(() => {
    if (reduce) {
      setTyped(fullHeadline);
      setTypingDone(true);
      return;
    }

    setTyped('');
    setTypingDone(false);
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      i += 1;
      setTyped(fullHeadline.slice(0, i));
      if (i < fullHeadline.length) {
        timer = setTimeout(tick, charMs);
      } else {
        setTypingDone(true);
      }
    };

    timer = setTimeout(tick, charMs);
    return () => clearTimeout(timer);
  }, [index, fullHeadline, charMs, reduce]);

  // Advance slides only after the headline finishes typing, then wait intervalMs
  useEffect(() => {
    if (reduce || paused || slides.length < 2 || !typingDone) return;
    const timer = window.setTimeout(() => {
      setIndex(i => (i + 1) % slides.length);
    }, intervalMs);
    return () => window.clearTimeout(timer);
  }, [reduce, paused, slides.length, intervalMs, typingDone, index]);

  const typedLines = typed.split('\n');

  return (
    <div
      className="w-full min-w-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={slide.headline}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="min-w-0"
        >
          <p
            className="mx-auto w-full min-w-0 max-w-5xl font-bold tracking-tight text-white drop-shadow-sm text-[clamp(1.2rem,4.5vw,5.625rem)] leading-[1.15] sm:leading-[1.1] lg:leading-[1.05]"
            aria-live="polite"
          >
            {typedLines.map((line, lineIndex) => {
              const isLast = lineIndex === typedLines.length - 1;
              return (
                <span key={`line-${lineIndex}`} className="block">
                  {line}
                  {isLast && !reduce && !typingDone ? (
                    <span
                      className="inline-block w-[0.08em] h-[0.9em] ml-1 align-[-0.08em] bg-white/90 animate-type-caret"
                      aria-hidden
                    />
                  ) : null}
                </span>
              );
            })}
          </p>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="mt-4 px-1 text-base sm:text-lg md:text-xl text-white/95 leading-relaxed max-w-3xl mx-auto"
          >
            {slide.subheadline}
          </motion.p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.cta}
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="w-auto"
          >
            <MagneticButton
              onClick={onPrimaryCta}
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 rounded-xl bg-white text-[#123A63] font-semibold shadow-lg hover:bg-slate-50 transition-colors"
            >
              {slide.cta}
              <DrawArrow className="w-4 h-4" stroke="#123A63" />
            </MagneticButton>
          </motion.div>
        </AnimatePresence>
        {secondaryCta}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2" role="tablist" aria-label="Hero messages">
        {slides.map((item, i) => (
          <button
            key={item.headline}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show message ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === index ? 'w-8 bg-[#69BD45]' : 'w-2 bg-white/45 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
