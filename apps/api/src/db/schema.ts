import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

// Placeholder: Auth-related tables will be added here in Phase 2
// Tenant and user schemas to be defined with Better Auth integration

export const __placeholder = pgTable('__placeholder', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
