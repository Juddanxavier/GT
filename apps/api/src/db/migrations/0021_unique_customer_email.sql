ALTER TABLE "customer" DROP CONSTRAINT IF EXISTS "customer_email_unique";
ALTER TABLE "customer" ADD CONSTRAINT "customer_email_unique" UNIQUE ("email");
