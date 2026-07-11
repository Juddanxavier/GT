-- Add jsonb address columns to user and shipment tables
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "address" jsonb DEFAULT '{}'::jsonb;
ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "sender_address" jsonb DEFAULT '{}'::jsonb;
ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "recipient_address" jsonb DEFAULT '{}'::jsonb;
