import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString, {
  max: Number(process.env.DB_POOL_MAX) || 20,
  ssl: process.env.DB_SSL === 'require' ? 'require' : false,
  connect_timeout: 10,   // seconds
  idle_timeout: 30,          // seconds
  onnotice: () => {},
});

// Warn about overly large pool in production
if (Number(process.env.DB_POOL_MAX) > 50) {
  console.warn('[db] DB_POOL_MAX > 50 may cause connection spikes under load');
}

export { client };
export const db = drizzle(client, { schema });

export type DbClient = typeof db;
