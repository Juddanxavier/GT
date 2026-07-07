-- Enable pg_trgm extension for indexed LIKE/search on shipments
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index on shipment search fields using pg_trgm ops
CREATE INDEX IF NOT EXISTS shipment_search_trgm_idx ON shipment USING GIN (
  tracking_no gin_trgm_ops,
  customer_name gin_trgm_ops,
  origin gin_trgm_ops,
  destination gin_trgm_ops
);
