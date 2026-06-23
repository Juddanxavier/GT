import type { ReactNode } from 'react';
import { getTenantSlug, tenantConfig } from '@/lib/tenant';

export default async function HomePage(): Promise<ReactNode> {
  const slug = await getTenantSlug();
  const config = tenantConfig[slug];

  return (
    <div className="space-y-8">
      <section className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Enter your tracking number to see the latest status of your shipment.
        </p>
      </section>

      <section className="max-w-md mx-auto">
        <form className="flex gap-2">
          <input
            name="tracking"
            type="text"
            placeholder="Enter tracking number"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            Track
          </button>
        </form>
      </section>
    </div>
  );
}
