import React from 'react';
import { TiltCard } from '../motion/TiltCard';
import { FeatureIcon, FeatureIconKey } from './FeatureIcons';

interface FeatureCardProps {
  icon: FeatureIconKey;
  title: string;
  body: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, body }) => {
  return (
    <TiltCard className="h-full">
      <article className="feature-card-shell group h-full">
        <div className="feature-card-inner h-full p-5">
          <div className="feature-card-icon mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#156DB7]/25 bg-white shadow-sm shadow-[#156DB7]/10">
            <FeatureIcon name={icon} className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-[#123A63] mb-2">{title}</h3>
          <p className="text-sm text-slate-700 leading-relaxed">{body}</p>
        </div>
      </article>
    </TiltCard>
  );
};
