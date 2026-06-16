import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from './index';

async function applyMigration(filename: string) {
  const sql = readFileSync(join(__dirname, 'migrations', filename), 'utf-8');
  await db.execute(sql);
  console.log(`Migration ${filename} applied successfully`);
}

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: npx tsx src/db/apply-migration.ts <filename>');
  process.exit(1);
}

applyMigration(migrationFile).catch(console.error);
