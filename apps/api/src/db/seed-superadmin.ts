import { db } from './index';
import { user } from './schema';
import { auth } from '../auth';
import { createUser } from '../auth-api';
import { logger } from '../logger';
import { eq } from 'drizzle-orm';

async function seedSuperAdmin() {
  const isProduction = process.env.NODE_ENV === 'production';
  const email =
    process.env.SEED_SUPERADMIN_EMAIL ||
    (isProduction ? null : 'juddan2008@gmail.com');
  const password =
    process.env.SEED_SUPERADMIN_PASSWORD || (isProduction ? null : 'B7a90sfd@12');
  const name = process.env.SEED_SUPERADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    logger.error(
      'SEED_SUPERADMIN_EMAIL and SEED_SUPERADMIN_PASSWORD are required when NODE_ENV is production; refusing to create a super admin with default credentials',
    );
    process.exit(1);
  }

  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);

  if (existing.length > 0) {
    logger.info({ email }, 'super admin already exists');
    process.exit(0);
  }

  await createUser({ email, password, name, role: 'superadmin' });

  logger.info({ email }, 'super admin created');
  if (!process.env.SEED_SUPERADMIN_PASSWORD) {
    logger.warn('SEED_SUPERADMIN_PASSWORD was unset, the development fallback password was used');
  }
  process.exit(0);
}

seedSuperAdmin().catch((err) => {
  logger.error({ err }, 'seed superadmin failed');
  process.exit(1);
});
