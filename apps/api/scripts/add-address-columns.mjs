import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

const rows = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('user','shipment') AND column_name IN ('address','sender_address','recipient_address')`;
console.log('existing:', JSON.stringify(rows));

await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "address" jsonb DEFAULT '{}'::jsonb`;
await sql`ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "sender_address" jsonb DEFAULT '{}'::jsonb`;
await sql`ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "recipient_address" jsonb DEFAULT '{}'::jsonb`;
console.log('columns added');

await sql.end();
process.exit(0);
