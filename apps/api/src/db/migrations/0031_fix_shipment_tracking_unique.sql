-- Align shipment tracking-number uniqueness with the code schema.
-- The old constraint (shipment_tenant_tracking_unique) was tenant-scoped and
-- included archived rows, which contradicts the route-level dedup check that
-- allows reusing a tracking number once its shipment is archived. Drop it and
-- create the partial global unique index that excludes archived shipments.

DROP INDEX IF EXISTS shipment_tenant_tracking_unique;

CREATE UNIQUE INDEX IF NOT EXISTS shipment_tracking_unique_idx
  ON shipment (tracking_no)
  WHERE archived_at IS NULL;
