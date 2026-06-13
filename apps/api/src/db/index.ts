import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// For production, use connection pooling with PgBouncer-compatible URL
const client = postgres(connectionString, {
  max: 10, // Pool size
  ssl: connectionString.includes('localhost') ? false : 'require',
});

export const db = drizzle(client, { schema });

export type DbClient = typeof db;
