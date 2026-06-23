-- Phase 4: Admin Core CRUD tables

CREATE TABLE IF NOT EXISTS "customer" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "email" varchar(255),
  "phone" varchar(50),
  "address" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "branch_id" uuid REFERENCES "public"."branch"("id") ON DELETE SET NULL,
  "tenant_id" uuid NOT NULL REFERENCES "public"."tenant"("id") ON DELETE RESTRICT,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "quotation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "quote_no" varchar(50) NOT NULL,
  "status" varchar(50) DEFAULT 'draft' NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "public"."customer"("id") ON DELETE RESTRICT,
  "total" numeric(12, 2) NOT NULL,
  "valid_until" timestamp,
  "notes" text,
  "branch_id" uuid REFERENCES "public"."branch"("id") ON DELETE SET NULL,
  "tenant_id" uuid NOT NULL REFERENCES "public"."tenant"("id") ON DELETE RESTRICT,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "quote_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "quotation_id" uuid NOT NULL REFERENCES "public"."quotation"("id") ON DELETE CASCADE,
  "description" text NOT NULL,
  "quantity" numeric(12, 2) DEFAULT '1' NOT NULL,
  "rate" numeric(12, 2) NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "type" varchar(100),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "shipment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tracking_no" varchar(255) NOT NULL,
  "status" varchar(50) DEFAULT 'pending' NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "public"."customer"("id") ON DELETE RESTRICT,
  "carrier" varchar(100),
  "estimated_delivery" timestamp,
  "actual_delivery" timestamp,
  "origin" text,
  "destination" text,
  "payload" jsonb DEFAULT '{}' NOT NULL,
  "branch_id" uuid REFERENCES "public"."branch"("id") ON DELETE SET NULL,
  "tenant_id" uuid NOT NULL REFERENCES "public"."tenant"("id") ON DELETE RESTRICT,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "customer_tenant_idx" ON "customer" ("tenant_id");
CREATE INDEX IF NOT EXISTS "customer_branch_idx" ON "customer" ("branch_id");
CREATE INDEX IF NOT EXISTS "quotation_tenant_idx" ON "quotation" ("tenant_id");
CREATE INDEX IF NOT EXISTS "quotation_customer_idx" ON "quotation" ("customer_id");
CREATE INDEX IF NOT EXISTS "quotation_status_idx" ON "quotation" ("status");
CREATE INDEX IF NOT EXISTS "quote_item_quotation_idx" ON "quote_item" ("quotation_id");
CREATE INDEX IF NOT EXISTS "shipment_tenant_idx" ON "shipment" ("tenant_id");
CREATE INDEX IF NOT EXISTS "shipment_customer_idx" ON "shipment" ("customer_id");
CREATE INDEX IF NOT EXISTS "shipment_status_idx" ON "shipment" ("status");
CREATE INDEX IF NOT EXISTS "shipment_tracking_idx" ON "shipment" ("tracking_no");

-- RLS: Enable row-level security
ALTER TABLE "customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quotation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quote_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shipment" ENABLE ROW LEVEL SECURITY;

-- RLS: Tenant isolation policies
DROP POLICY IF EXISTS "customer_tenant_isolation" ON "customer";
CREATE POLICY "customer_tenant_isolation" ON "customer"
  USING (tenant_id::text = current_setting('app.tenant_id', true) OR current_setting('app.tenant_id', true) = 'superadmin');

DROP POLICY IF EXISTS "quotation_tenant_isolation" ON "quotation";
CREATE POLICY "quotation_tenant_isolation" ON "quotation"
  USING (tenant_id::text = current_setting('app.tenant_id', true) OR current_setting('app.tenant_id', true) = 'superadmin');

DROP POLICY IF EXISTS "quote_item_tenant_isolation" ON "quote_item";
CREATE POLICY "quote_item_tenant_isolation" ON "quote_item"
  USING (quotation_id IN (SELECT id FROM "quotation" WHERE tenant_id::text = current_setting('app.tenant_id', true) OR current_setting('app.tenant_id', true) = 'superadmin'));

DROP POLICY IF EXISTS "shipment_tenant_isolation" ON "shipment";
CREATE POLICY "shipment_tenant_isolation" ON "shipment"
  USING (tenant_id::text = current_setting('app.tenant_id', true) OR current_setting('app.tenant_id', true) = 'superadmin');
