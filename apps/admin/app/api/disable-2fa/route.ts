import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { user as userTable, twoFactor as twoFactorTable } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('X-Seed-Secret');
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });
  const db = getDb();
  const [existing] = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, email)).limit(1);
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  await db.delete(twoFactorTable).where(eq(twoFactorTable.userId, existing.id));
  await db.update(userTable).set({ twoFactorEnabled: false }).where(eq(userTable.id, existing.id));
  return NextResponse.json({ message: `2FA disabled for ${email}` });
}
