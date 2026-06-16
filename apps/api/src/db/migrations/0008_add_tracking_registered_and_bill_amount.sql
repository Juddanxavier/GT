-- Add tracking integration columns (may already exist from manual runs)
ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "tracking_registered" boolean DEFAULT false NOT NULL;
ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "last_tracked_at" timestamp;
ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "tracking_provider" varchar(50);

-- Add bill_amount column replacing payload-based bill amount
ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "bill_amount" numeric(12, 2);
