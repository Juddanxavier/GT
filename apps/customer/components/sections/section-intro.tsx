'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SectionIntroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  light?: boolean;
  className?: string;
}

export function SectionIntro({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  light = false,
  className = '',
}: SectionIntroProps): ReactNode {
  const centered = align === 'center';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={`${centered ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'} ${className}`}
    >
      <span className={`section-eyebrow ${light ? '!text-white/70' : ''}`}>
        <span className={`section-eyebrow-line ${light ? '!bg-brand-accent' : ''}`} />
        {eyebrow}
      </span>
      <h2
        className={`mt-4 text-3xl font-semibold tracking-tight md:text-4xl ${light ? 'text-white' : 'text-foreground'}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-base leading-relaxed md:text-lg ${light ? 'text-white/60' : 'text-muted'}`}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
