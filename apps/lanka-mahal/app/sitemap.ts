import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://lankamahal.lk';
  const routes = [
    '',
    '/about',
    '/contact',
    '/branches',
    '/track',
    '/air-freight',
    '/ocean-freight',
    '/faq',
    '/pickup',
    '/prohibited',
    '/volumetric-calculator',
    '/currency-converter',
    '/privacy-policy',
    '/terms-conditions',
    '/refund-policy',
    '/claim',
  ];

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.8,
  }));
}
