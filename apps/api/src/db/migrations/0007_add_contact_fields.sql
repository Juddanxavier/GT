ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "contact_email" varchar(255);
ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "contact_phone" varchar(50);
