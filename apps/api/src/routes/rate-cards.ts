/** @format */

import { and, eq, ilike, type SQL, sql } from 'drizzle-orm';
import { COUNTRIES } from '../lib/countries';
import { Hono } from 'hono';
import { cacheDel, cacheDelPattern, withCache } from '../cache';
import { db } from '../db';
import { rateCards, shippingRates, tenants } from '../db/schema';
import { getQueryScope, getUser, requireRole } from '../middleware/authorization';
import { emitToTenant } from '../realtime';
import { logAudit } from '../services/audit';
import { createRateCardSchema, updateRateCardSchema } from '../validators';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

app.get(
  '/',
  requireRole('superadmin', 'tenant-admin'),
  async (c) => {
    try {
      const scope = getQueryScope(c);
      if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

      const page = Math.max(parseInt(c.req.query('page') ?? '1', 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '50', 10) || 50, 1), 200);
      const offset = (page - 1) * limit;
      const search = c.req.query('search');
      const activeOnly = c.req.query('active') === 'true';

      if (search && search.length > 100) return c.json({ error: 'Search query too long' }, 400);

      const conditions: ReturnType<typeof eq>[] = [eq(rateCards.tenantId, scope.tenantId)];
      if (search) {
        conditions.push(ilike(rateCards.destinationCountry, `%${search}%`));
      }
      if (activeOnly) {
        conditions.push(eq(rateCards.isActive, true));
      }

      const [countRow] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(rateCards)
        .where(and(...conditions) as SQL | undefined);
      const total = countRow?.count ?? 0;

      const rows = await db
        .select()
        .from(rateCards)
        .where(and(...conditions) as SQL | undefined)
        .orderBy(rateCards.destinationCountry)
        .limit(limit)
        .offset(offset);

      return c.json({ data: rows, total, page, limit });
    } catch (err) {
      console.error('[rate-cards] GET / error:', err);
      const serializable: Record<string, unknown> = {};
      if (err && typeof err === 'object') {
        for (const key of Object.getOwnPropertyNames(err)) {
          try { serializable[key] = (err as any)[key]; } catch {}
        }
      }
      serializable['_str'] = String(err);
      return c.json({ error: serializable }, 500);
    }
  },
);

app.get(
  '/countries',
  requireRole('superadmin', 'tenant-admin'),
  async (c) => {
    const allCountries = COUNTRIES.map((c) => ({ code: c.code, name: c.name }));
    return c.json({ data: allCountries });
  },
);

app.get(
  '/:id',
  requireRole('superadmin', 'tenant-admin'),
  async (c) => {
    const scope = getQueryScope(c);
    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);
    const { id } = c.req.param();

    const [card] = await db
      .select()
      .from(rateCards)
      .where(and(eq(rateCards.id, id!), eq(rateCards.tenantId, scope.tenantId)) as SQL | undefined)
      .limit(1);

    if (!card) return c.json({ error: 'Rate card not found' }, 404);

    const rates = await db
      .select()
      .from(shippingRates)
      .where(eq(shippingRates.rateCardId, card.id))
      .orderBy(shippingRates.packageType, shippingRates.serviceType, shippingRates.weightFrom);

    return c.json({ data: { ...card, rates } });
  },
);

