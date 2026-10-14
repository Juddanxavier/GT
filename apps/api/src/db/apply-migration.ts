import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from './index';
import { logger } from '../logger';

async function applyMigration(filename: string) {
  const sql = readFileSync(join(__dirname, 'migrations', filename), 'utf-8');
  await db.execute(sql);
  logger.info({ filename }, 'migration applied successfully');
}

const migrationFile = process.argv[2];

if (!migrationFile) {
  logger.error('usage: npx tsx src/db/apply-migration.ts <filename>');
  process.exit(1);
}

applyMigration(migrationFile).catch((err) => {
  logger.error({ err }, 'migration failed');
});
