ALTER TABLE "shipment" DROP COLUMN IF EXISTS "order_no";
ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "label_code" varchar(20);
