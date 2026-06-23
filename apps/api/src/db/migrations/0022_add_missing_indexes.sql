-- Missing B-tree indexes for foreign key columns
CREATE INDEX IF NOT EXISTS "idx_shipment_branch_id" ON "shipment" ("branch_id");
CREATE INDEX IF NOT EXISTS "idx_branch_tenant_id" ON "branch" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_invoice_created_at" ON "invoice" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_branch_id" ON "user" ("branch_id");
CREATE INDEX IF NOT EXISTS "idx_account_user_id" ON "account" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_session_user_id" ON "session" ("user_id");

-- pg_trgm extension for fuzzy text search on leading-wildcard LIKE queries
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "idx_invoice_invoice_no_trgm" ON "invoice" USING gin ("invoice_no" gin_trgm_ops);
