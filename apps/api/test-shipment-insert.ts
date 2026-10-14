import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { logger } from './src/logger';

// Try root .env first, then fallback to ../../.env (when run from apps/api)
const envPath = ['.env', '../../.env'].find((p) => {
  try { readFileSync(p, 'utf-8'); return true; } catch { return false; }
});
if (!envPath) throw new Error('.env not found');
const env = readFileSync(envPath, 'utf-8');
const vars: Record<string, string> = {};
for (const line of env.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  vars[t.slice(0, i).trim()] = v;
}

async function main() {
  const sql = postgres(vars.DATABASE_URL!, { max: 1, ssl: 'require' });
  try {
    const trackingNo = `TEST-MANUAL-${Date.now()}`;
    const r = await sql`
      insert into "shipment" ("tracking_no","carrier","payload","tenant_id","tracking_provider")
      values (${trackingNo}, ${'FedEx'}, ${'{"billAmount":"34000"}'}, ${'346569e2-1bd8-47a5-a6dc-ed46e2094543'}, ${'100003'})
      returning *
    `;
    logger.info({ result: r }, 'shipment insert ok');
  } catch (e: any) {
    logger.error(
      {
        err: e,
        message: e.message?.substring(0, 200),
        code: e.code,
        detail: e.detail,
        severity: e.severity,
        constraint: e.constraint,
        keys: Object.getOwnPropertyNames(e),
      },
      'shipment insert failed',
    );
  }
  await sql.end();
}

main().catch((e) => {
  logger.error({ err: e }, 'test shipment insert failed');
});
