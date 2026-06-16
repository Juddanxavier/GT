/** @format */

import {
  pgTable,
  text,
  uuid,
  varchar,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ── Custom Multi-Tenant Tables ──

export const tenants = pgTable('tenant', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  country: varchar('country', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const branches = pgTable('branch', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tenantDomains = pgTable('tenant_domain', {
  id: uuid('id').defaultRandom().primaryKey(),
  domain: varchar('domain', { length: 255 }).notNull().unique(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Phase 4: Admin Core CRUD Tables ──

export const customers = pgTable(
  'customer',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    address: text('address'),
    isActive: boolean('is_active').notNull().default(true),
    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'set null',
    }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    customerTenantIdx: index('customer_tenant_idx').on(table.tenantId),
    customerBranchIdx: index('customer_branch_idx').on(table.branchId),
  }),
);

export const quotations = pgTable(
  'quotation',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quoteNo: varchar('quote_no', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('draft'),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    validUntil: timestamp('valid_until'),
    notes: text('notes'),
    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'set null',
    }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    quotationTenantIdx: index('quotation_tenant_idx').on(table.tenantId),
    quotationCustomerIdx: index('quotation_customer_idx').on(table.customerId),
    quotationStatusIdx: index('quotation_status_idx').on(table.status),
  }),
);

export const quoteItems = pgTable(
  'quote_item',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quotationId: uuid('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull().default('1'),
    rate: numeric('rate', { precision: 12, scale: 2 }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    type: varchar('type', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    quoteItemQuotationIdx: index('quote_item_quotation_idx').on(table.quotationId),
  }),
);

// ── Phase 5: 17TRACK Tracking Events ──

export const trackingEvents = pgTable(
  'tracking_event',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    shipmentId: uuid('shipment_id')
      .notNull()
      .references(() => shipments.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).notNull(),
    subStatus: varchar('sub_status', { length: 50 }),
    description: text('description'),
    location: varchar('location', { length: 255 }),
    carrier: varchar('carrier', { length: 100 }),
    carrierCode: varchar('carrier_code', { length: 50 }),
    details: text('details'),
    eventTime: timestamp('event_time').notNull(),
    raw: jsonb('raw').notNull().default('{}'),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    trackingEventShipmentIdx: index('tracking_event_shipment_idx').on(table.shipmentId),
    trackingEventTenantIdx: index('tracking_event_tenant_idx').on(table.tenantId),
    trackingEventStatusIdx: index('tracking_event_status_idx').on(table.status),
    trackingEventDedup: unique('tracking_event_dedup').on(
      table.shipmentId,
      table.eventTime,
      table.subStatus,
    ),
  }),
);

export const shipments = pgTable(
  'shipment',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    trackingNo: varchar('tracking_no', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'restrict' }),
    carrier: varchar('carrier', { length: 100 }),
    estimatedDelivery: timestamp('estimated_delivery'),
    actualDelivery: timestamp('actual_delivery'),
    origin: text('origin'),
    destination: text('destination'),
    payload: jsonb('payload').notNull().default('{}'),
    billAmount: numeric('bill_amount', { precision: 12, scale: 2 }),
    labelCode: varchar('label_code', { length: 20 }),
    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'set null',
    }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    contactEmail: varchar('contact_email', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    trackingRegistered: boolean('tracking_registered').notNull().default(false),
    lastTrackedAt: timestamp('last_tracked_at'),
    trackingProvider: varchar('tracking_provider', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    shipmentTenantIdx: index('shipment_tenant_idx').on(table.tenantId),
    shipmentCustomerIdx: index('shipment_customer_idx').on(table.customerId),
    shipmentStatusIdx: index('shipment_status_idx').on(table.status),
    shipmentTrackingIdx: index('shipment_tracking_idx').on(table.trackingNo),
  }),
);

// ── Phase 7: Invoices ──

export const invoices = pgTable(
  'invoice',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    shipmentId: uuid('shipment_id')
      .notNull()
      .references(() => shipments.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    invoiceNo: varchar('invoice_no', { length: 50 }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('paid'),
    notes: text('notes'),
    emailCount: integer('email_count').notNull().default(1),
    lastEmailSentAt: timestamp('last_email_sent_at').notNull().defaultNow(),
    paidAt: timestamp('paid_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    invoiceTenantIdx: index('invoice_tenant_idx').on(table.tenantId),
    invoiceShipmentIdx: index('invoice_shipment_idx').on(table.shipmentId),
    invoiceCustomerIdx: index('invoice_customer_idx').on(table.customerId),
  }),
);

// ── Better Auth Core Tables (with custom extensions) ──

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    // Custom multi-tenant fields
    tenantId: uuid('tenant_id').references(() => tenants.id, {
      onDelete: 'set null',
    }),
    role: text('role')
      .notNull()
      .default('customer'),
    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'set null',
    }),
    // Admin plugin fields
    banned: boolean('banned').notNull().default(false),
    banReason: text('ban_reason'),
    banExpires: timestamp('ban_expires'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    tenantIdx: index('user_tenant_idx').on(table.tenantId),
    roleIdx: index('user_role_idx').on(table.role),
  }),
);

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  impersonatedBy: text('impersonated_by'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});
