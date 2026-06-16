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
  const result = await db.execute(
    sql`SELECT current_setting('app.tenant_id', true) AS tenant_id`,
  );
  const value = result.rows[0]?.tenant_id;
  if (!value || value === 'superadmin') {
    return null;
  }
  return value as string;
}
