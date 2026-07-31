export type TenantTheme = 'amber';

export interface TenantCopy {
  name: string;
  shortName: string;
  title: string;
  tagline: string;
  theme: TenantTheme;
  originCountry: string;
  originBlurb: string;
  region: string;
  stats: {
    countries: string;
  };
  hero: {
    badge: string;
    headline: string[];
    description: string;
    ctaTrack: string;
    ctaQuote: string;
    trust: string;
  };
  howItWorks: {
    title: string;
    subtitle: string;
  };
  services: {
    title: string;
    subtitle: string;
  };
  about: {
    headline: string;
    body: string;
    cta: string;
  };
  cta: {
    headline: string;
    subtitle: string;
    button: string;
  };
  testimonials: Array<{
    name: string;
    role: string;
    text: string;
  }>;
}

export const tenantConfig: TenantCopy = {
  name: 'Lanka Mahal',
  shortName: 'LM',
  title: 'Lanka Mahal — International Courier',
  tagline: 'Reliable Shipping from Sri Lanka to the World',
  theme: 'amber',
  originCountry: 'Sri Lanka',
  originBlurb: "Sri Lanka's trusted international courier",
  region: 'South Asia',
  stats: {
    countries: '200+',
  },
  hero: {
    badge: 'International Courier Services — Sri Lanka',
    headline: ['Ship from Sri Lanka', 'to Anywhere in the World'],
    description:
      'Lanka Mahal ships parcels from Sri Lanka to 200+ countries with door-to-door pickup, real-time tracking, and customs clearance support.',
    ctaTrack: 'Track Your Shipment',
    ctaQuote: 'Get a Quote',
    trust: 'Serving exporters, students & Sri Lankans abroad since 2015.',
  },
  howItWorks: {
    title: 'How to Send a Parcel Abroad in 4 Simple Steps',
    subtitle: 'International shipping from Sri Lanka has never been easier.',
  },
  services: {
    title: 'Quick Services',
    subtitle: 'Track, quote, or schedule a pickup in under a minute.',
  },
  about: {
    headline: 'Your trusted logistics partner, delivering across 200+ countries.',
    body: 'From door-to-door pickup to real-time tracking and on-time delivery, we help businesses and individuals ship with confidence worldwide.',
    cta: 'Learn About Us',
  },
  cta: {
    headline: 'Ready to Ship Without Borders?',
    subtitle: 'Track, quote, and manage every shipment in one place.',
    button: 'Get Started Today',
  },
  testimonials: [
    {
      name: 'Nimal P.',
      role: 'Frequent Shipper',
      text: 'Excellent service! My package reached the UK in just 4 days. The tracking was accurate and the customer support was very helpful.',
    },
    {
      name: 'Saman K.',
      role: 'Tea Exporter',
      text: 'We ship our Ceylon tea samples to buyers worldwide. Lanka Mahal has been reliable, affordable, and their online tracking is seamless.',
    },
    {
      name: 'Dilani M.',
      role: 'Student in Australia',
      text: 'My parents send essentials from Colombo every month. Always fresh, always on time. Lanka Mahal treats packages like their own.',
    },
    {
      name: 'Thusitha R.',
      role: 'Online Seller',
      text: 'Best courier service for sending gifts to family abroad. Always on time, well-packed, and the staff is courteous.',
    },
    {
      name: 'Anura T.',
      role: 'E-commerce Seller',
      text: 'Switched from DHL to Lanka Mahal for my Shopify orders. Saved 30% on shipping and my customers get their packages faster.',
    },
    {
      name: 'Kumari L.',
      role: 'Garment Exporter',
      text: 'Bulk shipments to Europe arrive without a single damaged piece. Their packaging standards are top-notch.',
    },
    {
      name: 'Rohan D.',
      role: 'Electronics Retailer',
      text: 'Fragile items like electronics need careful handling. Lanka Mahal double-boxes everything and nothing has arrived broken yet.',
    },
    {
      name: 'Chaminda B.',
      role: 'Healthcare Exporter',
      text: 'We ship sensitive medical supplies. Lanka Mahal handles customs clearance smoothly and maintains cold chain integrity.',
    },
    {
      name: 'Priyanka J.',
      role: 'Small Business Owner',
      text: 'We ship to our international clients regularly. Lanka Mahal has been reliable, affordable, and their online tracking is seamless.',
    },
  ],
};
