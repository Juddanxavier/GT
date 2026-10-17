-- Notification preferences were declared in src/db/schema.ts but never migrated,
-- so every preference read/write failed at runtime and customer preferences were
-- silently ignored on every notification send.
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE cascade,
  "delivery_email" boolean NOT NULL DEFAULT true,
  "delivery_whatsapp" boolean NOT NULL DEFAULT true,
  "exception_email" boolean NOT NULL DEFAULT true,
  "exception_whatsapp" boolean NOT NULL DEFAULT true,
  "general_email" boolean NOT NULL DEFAULT true,
  "general_whatsapp" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "notif_pref_user_tenant_unique"
  ON "notification_preferences"("user_id", "tenant_id");
