'use client';

import type { ReactNode } from 'react';
import { HeroSection } from '@/components/sections/hero-section';
import { ServicesSection } from '@/components/sections/services-section';
import { AboutSection } from '@/components/sections/about-section';
import { InfrastructureSection } from '@/components/sections/infrastructure-section';
import { ParallaxStatsSection } from '@/components/sections/parallax-stats-section';
import { FreedomSection } from '@/components/sections/freedom-section';
import { CTAFAQFooterSection } from '@/components/sections/cta-faq-footer';
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
