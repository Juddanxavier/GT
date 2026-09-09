'use client';

import type { ReactNode } from 'react';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';
import { useTenantConfig } from '@/lib/use-tenant-config';

export default function RefundPolicyPage(): ReactNode {
  const config = useTenantConfig();
  return (
    <PageShell>
      <PageHero
        image="/images/contact.png"
        title="Refund & Shipping Policy"
        subtitle="Last updated: July 2026"
      />
      <PageSection>
        <div className="mx-auto max-w-4xl space-y-8 text-lg leading-relaxed text-foreground">
          <h2 className="text-2xl font-bold text-foreground">Shipping Policy</h2>
          <p>
            We process shipments within 24 hours of booking. Delivery timelines vary by service type
            and destination. Express air shipments typically arrive in 3–15 days, while ocean freight
            takes 3–30 days depending on the route.
          </p>

          <h2 className="text-2xl font-bold text-foreground">Refund Eligibility</h2>
          <p>
            Refunds are considered on a case-by-case basis. You may be eligible for a refund if your
            shipment is lost in transit or if we fail to deliver within the committed timeframe
            (excluding customs delays and force majeure events).
          </p>

          <h2 className="text-2xl font-bold text-foreground">Lost Shipments</h2>
          <p>
            If a shipment is confirmed lost, you may file a claim within 30 days of the expected
            delivery date. Claims are reviewed and processed within 14 business days. Approved refunds
            are issued to the original payment method.
          </p>

          <h2 className="text-2xl font-bold text-foreground">Non-Refundable Charges</h2>
          <p>
            Customs duties, taxes, and inspection fees paid to authorities are non-refundable. Fuel
            surcharges and administrative fees may also be deducted from refunds where applicable.
          </p>

          <h2 className="text-2xl font-bold text-foreground">How to Request a Refund</h2>
          <p>
            To request a refund, contact our support team at {config.contact.email} or call{' '}
            {config.contact.phone}. Please provide your tracking number and shipment details for
            faster processing.
          </p>

          <h2 className="text-2xl font-bold text-foreground">Cancellation</h2>
          <p>
            Shipments cancelled before dispatch are eligible for a full refund. Once a shipment is in
            transit, cancellation is not possible. Please contact us immediately if you need to cancel
            a booking.
          </p>
        </div>
      </PageSection>
    </PageShell>
  );
}
