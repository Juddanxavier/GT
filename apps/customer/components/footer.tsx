'use client';

import { ChevronUp, Clock, Globe, Mail, MapPin, Phone, Shield, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';

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
      { href: '/#track', label: 'Track Shipment' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/faq', label: 'FAQ' },
      { href: '/prohibited', label: 'Prohibited Items' },
      { href: '/pickup', label: 'Schedule Pickup' },
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

const trustIcons = [
  { icon: Truck, label: 'Door-to-Door Pickup' },
  { icon: Shield, label: 'Secure Handling' },
  { icon: Globe, label: '200+ Countries' },
  { icon: Clock, label: 'Real-time Tracking' },
];

const socialLinks = [
  {
    href: '#',
    label: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    href: '#',
    label: 'Instagram',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    href: '#',
    label: 'Twitter',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    href: '#',
    label: 'LinkedIn',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
];

export function Footer(): ReactNode {
  const config = useTenantConfig();

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <footer className="relative bg-[#111111] text-white overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920&q=80"
          alt=""
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#111111] via-[#111111]/95 to-[#111111]" />
      </div>

      <div className="relative z-10">
        {/* Hero banner */}
        <div className="relative w-full aspect-[2.5/1] overflow-hidden">
          <img src="/images/cta.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#111111]/90 via-[#111111]/80 to-[#111111]/70" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 drop-shadow-lg">
              Ship <span className="text-[#F94735]">Without Borders</span>
            </h2>
            <p className="text-base text-white/80 max-w-xl mb-6 drop-shadow">
              From India to 200+ countries — fast, secure, and tracked every step of the way.
              Real-time tracking, door-to-door pickup, and dedicated support for every shipment.
            </p>
            <div className="flex gap-4">
              <a
                href="/register"
                className="px-6 py-3 rounded-full bg-[#F94735] hover:bg-[#D83220] text-white text-base font-semibold transition-colors"
              >
                Get Started
              </a>
              <a
                href="/#track"
                className="px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-base font-semibold hover:bg-white/20 transition-colors"
              >
                Track Shipment
              </a>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className="border-b border-white/10">
          <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trustIcons.map((t) => (
                <div
                  key={t.label}
                  className="flex items-center gap-3 justify-center lg:justify-start"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#F94735]/10 flex items-center justify-center shrink-0">
                    <t.icon className="size-5 text-[#F94735]" />
                  </div>
                  <span className="text-white/85 font-medium">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main footer */}
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
            {/* Brand column */}
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#F94735] flex items-center justify-center">
                  <Truck className="size-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">{config.name}</span>
              </div>
              <p className="text-white/80 leading-relaxed max-w-xs mb-6">
                {config.hero.description}
              </p>
              <div className="space-y-3 text-white/80">
                <div className="flex items-center gap-2.5">
                  <MapPin size={14} className="text-[#F94735] shrink-0" />
                  <span>Mumbai, India</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={14} className="text-[#F94735] shrink-0" />
                  <span>+91 98765 43210</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail size={14} className="text-[#F94735] shrink-0" />
                  <span>support@gajantraders.com</span>
                </div>
              </div>
            </div>

            {/* Link columns */}
            {footerLinks.map((item) => (
              <div key={item.title}>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/80">
                  {item.title}
                </h3>
                <ul className="space-y-3 text-white/80">
                  {item.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="hover:text-[#F94735] transition-colors">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="h-px bg-white/10" />

          {/* Bottom bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-sm text-white/70">
              <span>
                &copy; {new Date().getFullYear()} {config.name}. All rights reserved.
              </span>
              <span className="hidden sm:inline">|</span>
              <span className="text-white/70">International Courier Services</span>
            </div>

            <div className="flex items-center gap-2">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-[#D83220] hover:border-[#F94735] hover:text-white transition-colors"
                >
                  {s.icon}
                </a>
              ))}
              <button
                onClick={scrollToTop}
                aria-label="Back to top"
                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors ml-1"
              >
                <ChevronUp size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
