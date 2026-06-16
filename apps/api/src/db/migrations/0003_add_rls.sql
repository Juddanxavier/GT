-- RLS: Defense-in-depth for tenant isolation

CREATE OR REPLACE FUNCTION is_tenant_accessible(check_tenant_id uuid)
RETURNS boolean AS $$
DECLARE
  session_tenant text;
BEGIN
  session_tenant := current_setting('app.tenant_id', true);

  IF session_tenant IS NULL OR session_tenant = 'superadmin' THEN
    RETURN true;
  END IF;

  RETURN session_tenant = check_tenant_id::text;
END;
$$ LANGUAGE plpgsql STABLE;

ALTER TABLE "tenant" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "tenant"
  FOR ALL
  USING (is_tenant_accessible(id));

ALTER TABLE "branch" ENABLE ROW LEVEL SECURITY;

CREATE POLICY branch_isolation ON "branch"
  FOR ALL
  USING (is_tenant_accessible(tenant_id));

ALTER TABLE "tenant_domain" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_domain_isolation ON "tenant_domain"
  FOR ALL
  USING (is_tenant_accessible(tenant_id));

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation ON "user"
  FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = 'superadmin'
    OR tenant_id::text = current_setting('app.tenant_id', true)
  );
