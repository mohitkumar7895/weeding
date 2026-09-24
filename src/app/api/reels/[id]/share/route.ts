import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { ensureReelsSocialTables } from '@/lib/reelsSocial';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureReelsSocialTables();
    const user = await getSessionUser(_req);
    const { id } = await params;
    await query(`INSERT INTO reel_shares (id, reel_id, user_id) VALUES (?, ?, ?)`, [
      randomUUID(),
      id,
      user?.id || null,
    ]);
    await query(`UPDATE vendor_reels SET shares_count = shares_count + 1 WHERE id = ?`, [id]);
    const [row] = await query<any[]>(`SELECT shares_count FROM vendor_reels WHERE id = ?`, [id]);
    return NextResponse.json({ success: true, shares_count: row?.shares_count || 1 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
