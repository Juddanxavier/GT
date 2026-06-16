CREATE TABLE IF NOT EXISTS invoice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE RESTRICT,
  shipment_id UUID NOT NULL REFERENCES shipment(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
  invoice_no TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid',
  notes TEXT,
  email_count INTEGER NOT NULL DEFAULT 1,
  last_email_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoice_tenant_idx ON invoice(tenant_id);
CREATE INDEX IF NOT EXISTS invoice_shipment_idx ON invoice(shipment_id);
CREATE INDEX IF NOT EXISTS invoice_customer_idx ON invoice(customer_id);
