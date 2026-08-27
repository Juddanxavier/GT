'use client';

import type { ReactNode } from 'react';
import { AboutSection } from '@/components/sections/about-section';
import { CTAFAQFooterSection } from '@/components/sections/cta-faq-section';
import { FreedomSection } from '@/components/sections/freedom-section';
import { HeroSection } from '@/components/sections/hero-section';
import { InfrastructureSection } from '@/components/sections/infrastructure-section';
import { ParallaxStatsSection } from '@/components/sections/parallax-stats-section';
import { ServicesSection } from '@/components/sections/services-section';
import { TestimonialsSectionV2 } from '@/components/ui/testimonial-v2';

export function PublicLanding(): ReactNode {
  return (
    <div>
      <HeroSection />
      <ServicesSection />
      <AboutSection />
      <InfrastructureSection />
      <ParallaxStatsSection />
      <FreedomSection />
      <TestimonialsSectionV2 />
      <CTAFAQFooterSection />
    </div>
  );
}
