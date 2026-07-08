/**
 * Migration script: Move customer data from `customer` table to `user` table.
 *
 * Run BEFORE applying migration Phase B (which drops customer_id columns and customer table).
 * Run AFTER applying migration Phase A (which adds phone/isActive to user and userId columns).
 *
 * Usage: tsx .planning/phases/06-consolidate-customer-table-into-user-profile/migrate-customers.ts
 */

import { db } from '../../../apps/api/src/db';
import { auth } from '../../../apps/api/src/auth';
import { user, shipments, invoices, quotations } from '../../../apps/api/src/db/schema';
import { eq, and, sql } from 'drizzle-orm';

async function migrate() {
  console.log('Starting customer → user migration...');

  // Step 1: Read all existing customer records
  const existingCustomers = await db.execute<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    isActive: boolean;
    branchId: string | null;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
  }>(sql`SELECT * FROM "customer"`);

  console.log(`Found ${existingCustomers.rows.length} customer records`);

  let created = 0;
  let reused = 0;

  for (const customer of existingCustomers.rows) {
    // Check if user already exists with this email
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, customer.email ?? ''))
      .limit(1);

    if (existingUser) {
      // Reuse existing user — update profile fields
      await db
        .update(user)
        .set({
          phone: customer.phone,
          isActive: customer.isActive,
        })
        .where(eq(user.id, existingUser.id));
      reused++;
      console.log(`  Reused user: ${customer.email} (${existingUser.id})`);
    } else if (customer.email) {
      // Create new user via BA API
      const randomPwd = crypto.randomUUID();
      const createdUser = await (auth.api as any).createUser({
        body: {
          email: customer.email,
          password: randomPwd,
          name: customer.name,
          role: 'customer',
          data: {
            tenantId: customer.tenantId,
            branchId: customer.branchId ?? undefined,
            phone: customer.phone,
          },
        },
      });
      console.log(`  Created user: ${customer.email} (${createdUser.user.id})`);
      created++;
    } else {
      console.warn(`  Skipping customer ${customer.id}: no email`);
    }
  }

  console.log(`\nUsers: ${created} created, ${reused} reused`);

  // Step 2: Update FKs — shipments
  const shipResult = await db.execute(sql`
    UPDATE "shipment" s
    SET user_id = (SELECT u.id FROM "user" u WHERE u.email = (SELECT c.email FROM "customer" c WHERE c.id = s.customer_id))
    WHERE s.customer_id IS NOT NULL
  `);
  console.log(`Updated ${shipResult.rowCount ?? 0} shipments`);

  // Step 3: Update FKs — invoices
  const invResult = await db.execute(sql`
    UPDATE "invoice" i
    SET user_id = (SELECT u.id FROM "user" u WHERE u.email = (SELECT c.email FROM "customer" c WHERE c.id = i.customer_id))
    WHERE i.customer_id IS NOT NULL
  `);
  console.log(`Updated ${invResult.rowCount ?? 0} invoices`);

  // Step 4: Update FKs — quotations
  const quotResult = await db.execute(sql`
    UPDATE "quotation" q
    SET user_id = (SELECT u.id FROM "user" u WHERE u.email = (SELECT c.email FROM "customer" c WHERE c.id = q.customer_id))
    WHERE q.customer_id IS NOT NULL
  `);
  console.log(`Updated ${quotResult.rowCount ?? 0} quotations`);

  console.log('\nMigration complete. Ready for Phase B migration (drop customer columns/table).');
  process.exit(0);
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
