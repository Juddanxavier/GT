CREATE TABLE IF NOT EXISTS "tracking_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "shipment_id" uuid NOT NULL REFERENCES "shipment"("id") ON DELETE CASCADE,
  "status" varchar(50) NOT NULL,
  "sub_status" varchar(50),
  "description" text,
  "location" varchar(255),
  "carrier" varchar(100),
  "carrier_code" varchar(50),
  "details" text,
  "event_time" timestamp NOT NULL,
  "raw" jsonb DEFAULT '{}' NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tracking_event_shipment_idx" ON "tracking_event" ("shipment_id");
CREATE INDEX IF NOT EXISTS "tracking_event_tenant_idx" ON "tracking_event" ("tenant_id");
CREATE INDEX IF NOT EXISTS "tracking_event_status_idx" ON "tracking_event" ("status");

ALTER TABLE "tracking_event" DROP CONSTRAINT IF EXISTS "tracking_event_dedup";
ALTER TABLE "tracking_event" ADD CONSTRAINT "tracking_event_dedup" UNIQUE ("shipment_id", "event_time", "sub_status");
