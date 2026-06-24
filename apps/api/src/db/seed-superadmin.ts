import { db } from './index';
import { user } from './schema';
import { auth } from '../auth';
import { eq } from 'drizzle-orm';

async function seedSuperAdmin() {
  const email = 'juddan2008@gmail.com';
  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);

  if (existing.length > 0) {
    console.log(`Super admin already exists (${email})`);
    process.exit(0);
  }

  await auth.api.createUser({
    body: {
      email,
      password: 'B7a90sfd@12',
      name: 'Super Admin',
      role: 'superadmin',
    },
  });

  console.log('Super admin created: juddan2008@gmail.com / B7a90sfd@12');
  process.exit(0);
}

seedSuperAdmin().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
