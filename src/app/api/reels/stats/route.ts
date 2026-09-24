import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { ensureReelsSocialTables } from '@/lib/reelsSocial';

export async function GET(req: NextRequest) {
  try {
    await ensureReelsSocialTables();
    const user = await getSessionUser();
    const userId = new URL(req.url).searchParams.get('user_id') || user?.id;
    if (!userId) {
      return NextResponse.json({ success: false, message: 'User required' }, { status: 400 });
    }

    const posted = await query<any[]>(
      `SELECT COUNT(*) AS c FROM vendor_reels WHERE author_user_id = ? OR vendor_id = ?`,
      [userId, userId]
    );
    const received = await query<any[]>(
      `SELECT COALESCE(SUM(r.likes_count), 0) AS c
       FROM vendor_reels r
       WHERE r.author_user_id = ? OR r.vendor_id = ?`,
      [userId, userId]
    );
    const given = await query<any[]>(`SELECT COUNT(*) AS c FROM reel_likes WHERE user_id = ?`, [userId]);

    return NextResponse.json({
      success: true,
      data: {
        posted: Number(posted[0]?.c || 0),
        likes_received: Number(received[0]?.c || 0),
        likes_given: Number(given[0]?.c || 0),
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      data: { posted: 0, likes_received: 0, likes_given: 0 },
    });
  }
}
