import { Hono } from 'hono';
import { z } from 'zod';
import { getPreferences, upsertPreferences } from '../services/notification-prefs';
import { requireRole } from '../middleware/authorization';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

const updatePrefsSchema = z.object({
  deliveryEmail: z.boolean().optional(),
  deliveryWhatsapp: z.boolean().optional(),
  exceptionEmail: z.boolean().optional(),
  exceptionWhatsapp: z.boolean().optional(),
  generalEmail: z.boolean().optional(),
  generalWhatsapp: z.boolean().optional(),
});

app.get('/', requireRole('superadmin', 'tenant-admin', 'staff', 'customer'), async (c) => {
  const user = c.get('user');
  const tenantId = c.get('tenantId');
  if (!user || !tenantId) return c.json({ error: 'Unauthorized' }, 401);
  const prefs = await getPreferences(user.id, tenantId);
  return c.json(prefs ?? {});
});

app.put('/', requireRole('superadmin', 'tenant-admin', 'staff', 'customer'), async (c) => {
  const user = c.get('user');
  const tenantId = c.get('tenantId');
  if (!user || !tenantId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json().catch(() => ({}));
  const parsed = updatePrefsSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid body', details: parsed.error.flatten() }, 400);
  const updated = await upsertPreferences(user.id, tenantId, parsed.data);
  return c.json(updated);
});

export default app;
