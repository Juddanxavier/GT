/** @format */

import { db } from './index';
import {
  tenants,
  branches,
  user,
  shipments,
  trackingEvents,
  quotations,
  quoteItems,
  invoices,
} from './schema';
import { auth } from '../auth';
import { createUser } from '../auth-api';
import { and, eq, sql } from 'drizzle-orm';

async function seed() {
  // ── Tenants — upsert by canonical slug (idempotent; safe to run multiple times) ──

  // Migrate old-slug tenants to canonical slugs (safe — UPDATE never triggers FK
  // RESTRICT). Guard with NOT EXISTS so the UPDATE is a no-op if the canonical
  // slug already exists (duplicate scenario), avoiding unique constraint violations.
  await db.update(tenants)
    .set({ slug: 'gajan-traders', updatedAt: new Date() })
    .where(
      and(
        eq(tenants.slug, 'gajan-india'),
        sql`NOT EXISTS (SELECT 1 FROM "tenant" WHERE slug = 'gajan-traders')`,
      ),
    );
  await db.update(tenants)
    .set({ slug: 'lanka-mahal', updatedAt: new Date() })
    .where(
      and(
        eq(tenants.slug, 'gajan-sri-lanka'),
        sql`NOT EXISTS (SELECT 1 FROM "tenant" WHERE slug = 'lanka-mahal')`,
      ),
    );

  // Upsert canonical tenants — ON CONFLICT DO UPDATE ensures idempotency.
  // If the slug was migrated above, this is a no-op (same slug, same data).
  // If the slug already existed (duplicate case), this updates its data.
  // If neither existed, this inserts a fresh record.
  const [gajan] = await db
    .insert(tenants)
    .values({ name: 'Gajan Traders', slug: 'gajan-traders', country: 'India', currency: 'INR' })
    .onConflictDoUpdate({
      target: tenants.slug,
      set: { name: 'Gajan Traders', country: 'India', currency: 'INR', updatedAt: new Date() },
    })
    .returning();

  const [lanka] = await db
    .insert(tenants)
    .values({ name: 'Lanka Mahal', slug: 'lanka-mahal', country: 'Sri Lanka', currency: 'LKR' })
    .onConflictDoUpdate({
      target: tenants.slug,
      set: { name: 'Lanka Mahal', country: 'Sri Lanka', currency: 'LKR', updatedAt: new Date() },
    })
    .returning();

  console.log(`  Tenant: ${gajan!.name} (${gajan!.country})`);
  console.log(`  Tenant: ${lanka!.name} (${lanka!.country})`);

  // ── Replace Branches ──
  await db.delete(branches);

  const gBranches = await db
    .insert(branches)
    .values([
      { name: 'Mumbai HQ', slug: 'mumbai-hq', tenantId: gajan!.id, phone: '+91-22-12345678', email: 'mumbai@gajantraders.com', address: '123 Business District, Mumbai, Maharashtra 400001' },
      { name: 'Delhi Branch', slug: 'delhi-branch', tenantId: gajan!.id, phone: '+91-11-87654321', email: 'delhi@gajantraders.com', address: '456 Connaught Place, New Delhi 110001' },
      { name: 'Chennai Branch', slug: 'chennai-branch', tenantId: gajan!.id, phone: '+91-44-23456789', email: 'chennai@gajantraders.com', address: '789 Anna Salai, Chennai, Tamil Nadu 600002' },
    ])
    .returning();
  const mumbaiHq = gBranches[0]!;
  const delhi = gBranches[1]!;
  const chennai = gBranches[2]!;

  const lBranches = await db
    .insert(branches)
    .values([
      { name: 'Colombo HQ', slug: 'colombo-hq', tenantId: lanka!.id, phone: '+94-11-2345678', email: 'colombo@lankamahal.lk', address: '1 Galle Road, Colombo 03, Sri Lanka' },
      { name: 'Kandy Branch', slug: 'kandy-branch', tenantId: lanka!.id, phone: '+94-81-3456789', email: 'kandy@lankamahal.lk', address: '45 Peradeniya Road, Kandy, Sri Lanka' },
      { name: 'Jaffna Branch', slug: 'jaffna-branch', tenantId: lanka!.id, phone: '+94-21-4567890', email: 'jaffna@lankamahal.lk', address: '78 Hospital Road, Jaffna, Sri Lanka' },
    ])
    .returning();
  const colomboHq = lBranches[0]!;
  const kandy = lBranches[1]!;
  const jaffna = lBranches[2]!;

  console.log(`  Branches for ${gajan!.name}: Mumbai HQ, Delhi, Chennai`);
  console.log(`  Branches for ${lanka!.name}: Colombo HQ, Kandy, Jaffna`);

  // ── Upsert Users ──
  const usersData = [
    { name: 'Super Admin', email: 'superadmin@gajantraders.com', password: 'Admin@123', role: 'superadmin' as const, tenantId: null as string | null, branchId: null as string | null },
    { name: 'Gajan Admin', email: 'admin@gajantraders.com', password: 'Admin@123', role: 'tenant-admin' as const,    tenantId: gajan!.id, branchId: mumbaiHq.id },
    { name: 'Gajan Staff Mumbai', email: 'staff-mumbai@gajantraders.com', password: 'Staff@123', role: 'staff' as const, tenantId: gajan!.id, branchId: mumbaiHq.id },
    { name: 'Gajan Staff Delhi', email: 'staff-delhi@gajantraders.com', password: 'Staff@123', role: 'staff' as const, tenantId: gajan!.id, branchId: delhi.id },
    { name: 'Gajan Staff Chennai', email: 'staff-chennai@gajantraders.com', password: 'Staff@123', role: 'staff' as const, tenantId: gajan!.id, branchId: chennai.id },
    { name: 'Lanka Admin', email: 'admin@lankamahal.lk', password: 'Admin@123', role: 'tenant-admin' as const, tenantId: lanka!.id, branchId: colomboHq.id },
    { name: 'Lanka Staff Colombo', email: 'staff-colombo@lankamahal.lk', password: 'Staff@123', role: 'staff' as const, tenantId: lanka!.id, branchId: colomboHq.id },
    { name: 'Lanka Staff Kandy', email: 'staff-kandy@lankamahal.lk', password: 'Staff@123', role: 'staff' as const, tenantId: lanka!.id, branchId: kandy.id },
    { name: 'Lanka Staff Jaffna', email: 'staff-jaffna@lankamahal.lk', password: 'Staff@123', role: 'staff' as const, tenantId: lanka!.id, branchId: jaffna.id },
  ];

  for (const u of usersData) {
    const existingUsers = await db.select().from(user).where(eq(user.email, u.email)).limit(1);
    if (existingUsers.length > 0) {
      console.log(`  User exists (skipping): ${u.name} (${u.email})`);
      continue;
    }
    await createUser({ email: u.email, password: u.password, name: u.name, role: u.role, tenantId: u.tenantId, branchId: u.branchId });
    console.log(`  User created: ${u.name} (${u.email}) — ${u.role}`);
  }

  // ── Seed Customers, Shipments, Quotations ──

  const allBranches = [mumbaiHq, delhi, chennai, colomboHq, kandy, jaffna];

  // ── Customer Users (via BA API) ──
  const customerDefs: { name: string; email: string; phone: string; branchId: string; tenantId: string }[] = [
    // Gajan Traders
    { name: 'Rajesh Patel', email: 'rajesh@gajantraders.com', phone: '+91-9876543210', branchId: mumbaiHq.id, tenantId: gajan!.id },
    { name: 'Priya Sharma', email: 'priya@gajantraders.com', phone: '+91-9876543211', branchId: mumbaiHq.id, tenantId: gajan!.id },
    { name: 'Amit Verma', email: 'amit@gajantraders.com', phone: '+91-9876543212', branchId: delhi.id, tenantId: gajan!.id },
    { name: 'Neha Gupta', email: 'neha@gajantraders.com', phone: '+91-9876543213', branchId: delhi.id, tenantId: gajan!.id },
    { name: 'Karthik Rajan', email: 'karthik@gajantraders.com', phone: '+91-9876543214', branchId: chennai.id, tenantId: gajan!.id },
    { name: 'Lakshmi Narayan', email: 'lakshmi@gajantraders.com', phone: '+91-9876543215', branchId: chennai.id, tenantId: gajan!.id },
    // Lanka Mahal
    { name: 'Saman Perera', email: 'saman@lankamahal.lk', phone: '+94-771234567', branchId: colomboHq.id, tenantId: lanka!.id },
    { name: 'Nimal Fernando', email: 'nimal@lankamahal.lk', phone: '+94-771234568', branchId: colomboHq.id, tenantId: lanka!.id },
    { name: 'Dinesh Silva', email: 'dinesh@lankamahal.lk', phone: '+94-771234569', branchId: kandy.id, tenantId: lanka!.id },
    { name: 'Kumari Jayasuriya', email: 'kumari@lankamahal.lk', phone: '+94-771234560', branchId: kandy.id, tenantId: lanka!.id },
    { name: 'Rajendran Sutha', email: 'rajendran@lankamahal.lk', phone: '+94-771234561', branchId: jaffna.id, tenantId: lanka!.id },
    { name: 'Tharshi Niranjan', email: 'tharshi@lankamahal.lk', phone: '+94-771234562', branchId: jaffna.id, tenantId: lanka!.id },
  ];

  const insertedCustomerUsers: Array<{ id: string; email: string; name: string; phone: string; branchId: string | null; tenantId: string | null }> = [];
  for (const c of customerDefs) {
    const existing = await db.select({ id: user.id, name: user.name, email: user.email, phone: user.phone, branchId: user.branchId, tenantId: user.tenantId })
      .from(user)
      .where(eq(user.email, c.email))
      .limit(1);
    if (existing.length > 0) {
      await db.update(user).set({ branchId: c.branchId, tenantId: c.tenantId }).where(eq(user.email, c.email));
      insertedCustomerUsers.push({ ...existing[0]!, phone: existing[0]!.phone ?? '', branchId: c.branchId, tenantId: c.tenantId });
      continue;
    }
    const created = await createUser({ email: c.email, password: 'Customer@123', name: c.name, role: 'customer', tenantId: c.tenantId, branchId: c.branchId, data: { phone: c.phone } });
    await db.update(user).set({ branchId: c.branchId, tenantId: c.tenantId }).where(eq(user.email, c.email));
    insertedCustomerUsers.push({
      id: created.user.id,
      email: created.user.email,
      name: created.user.name,
      phone: c.phone,
      branchId: c.branchId,
      tenantId: c.tenantId,
    });
  }
  const customerMap = new Map(insertedCustomerUsers.map((c) => [c.email, c]));
  console.log(`  Created ${insertedCustomerUsers.length} customer users`);

  // Clear existing seed data for FK-dependent tables
  await db.delete(quoteItems);
  await db.delete(invoices);
  await db.delete(quotations);
  await db.delete(shipments);
  await db.delete(trackingEvents);

  // ── Shipments ──
  const statuses = ['pending', 'info_received', 'in_transit', 'out_for_delivery', 'delivered', 'exception'];
  const carriers = ['FedEx', 'DHL', 'Blue Dart', 'DTDC', 'UPS', 'Aramex'];
  const origins = ['Mumbai, India', 'Delhi, India', 'Chennai, India', 'Colombo, Sri Lanka', 'Kandy, Sri Lanka', 'Jaffna, Sri Lanka', 'Shanghai, China', 'Hong Kong', 'Dubai, UAE', 'Singapore'];
  const destinations = ['New York, USA', 'London, UK', 'Sydney, Australia', 'Toronto, Canada', 'Berlin, Germany', 'Tokyo, Japan', 'Paris, France', 'Melbourne, Australia', 'Chicago, USA', 'Dubai, UAE'];

  const branchCustomerMap = new Map<string, typeof insertedCustomerUsers>();
  for (const c of insertedCustomerUsers) {
    const bId = c.branchId ?? '';
    if (!branchCustomerMap.has(bId)) {
      branchCustomerMap.set(bId, []);
    }
    branchCustomerMap.get(bId)!.push(c);
  }

  let shipmentCount = 0;
  const allShipments: Array<Record<string, unknown>> = [];

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
      const labelCode = `${carrier.toUpperCase().slice(0, 2)}${String(Date.now()).slice(-8)}${String(shipmentCount).padStart(4, '0')}`;
      const [senderCity, senderCountry] = origin.split(', ').map((s) => s.trim());
      const [recipCity, recipCountry] = dest.split(', ').map((s) => s.trim());
      const senderAddress = {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        street: `${Math.floor(Math.random() * 999) + 1} ${['Main St', 'Park Ave', 'MG Road', 'Lake View', 'Church St', 'Green Lane'][Math.floor(Math.random() * 6)]}`,
        city: senderCity ?? origin,
        state: '',
        pincode: String(100000 + Math.floor(Math.random() * 900000)),
        country: senderCountry ?? '',
      };
      const recipientAddress = {
        name: ['John Smith', 'Emma Wilson', 'Carlos Garcia', 'Yuki Tanaka', 'Sarah Johnson', 'Li Wei', 'Hans Mueller', 'Maria Lopez'][Math.floor(Math.random() * 8)],
        phone: ['+1-212-555-', '+44-20-', '+61-2-', '+49-30-', '+33-1-', '+81-3-', '+86-10-', '+65-'][Math.floor(Math.random() * 8)] + String(100000 + Math.floor(Math.random() * 900000)),
        email: `recipient${shipmentCount}@example.com`,
        street: `${Math.floor(Math.random() * 999) + 1} ${['Oak St', 'Broadway', 'King St', 'High St', 'Market St', '5th Ave'][Math.floor(Math.random() * 6)]}`,
        city: recipCity ?? dest,
        state: '',
        pincode: String(10000 + Math.floor(Math.random() * 90000)),
        country: recipCountry ?? '',
      };

      const [s] = await db
        .insert(shipments)
        .values({
          trackingNo: trackNum,
          status,
          userId: customer.id,
          carrier,
          origin,
          destination: dest,
          billAmount,
          labelCode,
          branchId: branch.id,
          tenantId: branch.tenantId,
          contactEmail: customer.email,
          contactPhone: customer.phone,
          senderAddress,
          recipientAddress,
          createdAt,
          updatedAt: createdAt,
          lastTrackedAt: createdAt,
        })
        .returning();

      allShipments.push(s as unknown as Record<string, unknown>);
      shipmentCount++;
    }
  }
  console.log(`  Created ${shipmentCount} shipments`);

  // ── Tracking Events ──
  const statusFlow: Record<string, { status: string; sub: string; desc: string }[]> = {
    pending:          [{ status: 'pending',          sub: 'order_placed',          desc: 'Shipment created and pending pickup' }],
    info_received:    [{ status: 'pending',          sub: 'order_placed',          desc: 'Shipment created and pending pickup' },
                       { status: 'info_received',    sub: 'info_received',         desc: 'Shipping information received from carrier' }],
    in_transit:       [{ status: 'pending',          sub: 'order_placed',          desc: 'Shipment created and pending pickup' },
                       { status: 'info_received',    sub: 'info_received',         desc: 'Shipping information received from carrier' },
                       { status: 'in_transit',       sub: 'picked_up',             desc: 'Package picked up and in transit' }],
    out_for_delivery: [{ status: 'pending',          sub: 'order_placed',          desc: 'Shipment created and pending pickup' },
                       { status: 'info_received',    sub: 'info_received',         desc: 'Shipping information received from carrier' },
                       { status: 'in_transit',       sub: 'arrived_at_sort',       desc: 'Arrived at sorting facility' },
                       { status: 'out_for_delivery', sub: 'out_for_delivery',      desc: 'Out for delivery' }],
    delivered:        [{ status: 'pending',          sub: 'order_placed',          desc: 'Shipment created and pending pickup' },
                       { status: 'info_received',    sub: 'info_received',         desc: 'Shipping information received from carrier' },
                       { status: 'in_transit',       sub: 'arrived_at_sort',       desc: 'Arrived at sorting facility' },
                       { status: 'out_for_delivery', sub: 'out_for_delivery',      desc: 'Out for delivery' },
                       { status: 'delivered',        sub: 'delivered',             desc: 'Package delivered successfully' }],
    exception:        [{ status: 'pending',          sub: 'order_placed',          desc: 'Shipment created and pending pickup' },
                       { status: 'in_transit',       sub: 'exception_scan',        desc: 'Exception encountered during transit' },
                       { status: 'exception',        sub: 'delivery_delayed',      desc: 'Delivery delayed due to operational issue' }],
  };

  const locations: Record<string, string[]> = {
    pending:          [],
    info_received:    [],
    in_transit:       ['Mumbai, India', 'Delhi, India', 'Chennai, India', 'Colombo, Sri Lanka', 'Singapore', 'Dubai, UAE', 'Hong Kong'],
    out_for_delivery: ['New York, USA', 'London, UK', 'Sydney, Australia', 'Toronto, Canada', 'Berlin, Germany'],
    delivered:        ['New York, USA', 'London, UK', 'Sydney, Australia', 'Toronto, Canada', 'Berlin, Germany'],
    exception:        ['Mumbai, India', 'Delhi, India', 'Singapore', 'Dubai, UAE'],
  };

  let eventCount = 0;
  for (const s of allShipments) {
    const flow = statusFlow[(s.status as string) ?? 'pending'] ?? statusFlow.pending!;
    const createdAt = new Date(s.createdAt as string);
    const branchId = s.branchId as string;
    const tenantId = s.tenantId as string;
    const carrier = s.carrier as string;

    const events = flow.map((e, i) => {
      const locs = locations[e.status] ?? [];
      const location = locs.length > 0 ? locs[Math.floor(Math.random() * locs.length)]! : null;
      const eventTime = new Date(createdAt.getTime() + (i + 1) * 3600000 * (2 + Math.floor(Math.random() * 6)));
      return {
        shipmentId: s.id as string,
        status: e.status,
        subStatus: e.sub,
        description: e.desc,
        location,
        carrier,
        carrierCode: (s.labelCode as string) ?? null,
        eventTime,
        branchId,
        tenantId,
      };
    });

    await db.insert(trackingEvents).values(events as any);
    eventCount += events.length;
  }
  console.log(`  Created ${eventCount} tracking events`);

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
          userId: customer.id,
          total: total.toFixed(2),
          validUntil: new Date(Date.now() + 30 * 86400000),
          branchId: branch.id,
          tenantId: branch.tenantId,
          notes: `Quote for ${customer.name} — ${branch.name}`,
          createdAt,
          updatedAt: createdAt,
        })
        .returning();

      if (!q) {
        console.error('Failed to create quotation');
        continue;
      }

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
