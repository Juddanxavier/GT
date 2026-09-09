import { getHeadOffice, lankaMahalBranches } from './branches-data';

export type TenantTheme = 'amber';

const headOffice = getHeadOffice();

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
  contact: {
    phone: string;
    phoneHref: string;
    email: string;
    city: string;
  };
  offices: Array<{
    name: string;
    address: string;
    hours: string;
    phones: string;
  }>;
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
  currency: {
    code: string;
    symbol: string;
    locale: string;
  };
  phone: {
    prefix: string;
    countryCode: string;
    digits: number;
    placeholder: string;
  };
  postalCode: {
    label: string;
    pattern: RegExp;
    digits: number;
  };
  pickup: {
    radiusKm: number;
    shortNotice: string;
    formNotice: string;
  };
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
  contact: {
    phone: headOffice.phone.split(' / ')[0] ?? '074 030 0976',
    phoneHref: 'tel:+94740300976',
    email: 'info@lankamahal.com',
    city: 'Colombo, Sri Lanka',
  },
  offices: lankaMahalBranches.map((b) => ({
    name: b.name,
    address: b.address,
    hours: b.hours,
    phones: b.phone,
  })),
  hero: {
    badge: 'International Courier Services — Sri Lanka',
    headline: ['Ship from Sri Lanka', 'to Anywhere in the World'],
    description:
      'Pickup within 5 km of our offices (conditions apply), real-time tracking, and customs clearance for shipments from Sri Lanka to 200+ destinations.',
    ctaTrack: 'Track Your Shipment',
    trust: 'Serving exporters, students & Sri Lankans abroad since 2015.',
  },
  howItWorks: {
    title: 'How to Send a Parcel Abroad in 4 Simple Steps',
    subtitle: 'International shipping from Sri Lanka has never been easier.',
  },
  services: {
    title: 'Quick Services',
    subtitle: 'Track, quote, or schedule a pickup near you.',
  },
  about: {
    headline: 'Your trusted logistics partner, delivering across 200+ countries.',
    body:
      'Eight branches across Sri Lanka, real staff, real handshakes. Walk in with a parcel — we handle packing, customs, and delivery worldwide. From doorstep pickup near our offices to real-time tracking, we help businesses and individuals ship with confidence.',
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
  currency: {
    code: 'LKR',
    symbol: 'Rs',
    locale: 'en-LK',
  },
  phone: {
    prefix: '+94',
    countryCode: '94',
    digits: 9,
    placeholder: '+94 77 123 4567',
  },
  postalCode: {
    label: 'Postal Code',
    pattern: /^\d{5}$/,
    digits: 5,
  },
  pickup: {
    radiusKm: 5,
    shortNotice: 'Pickup within 5 km of our offices. Conditions apply.',
    formNotice:
      'Door-to-door pickup is available only within 5 km of the selected office. Requests are subject to confirmation and applicable conditions.',
  },
};
