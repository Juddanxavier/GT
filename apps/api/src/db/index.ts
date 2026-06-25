import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString, {
  max: Number(process.env.DB_POOL_MAX) || 50,
  ssl: process.env.DB_SSL === 'require' ? 'require' : false,
  onnotice: () => {},
});

export { client };
export const db = drizzle(client, { schema });

export type DbClient = typeof db;
