import { NextRequest, NextResponse } from 'next/server';
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
    if (!user) {
      return NextResponse.json({ success: false, message: 'Sign in to save' }, { status: 401 });
    }
    const { id } = await params;
    const existing = await query<any[]>(
      `SELECT reel_id FROM reel_saves WHERE reel_id = ? AND user_id = ?`,
      [id, user.id]
    );
    if (existing.length) {
      await query(`DELETE FROM reel_saves WHERE reel_id = ? AND user_id = ?`, [id, user.id]);
      await query(`UPDATE vendor_reels SET saves_count = GREATEST(0, COALESCE(saves_count, 0) - 1) WHERE id = ?`, [id]);
      const [row] = await query<any[]>(`SELECT COALESCE(saves_count, 0) AS saves_count FROM vendor_reels WHERE id = ?`, [id]);
      return NextResponse.json({ success: true, saved: false, saves_count: row?.saves_count || 0 });
    }
    await query(`INSERT INTO reel_saves (reel_id, user_id) VALUES (?, ?)`, [id, user.id]);
    await query(`UPDATE vendor_reels SET saves_count = COALESCE(saves_count, 0) + 1 WHERE id = ?`, [id]);
    const [row] = await query<any[]>(`SELECT COALESCE(saves_count, 0) AS saves_count FROM vendor_reels WHERE id = ?`, [id]);
    return NextResponse.json({ success: true, saved: true, saves_count: row?.saves_count || 1 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
