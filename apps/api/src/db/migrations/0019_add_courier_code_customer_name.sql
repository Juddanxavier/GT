ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "courier_code" varchar(50);
ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "customer_name" varchar(255);
