-- Add branch_id to tracking_event for branch-level filtering
ALTER TABLE tracking_event ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branch(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tracking_event_branch_idx ON tracking_event(branch_id);

-- Add branch_id to invoice for branch-level filtering
ALTER TABLE invoice ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branch(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS invoice_branch_idx ON invoice(branch_id);

-- Add unique constraint on (tenant_id, tracking_no) to prevent cross-tenant webhook ambiguity
-- and ensure no duplicate tracking numbers within a tenant
-- Remove the standalone tracking_no index (replaced by the composite unique index)
DROP INDEX IF EXISTS shipment_tracking_idx;
CREATE UNIQUE INDEX IF NOT EXISTS shipment_tenant_tracking_unique ON shipment(tenant_id, tracking_no);
