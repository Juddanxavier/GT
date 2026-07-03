-- Add tenant_id column to audit_log table for direct tenant scoping
-- This replaces the subquery join pattern (WHERE userId IN SELECT id FROM user WHERE tenant_id = X)
-- which was a performance risk as audit logs grew and couldn't scope anonymous events.

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenant(id) ON DELETE SET NULL;

-- Add index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON audit_log(tenant_id);

-- Backfill tenant_id for existing records where the user has a tenant
UPDATE audit_log al
SET tenant_id = u.tenant_id
FROM "user" u
WHERE al.user_id = u.id
  AND al.tenant_id IS NULL
  AND u.tenant_id IS NOT NULL;
