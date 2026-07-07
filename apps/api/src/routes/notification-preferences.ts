import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
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

// GET /api/notification-preferences — get current user's prefs
app.get('/', requireRole('superadmin', 'tenant-admin', 'staff', 'customer'), async (c) => {
  const user = c.get('user');
  const tenantId = c.get('tenantId');
  if (!user || !tenantId) return c.json({ error: 'Unauthorized' }, 401);
  const prefs = await getPreferences(user.id, tenantId);
  return c.json(prefs ?? {});
});

// PUT /api/notification-preferences — update prefs
app.put('/', requireRole('superadmin', 'tenant-admin', 'staff', 'customer'), zValidator('json', updatePrefsSchema), async (c) => {
  const user = c.get('user');
  const tenantId = c.get('tenantId');
  if (!user || !tenantId) return c.json({ error: 'Unauthorized' }, 401);
  const body = c.req.valid('json');
  const updated = await upsertPreferences(user.id, tenantId, body);
  return c.json(updated);
});

export default app;
