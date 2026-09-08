'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { ReactNode } from 'react';

interface PageHeroProps {
  image: string;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
  tall?: boolean;
}

export function PageHero({
  image,
  eyebrow,
  title,
  subtitle,
  children,
  tall = false,
}: PageHeroProps): ReactNode {
  return (
    <section
      className={`relative flex items-center overflow-hidden bg-brand-navy ${
        tall ? 'min-h-[520px] md:min-h-[600px]' : 'min-h-[min(480px,55vh)] md:min-h-[520px]'
      }`}
    >
      <div className="absolute inset-0">
        <Image src={image} alt="" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-brand-navy/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/80 via-brand-navy/30 to-brand-navy/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_80%_20%,rgba(232,98,26,0.1),transparent)]" />
      </div>

      <div className="relative z-10 w-full px-5 pb-16 pt-28 sm:px-8 md:px-12 md:pt-32 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          {eyebrow && (
            <span className="section-eyebrow mb-5 text-white/80">
              <span className="section-eyebrow-line bg-brand-accent" />
              {eyebrow}
            </span>
          )}
          <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/70 md:text-lg">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </motion.div>
      </div>
    </section>
  );
}
