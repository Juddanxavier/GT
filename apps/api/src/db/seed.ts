/** @format */

import { db } from './index';
import {
  tenants,
  branches,
  user,
  customers,
  shipments,
  quotations,
  quoteItems,
  invoices,
} from './schema';
import { auth } from '../auth';
import { eq, sql } from 'drizzle-orm';

async function seed() {
  const allTenants = await db.select().from(tenants);

  // ── Tenants — update old names, insert if none exist ──
  let gajan = allTenants.find((t) => t.slug === 'gajan-india' || t.slug === 'gajan-traders');
  let lanka = allTenants.find((t) => t.slug === 'gajan-sri-lanka' || t.slug === 'lanka-mahal');

  if (gajan) {
    const [r] = await db.update(tenants).set({ name: 'Gajan Traders', country: 'India' }).where(eq(tenants.id, gajan.id)).returning();
    gajan = r;
  } else {
    const [r] = await db.insert(tenants).values({ name: 'Gajan Traders', slug: 'gajan-traders', country: 'India' }).returning();
    gajan = r;
  }

  if (lanka) {
    const [r] = await db.update(tenants).set({ name: 'Lanka Mahal', country: 'Sri Lanka' }).where(eq(tenants.id, lanka.id)).returning();
    lanka = r;
  } else {
    const [r] = await db.insert(tenants).values({ name: 'Lanka Mahal', slug: 'lanka-mahal', country: 'Sri Lanka' }).returning();
    lanka = r;
  }

  console.log(`  Tenant: ${gajan.name} (${gajan.country})`);
  console.log(`  Tenant: ${lanka.name} (${lanka.country})`);

  // ── Replace Branches ──
  await db.delete(branches);

  const [mumbaiHq, delhi, chennai] = await db
    .insert(branches)
    .values([
      { name: 'Mumbai HQ', tenantId: gajan.id, phone: '+91-22-12345678', email: 'mumbai@gajantraders.com', address: '123 Business District, Mumbai, Maharashtra 400001' },
      { name: 'Delhi Branch', tenantId: gajan.id, phone: '+91-11-87654321', email: 'delhi@gajantraders.com', address: '456 Connaught Place, New Delhi 110001' },
      { name: 'Chennai Branch', tenantId: gajan.id, phone: '+91-44-23456789', email: 'chennai@gajantraders.com', address: '789 Anna Salai, Chennai, Tamil Nadu 600002' },
    ])
    .returning();

  const [colomboHq, kandy, jaffna] = await db
    .insert(branches)
    .values([
      { name: 'Colombo HQ', tenantId: lanka.id, phone: '+94-11-2345678', email: 'colombo@lankamahal.lk', address: '1 Galle Road, Colombo 03, Sri Lanka' },
      { name: 'Kandy Branch', tenantId: lanka.id, phone: '+94-81-3456789', email: 'kandy@lankamahal.lk', address: '45 Peradeniya Road, Kandy, Sri Lanka' },
      { name: 'Jaffna Branch', tenantId: lanka.id, phone: '+94-21-4567890', email: 'jaffna@lankamahal.lk', address: '78 Hospital Road, Jaffna, Sri Lanka' },
    ])
    .returning();

  console.log(`  Branches for ${gajan.name}: Mumbai HQ, Delhi, Chennai`);
  console.log(`  Branches for ${lanka.name}: Colombo HQ, Kandy, Jaffna`);

  // ── Upsert Users ──
  const usersData = [
    { name: 'Super Admin', email: 'superadmin@gajantraders.com', password: 'Admin@123', role: 'superadmin' as const, tenantId: null as string | null, branchId: null as string | null },
    { name: 'Gajan Admin', email: 'admin@gajantraders.com', password: 'Admin@123', role: 'tenant-admin' as const, tenantId: gajan.id, branchId: mumbaiHq.id },
    { name: 'Gajan Staff Mumbai', email: 'staff-mumbai@gajantraders.com', password: 'Staff@123', role: 'staff' as const, tenantId: gajan.id, branchId: mumbaiHq.id },
    { name: 'Gajan Staff Delhi', email: 'staff-delhi@gajantraders.com', password: 'Staff@123', role: 'staff' as const, tenantId: gajan.id, branchId: delhi.id },
    { name: 'Gajan Staff Chennai', email: 'staff-chennai@gajantraders.com', password: 'Staff@123', role: 'staff' as const, tenantId: gajan.id, branchId: chennai.id },
    { name: 'Lanka Admin', email: 'admin@lankamahal.lk', password: 'Admin@123', role: 'tenant-admin' as const, tenantId: lanka.id, branchId: colomboHq.id },
    { name: 'Lanka Staff Colombo', email: 'staff-colombo@lankamahal.lk', password: 'Staff@123', role: 'staff' as const, tenantId: lanka.id, branchId: colomboHq.id },
    { name: 'Lanka Staff Kandy', email: 'staff-kandy@lankamahal.lk', password: 'Staff@123', role: 'staff' as const, tenantId: lanka.id, branchId: kandy.id },
    { name: 'Lanka Staff Jaffna', email: 'staff-jaffna@lankamahal.lk', password: 'Staff@123', role: 'staff' as const, tenantId: lanka.id, branchId: jaffna.id },
  ];

  for (const u of usersData) {
    const existingUsers = await db.select().from(user).where(eq(user.email, u.email)).limit(1);
    if (existingUsers.length > 0) {
      console.log(`  User exists (skipping): ${u.name} (${u.email})`);
      continue;
    }
    await auth.api.createUser({
      body: {
        email: u.email,
        password: u.password,
        name: u.name,
        role: u.role,
        data: { tenantId: u.tenantId, branchId: u.branchId },
      },
    });
    console.log(`  User created: ${u.name} (${u.email}) — ${u.role}`);
  }

  // ── Seed Customers, Shipments, Quotations ──

  // Clear existing seed data (FK-safe order)
  await db.delete(quoteItems);
  await db.delete(invoices);
  await db.delete(quotations);
  await db.delete(shipments);
  await db.delete(customers);

  const allBranches = [mumbaiHq, delhi, chennai, colomboHq, kandy, jaffna];

  // ── Customers ──
  const customerDefs: { name: string; email: string; phone: string; branchId: string; tenantId: string }[] = [
    // Gajan Traders
    { name: 'Rajesh Patel', email: 'rajesh@gajantraders.com', phone: '+91-9876543210', branchId: mumbaiHq.id, tenantId: gajan.id },
    { name: 'Priya Sharma', email: 'priya@gajantraders.com', phone: '+91-9876543211', branchId: mumbaiHq.id, tenantId: gajan.id },
    { name: 'Amit Verma', email: 'amit@gajantraders.com', phone: '+91-9876543212', branchId: delhi.id, tenantId: gajan.id },
    { name: 'Neha Gupta', email: 'neha@gajantraders.com', phone: '+91-9876543213', branchId: delhi.id, tenantId: gajan.id },
    { name: 'Karthik Rajan', email: 'karthik@gajantraders.com', phone: '+91-9876543214', branchId: chennai.id, tenantId: gajan.id },
    { name: 'Lakshmi Narayan', email: 'lakshmi@gajantraders.com', phone: '+91-9876543215', branchId: chennai.id, tenantId: gajan.id },
    // Lanka Mahal
    { name: 'Saman Perera', email: 'saman@lankamahal.lk', phone: '+94-771234567', branchId: colomboHq.id, tenantId: lanka.id },
    { name: 'Nimal Fernando', email: 'nimal@lankamahal.lk', phone: '+94-771234568', branchId: colomboHq.id, tenantId: lanka.id },
    { name: 'Dinesh Silva', email: 'dinesh@lankamahal.lk', phone: '+94-771234569', branchId: kandy.id, tenantId: lanka.id },
    { name: 'Kumari Jayasuriya', email: 'kumari@lankamahal.lk', phone: '+94-771234560', branchId: kandy.id, tenantId: lanka.id },
    { name: 'Rajendran Sutha', email: 'rajendran@lankamahal.lk', phone: '+94-771234561', branchId: jaffna.id, tenantId: lanka.id },
    { name: 'Tharshi Niranjan', email: 'tharshi@lankamahal.lk', phone: '+94-771234562', branchId: jaffna.id, tenantId: lanka.id },
  ];

  const insertedCustomers = await db.insert(customers).values(customerDefs).returning();
  const customerMap = new Map(insertedCustomers.map((c) => [c.email, c]));
  console.log(`  Created ${insertedCustomers.length} customers`);

  // ── Shipments ──
  const statuses = ['pending', 'info_received', 'in_transit', 'out_for_delivery', 'delivered', 'exception'];
  const carriers = ['FedEx', 'DHL', 'Blue Dart', 'DTDC', 'UPS', 'Aramex'];
  const origins = ['Mumbai, India', 'Delhi, India', 'Chennai, India', 'Colombo, Sri Lanka', 'Kandy, Sri Lanka', 'Jaffna, Sri Lanka', 'Shanghai, China', 'Hong Kong', 'Dubai, UAE', 'Singapore'];
  const destinations = ['New York, USA', 'London, UK', 'Sydney, Australia', 'Toronto, Canada', 'Berlin, Germany', 'Tokyo, Japan', 'Paris, France', 'Melbourne, Australia', 'Chicago, USA', 'Dubai, UAE'];

  const branchCustomerMap = new Map<string, typeof insertedCustomers>();
  for (const c of insertedCustomers) {
    if (!branchCustomerMap.has(c.branchId)) {
      branchCustomerMap.set(c.branchId, []);
    }
    branchCustomerMap.get(c.branchId)!.push(c);
  }

  let shipmentCount = 0;
  const allShipments: typeof insertedCustomers = [];

  for (const branch of allBranches) {
    const branchCustomers = branchCustomerMap.get(branch.id) ?? [];
    const count = 3 + Math.floor(Math.random() * 3); // 3-5 per branch

    for (let i = 0; i < count; i++) {
      const customer = branchCustomers[i % branchCustomers.length] ?? branchCustomers[0]!;
      const status = statuses[Math.floor(Math.random() * statuses.length)]!;
      const carrier = carriers[Math.floor(Math.random() * carriers.length)]!;
      const origin = origins[Math.floor(Math.random() * origins.length)]!;
      const dest = destinations[Math.floor(Math.random() * destinations.length)]!;
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date(Date.now() - daysAgo * 86400000);
      const billAmount = (Math.random() * 50000 + 1000).toFixed(2);
      const trackNum = `GT${String(Date.now()).slice(-6)}${String(shipmentCount).padStart(3, '0')}`;

      const [s] = await db
        .insert(shipments)
        .values({
          trackingNo: trackNum,
          status,
          customerId: customer.id,
          carrier,
          origin,
          destination: dest,
          billAmount,
          branchId: branch.id,
          tenantId: branch.tenantId,
          contactEmail: customer.email,
          contactPhone: customer.phone,
          createdAt,
          updatedAt: createdAt,
          lastTrackedAt: createdAt,
        })
        .returning();

      allShipments.push(s);
      shipmentCount++;
    }
  }
  console.log(`  Created ${shipmentCount} shipments`);

  // ── Quotations ──
  const quoteStatuses = ['draft', 'sent', 'accepted', 'rejected', 'converted'];
  let quoteCount = 0;
  const itemsTemplates = [
    [{ desc: 'Customs Clearance Service', qty: 1, rate: 15000 }],
    [{ desc: 'Freight Charges', qty: 1, rate: 25000 }, { desc: 'Insurance', qty: 1, rate: 5000 }],
    [{ desc: 'Warehousing (per day)', qty: 7, rate: 2000 }, { desc: 'Loading/Unloading', qty: 2, rate: 3000 }],
    [{ desc: 'Documentation Fee', qty: 1, rate: 3000 }, { desc: 'Transport to Port', qty: 1, rate: 8000 }],
    [{ desc: 'Packaging Materials', qty: 10, rate: 500 }, { desc: 'Cold Storage', qty: 3, rate: 4000 }],
  ];

  for (const branch of allBranches) {
    const branchCustomers = branchCustomerMap.get(branch.id) ?? [];
    const count = 2 + Math.floor(Math.random() * 2); // 2-3 per branch

    for (let i = 0; i < count; i++) {
      const customer = branchCustomers[i % branchCustomers.length] ?? branchCustomers[0]!;
      const qStatus = quoteStatuses[Math.floor(Math.random() * quoteStatuses.length)]!;
      const template = itemsTemplates[Math.floor(Math.random() * itemsTemplates.length)]!;
      const total = template.reduce((sum, item) => sum + item.qty * item.rate, 0);
      const quoteNo = `QT-${String(quoteCount + 1).padStart(4, '0')}`;
      const daysAgo = Math.floor(Math.random() * 45);
      const createdAt = new Date(Date.now() - daysAgo * 86400000);

      const [q] = await db
        .insert(quotations)
        .values({
          quoteNo,
          status: qStatus,
          customerId: customer.id,
          total: total.toFixed(2),
          validUntil: new Date(Date.now() + 30 * 86400000),
          branchId: branch.id,
          tenantId: branch.tenantId,
          notes: `Quote for ${customer.name} — ${branch.name}`,
          createdAt,
          updatedAt: createdAt,
        })
        .returning();

      // Insert quote items
      await db.insert(quoteItems).values(
        template.map((item) => ({
          quotationId: q.id,
          description: item.desc,
          quantity: item.qty.toString(),
          rate: item.rate.toString(),
          amount: (item.qty * item.rate).toString(),
          createdAt,
        })),
      );

      quoteCount++;
    }
  }
  console.log(`  Created ${quoteCount} quotations with items`);

  console.log('\nSeed data complete');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