app.post(
  '/',
  requireRole('superadmin', 'tenant-admin'),
  async (c) => {
    const curUser = getUser(c);
    const scope = getQueryScope(c);
    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const body = await c.req.json();
    const parsed = createRateCardSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const fields = Object.entries(flat.fieldErrors)
        .map(([k, v]) => `${k}: ${v?.join(', ')}`)
        .join('; ');
      return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
    }

    const [tenant] = await db
      .select({ currency: tenants.currency })
      .from(tenants)
      .where(eq(tenants.id, scope.tenantId!))
      .limit(1);

    const [card] = await db
      .insert(rateCards)
      .values({
        tenantId: scope.tenantId,
        destinationCountry: parsed.data.destinationCountry,
        currency: parsed.data.currency ?? tenant?.currency ?? 'INR',
        createdBy: curUser?.id ?? null,
      })
      .returning();

    if (!card) return c.json({ error: 'Failed to create rate card' }, 500);

    const rateRows = parsed.data.rates.map((r) => ({
      rateCardId: card.id,
      packageType: 'all',
      serviceType: r.serviceType,
      weightFrom: r.weightFrom,
      weightTo: r.weightTo,
      rate: r.rate,
    }));

    await db.insert(shippingRates).values(rateRows);

    const rates = await db
      .select()
      .from(shippingRates)
      .where(eq(shippingRates.rateCardId, card.id))
      .orderBy(shippingRates.packageType, shippingRates.serviceType, shippingRates.weightFrom);

    await cacheDelPattern(scope.tenantId!, 'rate-cards:*');
    await logAudit(
      'RATE_CARD_CREATED',
      curUser?.id ?? null,
      { rateCardId: card.id, country: card.destinationCountry, rateCount: rates.length, tenantId: scope.tenantId },
      c,
    );
    emitToTenant(scope.tenantId!, 'dashboard:update', {});

    return c.json({ data: { ...card, rates } }, 201);
  },
);

app.patch(
  '/:id',
  requireRole('superadmin', 'tenant-admin'),
  async (c) => {
    const curUser = getUser(c);
    const scope = getQueryScope(c);
    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);
    const { id } = c.req.param();

    const [existing] = await db
      .select()
      .from(rateCards)
      .where(and(eq(rateCards.id, id!), eq(rateCards.tenantId, scope.tenantId)) as SQL | undefined)
      .limit(1);

    if (!existing) return c.json({ error: 'Rate card not found' }, 404);

    const body = await c.req.json();
    const parsed = updateRateCardSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const fields = Object.entries(flat.fieldErrors)
        .map(([k, v]) => `${k}: ${v?.join(', ')}`)
        .join('; ');
      return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
    }

    const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.rates) delete (updateData as Record<string, unknown>).rates;

    const [card] = await db
      .update(rateCards)
      .set(updateData)
      .where(and(eq(rateCards.id, id!), eq(rateCards.tenantId, scope.tenantId!)) as SQL | undefined)
      .returning();

    if (!card) return c.json({ error: 'Rate card not found' }, 404);

    if (parsed.data.rates) {
      await db.delete(shippingRates).where(eq(shippingRates.rateCardId, card.id));
      const rateRows = parsed.data.rates.map((r) => ({
        rateCardId: card.id,
        packageType: 'all',
        serviceType: r.serviceType,
        weightFrom: r.weightFrom,
        weightTo: r.weightTo,
        rate: r.rate,
      }));
      await db.insert(shippingRates).values(rateRows);
    }

    const rates = await db
      .select()
      .from(shippingRates)
      .where(eq(shippingRates.rateCardId, card.id))
      .orderBy(shippingRates.packageType, shippingRates.serviceType, shippingRates.weightFrom);

    await cacheDelPattern(scope.tenantId!, 'rate-cards:*');
    await logAudit(
      'RATE_CARD_UPDATED',
      curUser?.id ?? null,
      { rateCardId: card.id, country: card.destinationCountry, tenantId: scope.tenantId },
      c,
    );
    emitToTenant(scope.tenantId!, 'dashboard:update', {});

    return c.json({ data: { ...card, rates } });
  },
);

app.delete(
  '/:id',
  requireRole('superadmin', 'tenant-admin'),
  async (c) => {
    const scope = getQueryScope(c);
    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);
    const { id } = c.req.param();

    const [row] = await db
      .delete(rateCards)
      .where(and(eq(rateCards.id, id!), eq(rateCards.tenantId, scope.tenantId!)) as SQL | undefined)
      .returning();

    if (!row) return c.json({ error: 'Rate card not found' }, 404);

    await cacheDelPattern(scope.tenantId!, 'rate-cards:*');
    await logAudit(
      'RATE_CARD_DELETED',
      getUser(c)?.id ?? null,
      { rateCardId: row.id, country: row.destinationCountry, tenantId: scope.tenantId },
      c,
    );
    emitToTenant(scope.tenantId!, 'dashboard:update', {});

    return c.json({ data: row });
  },
);

export default app;
