import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { applyGuestCookie, ensureReelsSocialTables, reelActorId } from '@/lib/reelsSocial';

function asRows(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rows)) return result.rows;
  return [];
}

function reelIdFrom(req: NextRequest, params: { id?: string } | undefined) {
  const fromParams = String(params?.id || '').trim();
  if (fromParams) return fromParams;
  const parts = req.nextUrl.pathname.split('/').filter(Boolean);
  const reelsAt = parts.indexOf('reels');
  if (reelsAt >= 0 && parts[reelsAt + 1]) return decodeURIComponent(parts[reelsAt + 1]);
  return '';
}

async function countLikes(reelId: string) {
  const rows = asRows(await query<any[]>(`SELECT COUNT(*) AS c FROM reel_likes WHERE reel_id = ?`, [reelId]));
  return Number(rows[0]?.c || 0);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await ensureReelsSocialTables();
    const { actorId, setGuest } = await reelActorId(req);

    const params = await Promise.resolve(context.params);
    const id = reelIdFrom(req, params);
    if (!id) {
      return NextResponse.json({ success: false, message: 'Reel id missing' }, { status: 400 });
    }

    const existing = asRows(
      await query<any[]>(`SELECT user_id FROM reel_likes WHERE reel_id = ? AND user_id = ? LIMIT 1`, [id, actorId])
    );

    if (existing.length) {
      await query(`DELETE FROM reel_likes WHERE reel_id = ? AND user_id = ?`, [id, actorId]);
    } else {
      await query(`INSERT IGNORE INTO reel_likes (reel_id, user_id) VALUES (?, ?)`, [id, actorId]);
    }

    const likesCount = await countLikes(id);
    await query(`UPDATE vendor_reels SET likes_count = ? WHERE id = ?`, [likesCount, id]);

    return applyGuestCookie(
      NextResponse.json({
        success: true,
        liked: existing.length === 0,
        likes_count: likesCount,
      }),
      setGuest
    );
  } catch (error: any) {
    console.error('[reel like]', error?.code || '', error?.message);
    return NextResponse.json({ success: false, message: error.message || 'Like failed' }, { status: 500 });
  }
}
