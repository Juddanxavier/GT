'use client';

import {
  ArrowRight,
  ArrowUpRight,
  ChevronUp,
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  Shield,
  Truck,
} from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { SiteLogo } from '@/components/site-logo';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { images } from '@/lib/images';

const footerLinks = [
  {
    title: 'Company',
    links: [
      { href: '/', label: 'Home' },
      { href: '/about', label: 'About Us' },
      { href: '/branches', label: 'Branches' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Services',
    links: [
      { href: '/air-freight', label: 'Air Freight' },
      { href: '/ocean-freight', label: 'Ocean Freight' },
      { href: '/check-price', label: 'Check Price' },
      { href: '/track', label: 'Track Shipment' },
    ],
  },
  {
    title: 'Tools & Support',
    links: [
      { href: '/pickup', label: 'Schedule Pickup' },
      { href: '/faq', label: 'FAQ' },
      { href: '/claim', label: 'File a Claim' },
      { href: '/prohibited', label: 'Prohibited Items' },
      { href: '/volumetric-calculator', label: 'Volumetric Calculator' },
      { href: '/currency-converter', label: 'Currency Converter' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy-policy', label: 'Privacy Policy' },
      { href: '/terms-conditions', label: 'Terms & Conditions' },
      { href: '/refund-policy', label: 'Refund Policy' },
    ],
  },
];

export function Footer(): ReactNode {
  const config = useTenantConfig();
  const headOffice =
    config.offices.find((office) => /head office/i.test(office.name)) ?? config.offices[0];

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const trustItems = [
    { icon: Truck, label: `Pickup within ${config.pickup.radiusKm} km`, sub: 'Conditions apply' },
    { icon: Shield, label: 'Secure handling', sub: 'Careful packing & transit' },
    { icon: Globe, label: `${config.stats.countries} countries`, sub: 'Worldwide delivery' },
    { icon: Clock, label: 'Live tracking', sub: 'Updates at every stage' },
  ];

  return (
    <footer className="relative overflow-hidden bg-brand-navy text-white">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src={images.ctaAbout}
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.12]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy via-brand-navy/98 to-brand-navy" />
      </div>

      <div className="relative z-10">
        {/* CTA image banner — full viewport width */}
        <div className="relative w-full border-b border-white/10">
          <div className="relative min-h-[360px] w-full lg:min-h-[400px]">
            <Image
              src={images.cta}
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center"
              priority={false}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/95 via-brand-navy/88 to-brand-navy/92 lg:bg-gradient-to-r lg:from-brand-navy/92 lg:via-brand-navy/78 lg:to-brand-navy/65" />
            <div className="relative flex min-h-[360px] w-full flex-col items-center justify-center px-5 py-14 text-center sm:px-8 lg:min-h-[400px] lg:px-12">
              <p className="section-eyebrow mb-3 !text-brand-accent/90 sm:mb-4">
                <span className="section-eyebrow-line !bg-brand-accent" />
                Ready to ship
              </p>
              <h2 className="max-w-3xl text-xl font-bold tracking-tight drop-shadow-lg sm:text-2xl md:text-3xl lg:text-4xl">
                Ship <span className="text-brand-accent">without borders.</span>
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 drop-shadow sm:text-base">
                From {config.originCountry} to {config.stats.countries} destinations — fast, secure, and tracked every
                step of the way. {config.pickup.shortNotice}
              </p>
              <div className="mt-8 grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
                <a href="/register" className="premium-btn w-full justify-center gap-2">
                  Get started <ArrowRight size={14} />
                </a>
                <a
                  href="/track"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  Track shipment
                </a>
                <a
                  href="/check-price"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  Check price
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className="border-b border-white/10">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 md:px-12 lg:px-16">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
              {trustItems.map((t) => (
                <div
                  key={t.label}
                  className="flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.04] p-3 sm:gap-3 sm:p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-accent/15 text-brand-accent">
                    <t.icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/90">{t.label}</p>
                    <p className="mt-0.5 text-xs text-white/50">{t.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main footer */}
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 md:px-12 md:py-14 lg:px-16">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
            {/* Brand + contact */}
            <div className="lg:col-span-4">
              <SiteLogo height={56} className="mb-4" withBackdrop />
              <p className="max-w-sm text-sm leading-relaxed text-white/65">
                {config.about.body}
              </p>

              <div className="mt-6">
                {headOffice && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                    <p className="text-sm font-semibold text-white/90">{headOffice.name}</p>
                    <div className="mt-2 flex items-start gap-2 text-xs text-white/55">
                      <MapPin size={12} className="mt-0.5 shrink-0 text-brand-accent" />
                      <span>{headOffice.address}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-white/55">
                      <Clock size={12} className="shrink-0 text-brand-accent" />
                      <span>{headOffice.hours}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-white/55">
                      <Phone size={12} className="shrink-0 text-brand-accent" />
                      <span>{headOffice.phones}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-2.5 text-sm text-white/70">
                <a
                  href={config.contact.phoneHref}
                  className="flex items-center gap-2.5 transition-colors hover:text-brand-accent"
                >
                  <Phone size={14} className="shrink-0 text-brand-accent" />
                  {config.contact.phone}
                </a>
                <a
                  href={`mailto:${config.contact.email}`}
                  className="flex items-center gap-2.5 transition-colors hover:text-brand-accent"
                >
                  <Mail size={14} className="shrink-0 text-brand-accent" />
                  {config.contact.email}
                </a>
              </div>

              <a
                href="/branches"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent transition-colors hover:text-brand-accent-hover"
              >
                View all branches <ArrowUpRight size={14} />
              </a>
            </div>

            {/* Link columns */}
            <div className="grid grid-cols-2 gap-8 sm:col-span-1 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
              {footerLinks.map((item) => (
                <div key={item.title}>
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                    {item.title}
                  </h3>
                  <ul className="space-y-2.5">
                    {item.links.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          className="text-sm text-white/70 transition-colors hover:text-brand-accent"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 h-px bg-white/10" />

          <div className="flex flex-col items-center justify-between gap-4 pt-6 sm:flex-row">
            <div className="flex flex-col items-center gap-1 text-center text-sm text-white/50 sm:flex-row sm:gap-3 sm:text-left">
              <span>
                &copy; {new Date().getFullYear()} {config.name}. All rights reserved.
              </span>
              <span className="hidden text-white/30 sm:inline" aria-hidden="true">·</span>
              <span>International courier &amp; logistics</span>
            </div>

            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Back to top"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
