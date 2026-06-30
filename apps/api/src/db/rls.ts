/** @format */

import { sql } from 'drizzle-orm';
import { db } from './index';

export async function setRLSTenantContext(tenantId: string | null): Promise<void> {
  if (tenantId) {
    await db.execute(
      sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`,
    );
  } else {
    await db.execute(
      sql`SELECT set_config('app.tenant_id', 'superadmin', true)`,
    );
  }
}

export async function getRLSTenantContext(): Promise<string | null> {
  const rows = await db.execute(
    sql`SELECT current_setting('app.tenant_id', true) AS tenant_id`,
  ) as unknown as { tenant_id: string }[];
  const value = rows[0]?.tenant_id;
  if (!value || value === 'superadmin') {
    return null;
  }
  return value as string;
}
