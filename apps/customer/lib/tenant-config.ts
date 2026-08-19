export type TenantTheme = 'emerald';

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
  name: 'Gajan Traders',
  shortName: 'GT',
  title: 'Gajan Traders — International Courier',
  tagline: 'Fast, Secure & Worldwide Delivery',
  theme: 'emerald',
  originCountry: 'India',
  originBlurb: "India's trusted international courier",
  region: 'South Asia',
  stats: {
    countries: '220+',
  },
  hero: {
    badge: 'International Courier Services',
    headline: ['Fast, Secure &', 'Worldwide Delivery'],
    description:
      'Gajan Traders ships parcels from India to 200+ countries with door-to-door pickup, real-time tracking, and customs clearance support.',
    ctaTrack: 'Track Your Shipment',
    trust: 'Serving exporters, students & NRIs across India since 2010.',
  },
  howItWorks: {
    title: 'How to Send a Parcel Abroad in 4 Simple Steps',
    subtitle: 'International shipping from India has never been easier.',
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
      name: 'Rajesh K.',
      role: 'Frequent Shipper',
      text: 'Excellent service! My package reached the UK in just 4 days. The tracking was accurate and the customer support was very helpful.',
    },
    {
      name: 'Priya S.',
      role: 'Small Business Owner',
      text: 'We ship samples to our international clients regularly. Gajan Traders has been reliable, affordable, and their online tracking is seamless.',
    },
    {
      name: 'Amit M.',
      role: 'NRI Customer',
      text: 'Best courier service for sending gifts to family back home. Always on time, well-packed, and the staff is courteous.',
    },
    {
      name: 'Sunita R.',
      role: 'Online Seller',
      text: 'I have been using their services for over a year now. No lost packages, timely pickups, and great rates for bulk shipping.',
    },
    {
      name: 'Vikram T.',
      role: 'E-commerce Seller',
      text: 'Switched from DHL to Gajan Traders for my Shopify orders. Saved 30% on shipping and my customers get their packages faster.',
    },
    {
      name: 'Meena L.',
      role: 'Healthcare Exporter',
      text: 'We ship sensitive medical supplies to clinics across Africa. Gajan Traders handles customs clearance smoothly and maintains cold chain integrity.',
    },
    {
      name: 'Arjun P.',
      role: 'Student in Canada',
      text: 'My parents send home-cooked snacks from Mumbai every month. Always fresh, always on time. Gajan Traders treats packages like their own.',
    },
    {
      name: 'Deepa N.',
      role: 'Textile Business',
      text: 'Bulk shipments to Germany arrive without a single damaged piece. Their packaging standards are top-notch and rates are competitive.',
    },
    {
      name: 'Sanjay B.',
      role: 'Electronics Retailer',
      text: 'Fragile items like electronics need careful handling. Gajan Traders double-boxes everything and nothing has arrived broken yet.',
    },
  ],
};
