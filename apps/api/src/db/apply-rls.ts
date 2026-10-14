import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from './index';
import { logger } from '../logger';

async function applyRLS() {
  const sql = readFileSync(
    join(__dirname, 'migrations/0003_add_rls.sql'),
    'utf-8',
  );
  await db.execute(sql);
  logger.info('rls policies applied successfully');
}

applyRLS().catch((err) => {
  logger.error({ err }, 'rls apply failed');
});
