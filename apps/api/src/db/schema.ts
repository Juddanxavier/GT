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
  currency: varchar('currency', { length: 3 }).default('INR'),
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
},
  (table) => ({
    branchTenantIdx: index('branch_tenant_idx').on(table.tenantId),
  }),
);

export const tenantDomains = pgTable('tenant_domain', {
  id: uuid('id').defaultRandom().primaryKey(),
  domain: varchar('domain', { length: 255 }).notNull().unique(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const quotations = pgTable(
  'quotation',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quoteNo: varchar('quote_no', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('draft'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
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
    quotationUserIdx: index('quotation_user_idx').on(table.userId),
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
    providerTips: jsonb('provider_tips').default('{}'),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    trackingEventShipmentIdx: index('tracking_event_shipment_idx').on(table.shipmentId),
    trackingEventTenantIdx: index('tracking_event_tenant_idx').on(table.tenantId),
    trackingEventStatusIdx: index('tracking_event_status_idx').on(table.status),
    trackingEventBranchIdx: index('tracking_event_branch_idx').on(table.branchId),
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
    userId: text('user_id')
      .references(() => user.id, { onDelete: 'set null' }),
    carrier: varchar('carrier', { length: 100 }),
    estimatedDelivery: timestamp('estimated_delivery'),
    actualDelivery: timestamp('actual_delivery'),
    origin: text('origin'),
    destination: text('destination'),
    senderAddress: jsonb('sender_address').default('{}'),
    recipientAddress: jsonb('recipient_address').default('{}'),
    payload: jsonb('payload').notNull().default('{}'),
    billAmount: numeric('bill_amount', { precision: 12, scale: 2 }),
    labelCode: varchar('label_code', { length: 20 }),
    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'set null',
    }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    courierCode: varchar('courier_code', { length: 50 }),
    customerName: varchar('customer_name', { length: 255 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    trackingRegistered: boolean('tracking_registered').notNull().default(false),
    lastTrackedAt: timestamp('last_tracked_at'),
    trackingProvider: varchar('tracking_provider', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    archivedAt: timestamp('archived_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    shipmentTenantIdx: index('shipment_tenant_idx').on(table.tenantId),
    shipmentUserIdx: index('shipment_user_idx').on(table.userId),
    shipmentStatusIdx: index('shipment_status_idx').on(table.status),
    shipmentTrackingIdx: index('shipment_tracking_idx').on(table.trackingNo),
    shipmentTenantTrackingUnique: unique('shipment_tenant_tracking_unique').on(
      table.tenantId,
      table.trackingNo,
    ),
    shipmentBranchIdx: index('shipment_branch_idx').on(table.branchId),
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
    userId: text('user_id')
      .references(() => user.id, { onDelete: 'set null' }),
    invoiceNo: varchar('invoice_no', { length: 50 }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('unpaid'),
    notes: text('notes'),
    emailCount: integer('email_count').notNull().default(1),
    lastEmailSentAt: timestamp('last_email_sent_at').notNull().defaultNow(),
    paidAt: timestamp('paid_at'),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    archivedAt: timestamp('archived_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    invoiceTenantIdx: index('invoice_tenant_idx').on(table.tenantId),
    invoiceShipmentIdx: index('invoice_shipment_idx').on(table.shipmentId),
    invoiceUserIdx: index('invoice_user_idx').on(table.userId),
    invoiceBranchIdx: index('invoice_branch_idx').on(table.branchId),
    invoiceCreatedAtIdx: index('invoice_created_at_idx').on(table.createdAt),
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
    // Customer profile fields (from former customer table)
    phone: varchar('phone', { length: 50 }),
    address: jsonb('address').default('{}'),
    isActive: boolean('is_active').notNull().default(true),
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
    userBranchIdx: index('user_branch_idx').on(table.branchId),
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

// ── Phase 13: Onboard Tokens ──

export const onboardTokens = pgTable(
  'onboard_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    onboardTokenIdx: index('idx_onboard_tokens_token').on(table.token),
  }),
);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// ── Invitations ──

export const invitation = pgTable(
  'invitation',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    role: varchar('role', { length: 50 }).notNull().default('staff'),
    tenantId: uuid('tenant_id'),
    branchId: varchar('branch_id', { length: 255 }),
    token: text('token').notNull().unique(),
    invitedById: text('invited_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    invitationEmailIdx: index('idx_invitation_email').on(table.email),
    invitationTokenIdx: index('idx_invitation_token').on(table.token),
    invitationStatusIdx: index('idx_invitation_status').on(table.status),
  }),
);

// ── Phase 24: Audit Log ──

export const auditLogs = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    event: varchar('event', { length: 50 }).notNull(),
    userId: text('user_id'),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata').notNull().default('{}'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    auditLogEventIdx: index('idx_audit_log_event').on(table.event),
    auditLogUserIdIdx: index('idx_audit_log_user_id').on(table.userId),
    auditLogCreatedAtIdx: index('idx_audit_log_created_at').on(table.createdAt),
    auditLogTenantIdx: index('idx_audit_log_tenant_id').on(table.tenantId),
  }),
);

// ── Notification Preferences ──

export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  // Categories: delivery, exception, general — each with email and WhatsApp toggle
  deliveryEmail: boolean('delivery_email').notNull().default(true),
  deliveryWhatsapp: boolean('delivery_whatsapp').notNull().default(true),
  exceptionEmail: boolean('exception_email').notNull().default(true),
  exceptionWhatsapp: boolean('exception_whatsapp').notNull().default(true),
  generalEmail: boolean('general_email').notNull().default(true),
  generalWhatsapp: boolean('general_whatsapp').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
},
  (table) => ({
    notifPrefUserTenantUnique: unique('notif_pref_user_tenant_unique').on(table.userId, table.tenantId),
  }),
);

// ── Notifications ──

export const notifications = pgTable(
  'notification',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    quotationId: uuid('quotation_id').references(() => quotations.id, {
      onDelete: 'cascade',
    }),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    link: text('link'),
    read: boolean('read').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    archivedAt: timestamp('archived_at'),
  },
  (table) => ({
    notificationTenantIdx: index('idx_notification_tenant').on(table.tenantId),
    notificationUserIdx: index('idx_notification_user').on(table.userId),
    notificationReadIdx: index('idx_notification_read').on(table.read),
    notificationCreatedAtIdx: index('idx_notification_created_at').on(table.createdAt),
  }),
);


