import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface ArchiveResult {
  archived: number;
  skeletonized: number;
  purged: number;
}

const archiveAfterDays = Number(process.env.ARCHIVE_AFTER_DAYS) || 90;
const skeletonizeAfterDays = Number(process.env.SKELETONIZE_AFTER_DAYS) || 365;
const purgeAfterDays = Number(process.env.PURGE_AFTER_DAYS) || 1460;

export async function runArchive(): Promise<ArchiveResult> {
  // Step 1: Archive terminal shipments > archiveAfterDays old
  const archiveRows = await db.execute(sql`
    WITH newly_archived AS (
      UPDATE shipment
      SET archived_at = NOW()
      WHERE status IN ('delivered', 'exception', 'failed_attempt')
        AND archived_at IS NULL
        AND updated_at < NOW() - INTERVAL '1 day' * ${archiveAfterDays}
      RETURNING id, archived_at
    )
    , archived_events AS (
      UPDATE tracking_event
      SET archived_at = newly_archived.archived_at
      FROM newly_archived
      WHERE tracking_event.shipment_id = newly_archived.id
        AND tracking_event.archived_at IS NULL
    )
    UPDATE invoice
    SET archived_at = newly_archived.archived_at
    FROM newly_archived
    WHERE invoice.shipment_id = newly_archived.id
      AND invoice.archived_at IS NULL
    SELECT COUNT(*)::int AS count FROM newly_archived
  `);
  const archived = Number(archiveRows[0]?.count ?? 0);

  // Step 2: Skeletonize shipments archived > skeletonizeAfterDays
  const skeletonRows = await db.execute(sql`
    WITH skeletonized AS (
      UPDATE shipment
      SET
        carrier = NULL,
        origin = NULL,
        estimated_delivery = NULL,
        actual_delivery = NULL,
        last_tracked_at = NULL,
        tracking_registered = false,
        tracking_provider = NULL
      WHERE archived_at IS NOT NULL
        AND archived_at < NOW() - INTERVAL '1 day' * ${skeletonizeAfterDays}
        AND (carrier IS NOT NULL OR origin IS NOT NULL)
      RETURNING id
    )
    , purged_events AS (
      DELETE FROM tracking_event
      WHERE shipment_id IN (SELECT id FROM skeletonized)
    )
    , purged_invoice_fields AS (
      UPDATE invoice
      SET
        notes = NULL,
        email_count = 1,
        last_email_sent_at = paid_at
      WHERE shipment_id IN (SELECT id FROM skeletonized)
    )
    SELECT COUNT(*)::int AS count FROM skeletonized
  `);
  const skeletonized = Number(skeletonRows[0]?.count ?? 0);

  // Step 3: Full purge at purgeAfterDays (delete shipment + invoice records entirely)
  const purgeRows = await db.execute(sql`
    WITH purged_invoices AS (
      DELETE FROM invoice
      WHERE archived_at IS NOT NULL
        AND archived_at < NOW() - INTERVAL '1 day' * ${purgeAfterDays}
    )
    DELETE FROM shipment
    WHERE archived_at IS NOT NULL
      AND archived_at < NOW() - INTERVAL '1 day' * ${purgeAfterDays}
    RETURNING id
  `);
  const purged = purgeRows.length;

  return { archived, skeletonized, purged };
}
