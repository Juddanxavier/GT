'use client';

import type { ReactNode } from 'react';

export default function RefundPolicyPage(): ReactNode {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden min-h-[450px] md:min-h-[600px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <img src="/images/contact.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/85 via-[#1a1a2e]/45 to-[#1a1a2e]/15" />
        </div>
        <div className="relative z-10 px-5 sm:px-8 md:px-16 lg:px-24 w-full">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">Refund &amp; Shipping Policy</h1>
          <p className="text-base text-white/75 max-w-md mt-4">Last updated: July 2026</p>
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24 space-y-8 text-lg text-foreground leading-relaxed">
        <h2 className="text-2xl font-bold text-foreground">Shipping Policy</h2>
        <p>We process shipments within 24 hours of booking. Delivery timelines vary by service type and destination. Express air shipments typically arrive in 3–15 days, while ocean freight takes 3–30 days depending on the route.</p>

        <h2 className="text-2xl font-bold text-foreground">Refund Eligibility</h2>
        <p>Refunds are considered on a case-by-case basis. You may be eligible for a refund if your shipment is lost in transit or if we fail to deliver within the committed timeframe (excluding customs delays and force majeure events).</p>

        <h2 className="text-2xl font-bold text-foreground">Lost Shipments</h2>
        <p>If a shipment is confirmed lost, you may file a claim within 30 days of the expected delivery date. Claims are reviewed and processed within 14 business days. Approved refunds are issued to the original payment method.</p>

        <h2 className="text-2xl font-bold text-foreground">Non-Refundable Charges</h2>
        <p>Customs duties, taxes, and inspection fees paid to authorities are non-refundable. Fuel surcharges and administrative fees may also be deducted from refunds where applicable.</p>

        <h2 className="text-2xl font-bold text-foreground">How to Request a Refund</h2>
        <p>To request a refund, contact our support team at support@lankamahal.lk or call +94 77 123 4567. Please provide your tracking number and shipment details for faster processing.</p>

        <h2 className="text-2xl font-bold text-foreground">Cancellation</h2>
        <p>Shipments cancelled before dispatch are eligible for a full refund. Once a shipment is in transit, cancellation is not possible. Please contact us immediately if you need to cancel a booking.</p>
      </section>
    </div>
  );
}
