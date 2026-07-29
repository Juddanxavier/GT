import { db } from './src/db/index';
import { shipments } from './src/db/schema';
import { sql } from 'drizzle-orm';

try {
  const result = await db.select({ tn: shipments.trackingNo }).from(shipments).limit(10);
  console.log(JSON.stringify(result));
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
}
process.exit(0);
