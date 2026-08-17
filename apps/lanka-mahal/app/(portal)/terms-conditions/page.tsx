'use client';

import type { ReactNode } from 'react';

export default function TermsConditionsPage(): ReactNode {
  return (
    <div className="min-h-screen bg-white">
      <section className="w-screen left-[calc(-50vw+50%)] relative overflow-hidden min-h-[450px] md:min-h-[600px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <img src="/images/contact.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e] via-[#1a1a2e]/70 to-transparent" />
        </div>
        <div className="relative z-10 px-8 md:px-16 lg:px-24 w-full">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">Terms &amp; Conditions</h1>
          <p className="text-lg text-white/90 max-w-lg mt-2">Last updated: July 2026</p>
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20 space-y-8 text-lg text-foreground leading-relaxed">
        <h2 className="text-2xl font-bold text-foreground">Acceptance of Terms</h2>
        <p>By using our services, you agree to these Terms &amp; Conditions. If you do not agree, please do not use our services. These terms apply to all shipments, services, and interactions with Lanka Mahal.</p>

        <h2 className="text-2xl font-bold text-foreground">Shipment Booking</h2>
        <p>When booking a shipment, you agree to provide accurate and complete information about the contents, value, and destination of your parcel. Inaccurate information may result in delays, additional charges, or confiscation.</p>

        <h2 className="text-2xl font-bold text-foreground">Prohibited Items</h2>
        <p>You may not ship items that are prohibited by law or our policies. This includes but is not limited to hazardous materials, illegal substances, weapons, currency, and perishable goods. Refer to our Prohibited Items page for the full list.</p>

        <h2 className="text-2xl font-bold text-foreground">Liability</h2>
        <p>Our liability for loss, damage, or delay is limited as per the terms of carriage. We recommend purchasing insurance for high-value shipments. We are not liable for delays caused by customs, weather, or events beyond our control.</p>

        <h2 className="text-2xl font-bold text-foreground">Payment</h2>
        <p>All charges must be paid in full before shipment processing. Rates are subject to change without notice. Fuel surcharges and other applicable fees may apply.</p>

        <h2 className="text-2xl font-bold text-foreground">Customs Clearance</h2>
        <p>The receiver is responsible for all customs duties, taxes, and import clearance at the destination. We provide documentation support but are not liable for customs decisions or delays.</p>

        <h2 className="text-2xl font-bold text-foreground">Governing Law</h2>
        <p>These terms are governed by the laws of Sri Lanka. Any disputes shall be resolved in the courts of Colombo, Sri Lanka.</p>
      </section>
    </div>
  );
}
