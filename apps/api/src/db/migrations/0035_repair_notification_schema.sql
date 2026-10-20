-- Repair schema drift for the notification table.
--
-- 0018_add_notifications.sql uses CREATE TABLE IF NOT EXISTS, so a production
-- database that already had an older/partial "notification" table (or was
-- baselined from a dump) was recorded as migrated without the table ever
-- matching the Drizzle schema. Every GET /api/notifications and
-- /api/notifications/unread-count then failed with 500 because the expected
-- columns were absent.
--
-- Keep this idempotent: it must be safe on a healthy database (all statements
-- become no-ops) and on one where the table is missing or partially created.

CREATE TABLE IF NOT EXISTS "notification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "quotation_id" uuid,
  "type" varchar(50) NOT NULL,
  "title" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "link" text,
  "read" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "archived_at" timestamp
);

-- Heal a table that exists but predates one or more columns. Columns added to
-- an existing table are nullable (or carry a default) so this works with rows
-- already present; the application always supplies tenant_id/user_id on insert.
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "quotation_id" uuid;
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "type" varchar(50) NOT NULL DEFAULT 'general';
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "title" varchar(255) NOT NULL DEFAULT '';
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "message" text NOT NULL DEFAULT '';
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "link" text;
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "read" boolean NOT NULL DEFAULT false;
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;

CREATE INDEX IF NOT EXISTS "idx_notification_tenant" ON "notification" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_notification_user" ON "notification" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notification_read" ON "notification" ("read");
CREATE INDEX IF NOT EXISTS "idx_notification_created_at" ON "notification" ("created_at");
