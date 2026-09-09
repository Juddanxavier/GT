'use client';

import type { ReactNode } from 'react';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';
import { useTenantConfig } from '@/lib/use-tenant-config';

export default function PrivacyPolicyPage(): ReactNode {
  const config = useTenantConfig();
  return (
    <PageShell>
      <PageHero
        image="/images/contact.png"
        title="Privacy Policy"
        subtitle="Last updated: July 2026"
      />
      <PageSection>
        <div className="mx-auto max-w-4xl space-y-8 text-lg leading-relaxed text-foreground">
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
        </div>
      </PageSection>
    </PageShell>
  );
}
