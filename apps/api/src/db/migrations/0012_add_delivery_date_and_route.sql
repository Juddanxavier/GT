ALTER TABLE shipment
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS destination text,
  ADD COLUMN IF NOT EXISTS estimated_delivery timestamp,
  ADD COLUMN IF NOT EXISTS actual_delivery timestamp,
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}';
