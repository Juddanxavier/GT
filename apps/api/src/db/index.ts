import { AsyncLocalStorage } from 'node:async_hooks';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString, {
  max: Number(process.env.DB_POOL_MAX) || 20,
  ssl: process.env.DB_SSL === 'require' || connectionString.includes('sslmode=require') ? 'require' : false,
  connect_timeout: 10,   // seconds
  idle_timeout: 30,          // seconds
  onnotice: () => {},
});

// Warn about overly large pool in production
if (Number(process.env.DB_POOL_MAX) > 50) {
  console.warn('[db] DB_POOL_MAX > 50 may cause connection spikes under load');
}

export { client };

const baseDb = drizzle(client, { schema });

// Request-scoped RLS context: the tenant GUC is transaction-local in Postgres,
// so it only applies to queries running on the SAME connection as the one that
// set it. A pooled `db.execute` autocommits and the setting is lost — which made
// the old setRLSTenantContext() inert. Instead we open a per-request transaction
// (pinning one connection) and route every query for the request through it.
const rlsStore = new AsyncLocalStorage<{ tx: typeof baseDb }>();

const dbProxy = new Proxy(baseDb, {
  get(target, prop, receiver) {
    const store = rlsStore.getStore();
    const source = store?.tx ?? target;
    const value = Reflect.get(source, prop, source);
    return typeof value === 'function' ? value.bind(source) : value;
  },
});

export const db = dbProxy;

export async function runWithTenantContext<T>(
  tenantId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  return baseDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId ?? 'superadmin'}, true)`);
    // tx is a PgTransaction; cast to the db-shaped type the proxy expects
    return rlsStore.run({ tx } as unknown as { tx: typeof baseDb }, fn);
  });
}

export type DbClient = typeof baseDb;
