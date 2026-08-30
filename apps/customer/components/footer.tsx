/** @format */

'use client';

import {
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

export function Footer(): ReactNode {
  const config = useTenantConfig();

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <footer className='relative bg-[#1a1a2e] text-white overflow-hidden'>
      <div className='absolute inset-0'>
        <Image
          src='/images/cargo-bg.webp'
          alt=''
          fill
          sizes='100vw'
          className='object-cover opacity-20'
        />
        <div className='absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#1a1a2e]/95 to-[#1a1a2e]' />
      </div>

      <div className='relative z-10'>
        {/* Hero banner */}
        <div className='relative w-full aspect-[2.5/1] overflow-hidden'>
          <Image
            src='/images/cta.webp'
            alt=''
            fill
            sizes='100vw'
            className='object-cover'
          />
          <div className='absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/90 via-[#1a1a2e]/80 to-[#1a1a2e]/70' />
          <div className='absolute inset-0 flex flex-col items-center justify-center text-center px-6'>
            <h2 className='text-2xl md:text-3xl font-bold tracking-tight mb-3 drop-shadow-lg'>
              Ship <span className='text-[#E8621A]'>Without Borders</span>
            </h2>
            <p className='text-base text-white/80 max-w-xl mb-6 drop-shadow'>
              From India to 200+ countries — fast, secure, and tracked every
              step of the way. Real-time tracking, door-to-door pickup, and
              dedicated support for every shipment.
            </p>
            <div className='flex gap-4'>
              <a
                href='/register'
                className='px-6 py-3 rounded-full bg-[#E8621A] hover:bg-[#C45016] text-white text-base font-semibold transition-colors'>
                Get Started
              </a>
              <a
                href='/#track'
                className='px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-base font-semibold hover:bg-white/20 transition-colors'>
                Track Shipment
              </a>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className='border-b border-white/10'>
          <div className='max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-6'>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              {trustIcons.map((t) => (
                <div
                  key={t.label}
                  className='flex items-center gap-3 justify-center lg:justify-start'>
                  <div className='w-10 h-10 rounded-lg bg-[#E8621A]/10 flex items-center justify-center shrink-0'>
                    <t.icon className='size-5 text-[#E8621A]' />
                  </div>
                  <span className='text-white/85 font-medium'>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main footer */}
        <div className='max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-14'>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10 mb-12'>
            {/* Brand column */}
            <div className='sm:col-span-2'>
              <div className='flex items-center gap-2 mb-4'>
                <span className='text-lg font-bold text-white'>
                  {config.name}
                </span>
              </div>
              <p className='text-white/80 leading-relaxed max-w-xs mb-6'>
                {config.hero.description}
              </p>
              <div className='space-y-3 text-white/80'>
                <div className='flex items-center gap-2.5'>
                  <MapPin size={14} className='text-[#E8621A] shrink-0' />
                  <span>{config.contact.city}</span>
                </div>
                <div className='flex items-center gap-2.5'>
                  <Phone size={14} className='text-[#E8621A] shrink-0' />
                  <a
                    href={config.contact.phoneHref}
                    className='hover:text-[#E8621A] transition-colors'>
                    {config.contact.phone}
                  </a>
                </div>
                <div className='flex items-center gap-2.5'>
                  <Mail size={14} className='text-[#E8621A] shrink-0' />
                  <a
                    href={`mailto:${config.contact.email}`}
                    className='hover:text-[#E8621A] transition-colors'>
                    {config.contact.email}
                  </a>
                </div>
              </div>
            </div>

            {/* Link columns */}
            {footerLinks.map((item) => (
              <div key={item.title}>
                <h3 className='mb-4 text-xs font-semibold uppercase tracking-wider text-white/80'>
                  {item.title}
                </h3>
                <ul className='space-y-3 text-white/80'>
                  {item.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className='hover:text-[#E8621A] transition-colors'>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className='h-px bg-white/10' />

          {/* Bottom bar */}
          <div className='pt-6 flex flex-col sm:flex-row items-center justify-between gap-4'>
            <div className='flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-sm text-white/70'>
              <span>
                &copy; {new Date().getFullYear()} {config.name}. All rights
                reserved.
              </span>
              <span className='hidden sm:inline'>|</span>
              <span className='text-white/70'>
                International Courier Services
              </span>
            </div>

            <button
              type='button'
              onClick={scrollToTop}
              aria-label='Back to top'
              className='w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors ml-1'>
              <ChevronUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
