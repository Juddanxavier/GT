/** @format */

import { and, eq, type SQL } from 'drizzle-orm';
import { Hono } from 'hono';
import { withCache } from '../cache';
import { db } from '../db';
import { rateCards, shippingRates, tenants } from '../db/schema';
import { COUNTRIES } from '../lib/countries';
import { globalRateLimit } from '../middleware/rate-limit';
import type { TenantVariables } from '../middleware/tenant';

const app = new Hono<{ Variables: TenantVariables }>();

app.get(
  '/countries',
  globalRateLimit({ windowSeconds: 60, maxRequests: 30, keyPrefix: 'check-price' }),
  async (c) => {
    const resolvedTenantId = c.get('tenantId') as string | null;
    const tenantSlug = c.req.query('tenant');

    let tenantId: string | null = resolvedTenantId;
    if (tenantSlug) {
      const [tenant] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.slug, tenantSlug!))
        .limit(1);
      if (!tenant) return c.json({ error: 'Invalid tenant' }, 400);
      tenantId = tenant.id;
    }

    if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

    const activeCountries = await withCache(
      tenantId,
      'check-price:countries',
      () =>
        db
          .selectDistinct({ destinationCountry: rateCards.destinationCountry })
          .from(rateCards)
          .where(and(eq(rateCards.tenantId, tenantId!), eq(rateCards.isActive, true)) as SQL | undefined)
          .orderBy(rateCards.destinationCountry)
          .then((r) => r.map((row) => row.destinationCountry)),
      900,
    );

    const allCountries = COUNTRIES.map((c) => c.name);
    const data = activeCountries.length > 0 ? activeCountries : allCountries;

    return c.json({ data });
  },
);

app.get(
  '/:country',
  globalRateLimit({ windowSeconds: 60, maxRequests: 60, keyPrefix: 'check-price' }),
  async (c) => {
    const country = c.req.param('country');
    if (!country || country.length > 100) {
      return c.json({ error: 'Invalid country name' }, 400);
    }

    const resolvedTenantId = c.get('tenantId') as string | null;
    const tenantSlug = c.req.query('tenant');

    let tenantId: string | null = resolvedTenantId;
    if (tenantSlug) {
      const [tenant] = await db
        .select({ id: tenants.id, currency: tenants.currency })
        .from(tenants)
        .where(eq(tenants.slug, tenantSlug!))
        .limit(1);
      if (!tenant) return c.json({ error: 'Invalid tenant' }, 400);
      tenantId = tenant.id;
    }

    if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

    const decodedCountry = decodeURIComponent(country);

    const cacheKey = `check-price:${decodedCountry}`;

    const data = await withCache(
      tenantId,
      cacheKey,
      async () => {
        const [card] = await db
          .select()
          .from(rateCards)
          .where(
            and(
              eq(rateCards.tenantId, tenantId!),
              eq(rateCards.destinationCountry, decodedCountry),
              eq(rateCards.isActive, true),
            ) as SQL | undefined,
          )
          .limit(1);

        if (!card) return null;

        const rates = await db
          .select()
          .from(shippingRates)
          .where(eq(shippingRates.rateCardId, card.id))
          .orderBy(shippingRates.packageType, shippingRates.serviceType, shippingRates.weightFrom);

        return {
          destinationCountry: card.destinationCountry,
          currency: card.currency,
          updatedAt: card.updatedAt,
          rates,
        };
      },
      900,
    );

    if (!data) return c.json({ error: 'No rates found for this destination' }, 404);

    return c.json({ data });
  },
);

export default app;
