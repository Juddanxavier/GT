import { db } from './src/db/index';
import { shipments } from './src/db/schema';
import { logger } from './src/logger';
import { sql } from 'drizzle-orm';

try {
  const result = await db.select({ tn: shipments.trackingNo }).from(shipments).limit(10);
  logger.info({ rows: result }, 'tracking numbers');
} catch (e) {
  logger.error({ err: e }, 'list track failed');
}
process.exit(0);
