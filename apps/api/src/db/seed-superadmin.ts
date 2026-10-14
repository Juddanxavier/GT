import { db } from './index';
import { user } from './schema';
import { auth } from '../auth';
import { createUser } from '../auth-api';
import { logger } from '../logger';
import { eq } from 'drizzle-orm';

async function seedSuperAdmin() {
  const email = process.env.SEED_SUPERADMIN_EMAIL || 'juddan2008@gmail.com';
  const password = process.env.SEED_SUPERADMIN_PASSWORD || 'B7a90sfd@12';
  const name = process.env.SEED_SUPERADMIN_NAME || 'Super Admin';

  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);

  if (existing.length > 0) {
    logger.info({ email }, 'super admin already exists');
    process.exit(0);
  }

  await createUser({ email, password, name, role: 'superadmin' });

  logger.info({ email }, 'super admin created');
  logger.warn('super admin credentials came from environment variables; if SEED_SUPERADMIN_PASSWORD is unset the default fallback is used, change it in production');
  process.exit(0);
}

seedSuperAdmin().catch((err) => {
  logger.error({ err }, 'seed superadmin failed');
  process.exit(1);
});
