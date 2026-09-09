'use client';

import type { ReactNode } from 'react';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';

export default function TermsConditionsPage(): ReactNode {
  return (
    <PageShell>
      <PageHero
        image="/images/contact.png"
        title="Terms & Conditions"
        subtitle="Last updated: July 2026"
      />
      <PageSection>
        <div className="mx-auto max-w-4xl space-y-8 text-lg leading-relaxed text-foreground">
          <h2 className="text-2xl font-bold text-foreground">Acceptance of Terms</h2>
          <p>
            By using our services, you agree to these Terms &amp; Conditions. If you do not agree,
            please do not use our services. These terms apply to all shipments, services, and
            interactions with Lanka Mahal.
          </p>

          <h2 className="text-2xl font-bold text-foreground">Shipment Booking</h2>
          <p>
            When booking a shipment, you agree to provide accurate and complete information about the
            contents, value, and destination of your parcel. Inaccurate information may result in
            delays, additional charges, or confiscation.
          </p>

          <h2 className="text-2xl font-bold text-foreground">Prohibited Items</h2>
          <p>
            You may not ship items that are prohibited by law or our policies. This includes but is
            not limited to hazardous materials, illegal substances, weapons, currency, and perishable
            goods. Refer to our Prohibited Items page for the full list.
          </p>

          <h2 className="text-2xl font-bold text-foreground">Liability</h2>
          <p>
            Our liability for loss, damage, or delay is limited as per the terms of carriage. We
            recommend purchasing insurance for high-value shipments. We are not liable for delays
            caused by customs, weather, or events beyond our control.
          </p>

          <h2 className="text-2xl font-bold text-foreground">Payment</h2>
          <p>
            All charges must be paid in full before shipment processing. Rates are subject to change
            without notice. Fuel surcharges and other applicable fees may apply.
          </p>

          <h2 className="text-2xl font-bold text-foreground">Customs Clearance</h2>
          <p>
            The receiver is responsible for all customs duties, taxes, and import clearance at the
            destination. We provide documentation support but are not liable for customs decisions or
            delays.
          </p>

          <h2 className="text-2xl font-bold text-foreground">Governing Law</h2>
          <p>
            These terms are governed by the laws of India. Any disputes shall be resolved in the
            courts of Mumbai, India.
          </p>
        </div>
      </PageSection>
    </PageShell>
  );
}
