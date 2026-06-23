-- Add archived_at to shipment for soft-delete archive support
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS shipment_archived_at_idx ON shipment(archived_at);

-- Add archived_at to tracking_event
ALTER TABLE tracking_event ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS tracking_event_archived_at_idx ON tracking_event(archived_at);

-- Add archived_at to invoice
ALTER TABLE invoice ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS invoice_archived_at_idx ON invoice(archived_at);
