'use client';

import Image from 'next/image';

import type { ReactNode } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';

export default function PrivacyPolicyPage(): ReactNode {
  const config = useTenantConfig();
  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden min-h-[400px] md:min-h-[500px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <Image src="/images/contact.webp" alt="" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-[#1a1a2e]/70" />
          
        </div>
        <div className="relative z-10 px-5 sm:px-8 md:px-16 lg:px-24 w-full">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.08] text-white">
            Privacy Policy
          </h1>
          <p className="text-base text-white/65 max-w-md mt-4">Last updated: July 2026</p>
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24 space-y-8 text-lg text-foreground leading-relaxed">
        <h2 className="text-2xl font-bold text-foreground">Information We Collect</h2>
        <p>
          We collect personal information you provide when using our services, including your name,
          address, phone number, email address, and shipment details. This information is necessary
          to process and deliver your shipments.
        </p>

        <h2 className="text-2xl font-bold text-foreground">How We Use Your Information</h2>
        <p>
          Your information is used solely for processing shipments, providing tracking updates,
          communicating with you about your shipments, and improving our services. We do not sell
          your personal data to third parties.
        </p>

        <h2 className="text-2xl font-bold text-foreground">Data Sharing</h2>
        <p>
          We may share your information with carriers, customs authorities, and regulatory bodies as
          necessary for the processing and delivery of your shipments. These third parties are bound
          by confidentiality agreements.
        </p>

        <h2 className="text-2xl font-bold text-foreground">Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your personal information from
          unauthorised access, alteration, disclosure, or destruction.
        </p>

        <h2 className="text-2xl font-bold text-foreground">Your Rights</h2>
        <p>
          You have the right to access, correct, or delete your personal data. You may also request
          a copy of the data we hold about you. Contact our support team to exercise these rights.
        </p>

        <h2 className="text-2xl font-bold text-foreground">Cookies</h2>
        <p>
          Our website uses cookies to improve your browsing experience and analyse traffic. You can
          control cookie preferences through your browser settings.
        </p>

        <h2 className="text-2xl font-bold text-foreground">Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at{' '}
          {config.contact.email} or call {config.contact.phone}.
        </p>
      </section>
    </div>
  );
}
