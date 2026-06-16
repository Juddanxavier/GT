-- Add admin plugin fields to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS ban_reason text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS ban_expires timestamp;

-- Add admin plugin field to session table
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS impersonated_by text;
