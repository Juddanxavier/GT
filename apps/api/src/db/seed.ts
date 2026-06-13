/** @format */

import { db } from './index';
import { tenants, tenantDomains, branches } from './schema';

async function seed() {
  const existingTenants = await db.select().from(tenants);
  if (existingTenants.length > 0) {
    console.log('Seed data already exists, skipping...');
    process.exit(0);
  }

  const [indiaTenant] = await db
    .insert(tenants)
    .values({
      name: 'Gajan Traders India',
      slug: 'gajan-india',
    })
    .returning();

  const [sriLankaTenant] = await db
    .insert(tenants)
    .values({
      name: 'Gajan Traders Sri Lanka',
      slug: 'gajan-sri-lanka',
    })
    .returning();

  await db.insert(tenantDomains).values([
    { domain: 'india.gajantraders.com', tenantId: indiaTenant.id },
    { domain: 'srilanka.gajantraders.com', tenantId: sriLankaTenant.id },
  ]);

  await db.insert(branches).values([
    { name: 'Mumbai HQ', tenantId: indiaTenant.id },
    { name: 'Colombo HQ', tenantId: sriLankaTenant.id },
  ]);

  console.log('Seed data inserted successfully');
  console.log(`  - Tenant: ${indiaTenant.name} (${indiaTenant.slug})`);
  console.log(`  - Tenant: ${sriLankaTenant.name} (${sriLankaTenant.slug})`);
  console.log('  - Domains: india.gajantraders.com, srilanka.gajantraders.com');
  console.log('  - Branches: Mumbai HQ, Colombo HQ');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
