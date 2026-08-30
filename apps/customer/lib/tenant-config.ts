export interface TenantCopy {
  name: string;
  shortName: string;
  title: string;
  tagline: string;
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
}

export const tenantConfig: TenantCopy = {
  name: 'Gajan Traders',
  shortName: 'GT',
  title: 'Gajan Traders — International Courier',
  tagline: 'Fast, Secure & Worldwide Delivery',
  originCountry: 'India',
  originBlurb: "India's trusted international courier",
  region: 'South Asia',
  stats: {
    countries: '220+',
  },
  contact: {
    phone: '+91 98765 43210',
    phoneHref: 'tel:+919876543210',
    email: 'support@gajantraders.com',
    city: 'Mumbai, India',
  },
  offices: [
    {
      name: 'Head Office',
      address: '137/70, L.D.G Road, Little Mount, Saidapet, Chennai - 600 015',
      hours: 'Mon–Sat, 9 AM – 9 PM',
      phones: '7200158309 / 90033 67790',
    },
    {
      name: 'Annai Eximm Branch',
      address: '104/246, Adam Sahib Street, Royapuram, Chennai - 600 013',
      hours: 'Mon–Sat, 9 AM – 8 PM',
      phones: '7708152719 / 95008 11847',
    },
  ],
  hero: {
    badge: 'Global Shipping Made Simple',
    headline: ['Send your parcel anywhere', 'in the world'],
    description:
      'Pickup within 3 km of our offices, real-time tracking, and customs clearance for shipments from India to 220+ destinations. Ship with confidence.',
    ctaTrack: 'Send a Parcel',
    trust: 'Trusted by exporters, students & NRIs since 2016',
  },
  howItWorks: {
    title: 'How to Send a Parcel Abroad in 4 Simple Steps',
    subtitle: 'International shipping from India has never been easier.',
  },
  services: {
    title: 'Quick Services',
    subtitle: 'Track, quote, or schedule a pickup near you.',
  },
  about: {
    headline: 'A real courier service, not a software platform.',
    body: 'Two branches in Chennai, real staff, real handshakes. Walk in with a parcel — we handle the rest: packing, customs, and delivery to 220+ countries. From doorstep pickup near our offices to real-time tracking and on-time delivery, we help businesses and individuals ship with confidence worldwide.',
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
  currency: {
    code: 'INR',
    symbol: '₹',
    locale: 'en-IN',
  },
  phone: {
    prefix: '+91',
    countryCode: '91',
    digits: 10,
    placeholder: '+91 9876543210',
  },
  postalCode: {
    label: 'PIN Code',
    pattern: /^\d{6}$/,
    digits: 6,
  },
};
