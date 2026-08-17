-- Add a URL-friendly unique slug to branches for pretty detail URLs.
-- Backfill existing branches with a slugified name, deduped per tenant.

ALTER TABLE "branch" ADD COLUMN IF NOT EXISTS "slug" varchar(100);

UPDATE "branch" SET "slug" = lower(regexp_replace(regexp_replace(trim("name"), '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'));

ALTER TABLE "branch" ALTER COLUMN "slug" SET NOT NULL;

-- Deduplicate per tenant: append -2, -3, ... for colliding slugs
DO $$
DECLARE
  b RECORD;
  base text;
  candidate text;
  n int;
BEGIN
  FOR b IN SELECT id, "tenant_id", "slug" FROM "branch" ORDER BY "created_at", "id" LOOP
    base := b.slug;
    candidate := base;
    n := 2;
    WHILE EXISTS (SELECT 1 FROM "branch" WHERE "tenant_id" = b."tenant_id" AND "slug" = candidate AND "id" <> b.id) LOOP
      candidate := base || '-' || n;
      n := n + 1;
    END LOOP;
    IF candidate <> b.slug THEN
      UPDATE "branch" SET "slug" = candidate WHERE "id" = b.id;
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS branch_tenant_slug_unique_idx
  ON "branch" ("tenant_id", "slug");
