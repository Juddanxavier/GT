-- Add provider_tips column to tracking_events for provider-specific metadata
-- Add currency column to tenants for per-tenant currency config

ALTER TABLE tracking_event ADD COLUMN IF NOT EXISTS provider_tips jsonb DEFAULT '{}';

ALTER TABLE tenant ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'INR';
