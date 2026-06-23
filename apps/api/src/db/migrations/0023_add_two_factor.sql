-- Add two-factor auth columns and table

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "two_factor" (
    "id" text PRIMARY KEY,
    "secret" text NOT NULL,
    "backup_codes" text NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "verified" boolean NOT NULL DEFAULT true,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_two_factor_user_id" ON "two_factor" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_two_factor_secret" ON "two_factor" ("secret");
