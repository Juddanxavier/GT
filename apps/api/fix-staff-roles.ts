import { db } from './src/db/index';
import { user } from './src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { Redis } from 'ioredis';

async function main() {
  const staffEmails = [
    'staff-mumbai@gajantraders.com',
    'staff-delhi@gajantraders.com',
    'staff-chennai@gajantraders.com',
    'staff-colombo@lankamahal.lk',
    'staff-kandy@lankamahal.lk',
    'staff-jaffna@lankamahal.lk',
  ];

  const existing = await db.select({ email: user.email, role: user.role }).from(user)
    .where(inArray(user.email, staffEmails));
  console.log('Current roles:');
  console.table(existing);

  const wrong = existing.filter(u => u.role !== 'staff');
  if (wrong.length > 0) {
    for (const u of wrong) {
      await db.update(user).set({ role: 'staff' }).where(eq(user.email, u.email!));
      console.log(`Fixed: ${u.email} (was ${u.role})`);
    }
  } else {
    console.log('All staff users already have correct role.');
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl);
  const keys = await redis.keys('session:*');
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`Cleared ${keys.length} Redis session caches`);
  } else {
    console.log('No Redis session caches to clear');
  }
  redis.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
