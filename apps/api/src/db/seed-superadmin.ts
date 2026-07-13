import { db } from './index';
import { user } from './schema';
import { auth } from '../auth';
import { createUser } from '../auth-api';
import { eq } from 'drizzle-orm';

async function seedSuperAdmin() {
  const email = process.env.SEED_SUPERADMIN_EMAIL || 'juddan2008@gmail.com';
  const password = process.env.SEED_SUPERADMIN_PASSWORD || 'B7a90sfd@12';
  const name = process.env.SEED_SUPERADMIN_NAME || 'Super Admin';

  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);

  if (existing.length > 0) {
    console.log(`Super admin already exists (${email})`);
    process.exit(0);
  }

  await createUser({ email, password, name, role: 'superadmin' });

  console.log(`Super admin created: ${email}`);
  console.warn('WARNING: Super admin credentials were set from environment variables. If SEED_SUPERADMIN_PASSWORD is not set, the default fallback is used — change it in production!');
  process.exit(0);
}

seedSuperAdmin().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
