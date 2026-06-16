import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from './index';

async function applyRLS() {
  const sql = readFileSync(
    join(__dirname, 'migrations/0003_add_rls.sql'),
    'utf-8',
  );
  await db.execute(sql);
  console.log('RLS policies applied successfully');
}

applyRLS().catch(console.error);
