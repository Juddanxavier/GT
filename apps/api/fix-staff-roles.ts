import { db } from './src/db/index';
import { user } from './src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { logger } from './src/logger';
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
  logger.info({ users: existing }, 'current roles');

  const wrong = existing.filter(u => u.role !== 'staff');
  if (wrong.length > 0) {
    for (const u of wrong) {
      await db.update(user).set({ role: 'staff' }).where(eq(user.email, u.email!));
      logger.info({ email: u.email, role: u.role }, 'user role fixed to staff');
    }
  } else {
    logger.info('all staff users already have correct role');
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl);
  const keys = await redis.keys('session:*');
  if (keys.length > 0) {
    await redis.del(...keys);
    logger.info({ count: keys.length }, 'cleared redis session caches');
  } else {
    logger.info('no redis session caches to clear');
  }
  redis.disconnect();
}

main().catch(e => { logger.error({ err: e }, 'fix staff roles failed'); process.exit(1); });
