CREATE TABLE IF NOT EXISTS "rate_card" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE cascade,
  "destination_country" varchar(100) NOT NULL,
  "currency" varchar(3) DEFAULT 'INR',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by" text REFERENCES "user"("id") ON DELETE set null,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "rate_card_tenant_idx" ON "rate_card"("tenant_id");
CREATE INDEX IF NOT EXISTS "rate_card_country_idx" ON "rate_card"("destination_country");
CREATE INDEX IF NOT EXISTS "rate_card_active_idx" ON "rate_card"("is_active");

CREATE TABLE IF NOT EXISTS "shipping_rate" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rate_card_id" uuid NOT NULL REFERENCES "rate_card"("id") ON DELETE cascade,
  "package_type" varchar(50) NOT NULL,
  "service_type" varchar(50) NOT NULL,
  "weight_from" numeric(10,2) NOT NULL,
  "weight_to" numeric(10,2) NOT NULL,
  "rate" numeric(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS "shipping_rate_card_idx" ON "shipping_rate"("rate_card_id");
CREATE INDEX IF NOT EXISTS "shipping_rate_package_idx" ON "shipping_rate"("package_type");
CREATE INDEX IF NOT EXISTS "shipping_rate_service_idx" ON "shipping_rate"("service_type");
