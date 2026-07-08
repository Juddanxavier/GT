-- Phase 6: Consolidate customer table into user table
--
-- EXECUTION ORDER (production):
--   1. Run data migration script FIRST:
--      tsx .planning/phases/06-consolidate-customer-table-into-user-profile/migrate-customers.ts
--      Creates BA user accounts from old customer records + sets user_id on shipments/invoices/quotations.
--   2. Apply this SQL migration SECOND (via drizzle-kit migrate).
--
-- Idempotent: all operations use IF EXISTS / IF NOT EXISTS guards.

-- Step 1: Add phone and is_active to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone varchar(50);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Step 2: Add user_id to shipment (nullable, FK, onDelete set null)
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS user_id text REFERENCES "user"(id) ON DELETE SET NULL;

-- Step 3: Drop old shipment FK and customer_id
ALTER TABLE shipment DROP CONSTRAINT IF EXISTS shipment_customer_id_customer_id_fk;
ALTER TABLE shipment DROP COLUMN IF EXISTS customer_id;

-- Step 4: Add user_id to invoice (nullable, FK, onDelete set null)
ALTER TABLE invoice ADD COLUMN IF NOT EXISTS user_id text REFERENCES "user"(id) ON DELETE SET NULL;

-- Step 5: Drop old invoice FK and customer_id
ALTER TABLE invoice DROP CONSTRAINT IF EXISTS invoice_customer_id_customer_id_fk;
ALTER TABLE invoice DROP COLUMN IF EXISTS customer_id;

-- Step 6: Add user_id to quotation (nullable initially, FK, onDelete restrict)
ALTER TABLE quotation ADD COLUMN IF NOT EXISTS user_id text REFERENCES "user"(id) ON DELETE RESTRICT;

-- Step 7: Drop old quotation FK and customer_id
ALTER TABLE quotation DROP CONSTRAINT IF EXISTS quotation_customer_id_customer_id_fk;
ALTER TABLE quotation DROP COLUMN IF EXISTS customer_id;

-- Step 8: Make user_id NOT NULL on quotation (safe — data migration script already set values)
ALTER TABLE quotation ALTER COLUMN user_id SET NOT NULL;

-- Step 9: Drop customer table (all FK constraints removed above)
DROP TABLE IF EXISTS customer CASCADE;

-- Step 10: Replace old indexes with new ones
DROP INDEX IF EXISTS shipment_customer_idx;
DROP INDEX IF EXISTS invoice_customer_idx;
DROP INDEX IF EXISTS quotation_customer_idx;

CREATE INDEX IF NOT EXISTS shipment_user_idx ON shipment(user_id);
CREATE INDEX IF NOT EXISTS invoice_user_idx ON invoice(user_id);
CREATE INDEX IF NOT EXISTS quotation_user_idx ON quotation(user_id);
