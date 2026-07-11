import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);
const tables = ['quote_item', 'invoice', 'quotation', 'tracking_event', 'shipment', 'session', 'account', 'verification', 'user', 'branch', 'tenant_domain', 'tenant'];
for (const t of tables) {
  await sql.unsafe(`DELETE FROM "${t}"`);
  console.log(`cleared ${t}`);
}
await sql.end();
process.exit(0);
