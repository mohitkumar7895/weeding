import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { applyGuestCookie, ensureReelsSocialTables, reelActorId, vendorIdForUser } from '@/lib/reelsSocial';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function feedRows(viewerId?: string, authorId?: string) {
  const extraJoin = viewerId
    ? `LEFT JOIN reel_likes rl ON rl.reel_id = r.id AND rl.user_id = ?
       LEFT JOIN reel_saves rs ON rs.reel_id = r.id AND rs.user_id = ?`
    : '';
  const extraSelect = viewerId
    ? `, (rl.user_id IS NOT NULL) AS liked_by_me, (rs.user_id IS NOT NULL) AS saved_by_me`
    : `, 0 AS liked_by_me, 0 AS saved_by_me`;
  const params: any[] = viewerId ? [viewerId, viewerId] : [];
  let authorWhere = '';
  if (authorId) {
    authorWhere = ` AND (r.author_user_id = ? OR r.vendor_id = ?)`;
    params.push(authorId, authorId);
  }
  return query<any[]>(
    `SELECT
        r.id, r.vendor_id, r.author_user_id, r.author_role, r.video_url, r.thumbnail_url,
        r.title, r.description, r.views_count, r.likes_count, r.comments_count, r.shares_count,
        COALESCE(r.saves_count, 0) AS saves_count,
        r.status, r.created_at,
        COALESCE(v.business_name, u.name, 'WedWithMe') AS author_name,
        COALESCE(r.author_role, u.role, 'CUSTOMER') AS poster_role,
        COALESCE(r.author_user_id, r.vendor_id) AS profile_id,
        (
          SELECT COUNT(*) FROM vendor_reels p
          WHERE p.video_url NOT LIKE 'data:%'
            AND CHAR_LENGTH(p.video_url) < 2048
            AND (
              (r.author_user_id IS NOT NULL AND p.author_user_id = r.author_user_id)
              OR (r.author_user_id IS NULL AND p.vendor_id = r.vendor_id)
            )
        ) AS author_posts
        ${extraSelect}
     FROM vendor_reels r
     LEFT JOIN users u ON u.id = COALESCE(r.author_user_id, r.vendor_id)
     LEFT JOIN vendors v ON v.id = r.vendor_id
     ${extraJoin}
     WHERE (r.status = 'APPROVED' OR r.is_approved = TRUE OR r.status IS NULL)
       AND r.video_url IS NOT NULL
       AND TRIM(r.video_url) <> ''
       AND r.video_url NOT LIKE 'data:%'
       AND CHAR_LENGTH(r.video_url) > 8
       AND CHAR_LENGTH(r.video_url) < 2048
       ${authorWhere}
     ORDER BY r.created_at DESC
     LIMIT 20`,
    params
  );
}

export async function GET(req: NextRequest) {
  try {
    await ensureReelsSocialTables();
    const user = await getSessionUser(req);
    const search = new URL(req.url);
    const mine = search.searchParams.get('mine') === '1';
    const bundle = search.searchParams.get('bundle') === '1';
    const authorId = search.searchParams.get('user') || '';

    if (mine && !bundle) {
      if (!user) {
        return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
      }
      const rows = await query<any[]>(
        `SELECT r.id, r.video_url, r.thumbnail_url, r.title, r.likes_count, r.comments_count, r.shares_count,
                COALESCE(v.business_name, u.name) AS author_name
         FROM vendor_reels r
         LEFT JOIN users u ON u.id = r.author_user_id
         LEFT JOIN vendors v ON v.id = r.vendor_id
         WHERE (r.author_user_id = ? OR r.vendor_id = ?)
           AND r.video_url NOT LIKE 'data:%'
           AND CHAR_LENGTH(r.video_url) < 2048
         ORDER BY r.created_at DESC LIMIT 24`,
        [user.id, user.vendor_id || user.id]
      );
      return NextResponse.json({ success: true, data: rows, reels: rows });
    }

    const { actorId, setGuest } = await reelActorId(req);
    const reels = await feedRows(actorId, authorId || undefined);
    if (!bundle) {
      return applyGuestCookie(NextResponse.json({ success: true, data: reels, reels }), setGuest);
    }

    let mineRows: any[] = [];
    let stats = { posted: 0, likes_received: 0, likes_given: 0 };
    if (user) {
      const [mineResult, posted, received, given] = await Promise.all([
        query<any[]>(
          `SELECT r.id, r.video_url, r.thumbnail_url, r.title, r.likes_count
           FROM vendor_reels r
           WHERE (r.author_user_id = ? OR r.vendor_id = ?)
             AND r.video_url NOT LIKE 'data:%'
             AND CHAR_LENGTH(r.video_url) < 2048
           ORDER BY r.created_at DESC LIMIT 12`,
          [user.id, user.vendor_id || user.id]
        ),
        query<any[]>(
          `SELECT COUNT(*) AS c FROM vendor_reels WHERE author_user_id = ? OR vendor_id = ?`,
          [user.id, user.vendor_id || user.id]
        ),
        query<any[]>(
          `SELECT COALESCE(SUM(likes_count), 0) AS c FROM vendor_reels WHERE author_user_id = ? OR vendor_id = ?`,
          [user.id, user.vendor_id || user.id]
        ),
        query<any[]>(`SELECT COUNT(*) AS c FROM reel_likes WHERE user_id = ?`, [user.id]),
      ]);
      mineRows = mineResult;
      stats = {
        posted: Number(posted[0]?.c || 0),
        likes_received: Number(received[0]?.c || 0),
        likes_given: Number(given[0]?.c || 0),
      };
    }
    return applyGuestCookie(
      NextResponse.json({ success: true, data: reels, reels, mine: mineRows, stats }),
      setGuest
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureReelsSocialTables();
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, code: 'AUTH_REQUIRED', message: 'Sign in to post a reel', login: '/login?next=/reels' },
        { status: 401 }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, message: 'Upload a video file from your device. Video URLs are not allowed.' },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const title = String(form.get('title') || form.get('caption') || '').trim();
    const description = String(form.get('description') || title).trim();

    if (!file || file.size <= 0) {
      return NextResponse.json({ success: false, message: 'Choose a video from your gallery or camera.' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ success: false, message: 'Add a caption' }, { status: 400 });
    }

    const mimeType = (file.type || 'video/mp4').toLowerCase();
    const { storageService } = await import('@/services/storageService');
    const validation = storageService.validatePortfolioMedia(file.size, mimeType, 'VIDEO');
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storageService.saveFile(buffer, file.name || 'reel.mp4', mimeType, 'reels');

    const vendorId = user.role === 'VENDOR' ? (await vendorIdForUser(user.id)) || user.vendor_id || null : null;
    const reelId = randomUUID();
    await query(
      `INSERT INTO vendor_reels (
         id, vendor_id, author_user_id, author_role, video_url, thumbnail_url, title, description,
         status, is_approved, likes_count, comments_count, shares_count, views_count
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', TRUE, 0, 0, 0, 0)`,
      [reelId, vendorId, user.id, user.role, stored.url, null, title.slice(0, 180), description]
    );

    const [reel] = await query<any[]>(
      `SELECT r.*, COALESCE(v.business_name, u.name, ?) AS author_name,
              COALESCE(r.author_user_id, r.vendor_id) AS profile_id,
              1 AS author_posts, 1 AS saved_by_me
       FROM vendor_reels r
       LEFT JOIN users u ON u.id = r.author_user_id
       LEFT JOIN vendors v ON v.id = r.vendor_id
       WHERE r.id = ?`,
      [user.name || 'Member', reelId]
    );
    try {
      await query(`INSERT IGNORE INTO reel_saves (reel_id, user_id) VALUES (?, ?)`, [reelId, user.id]);
      await query(`UPDATE vendor_reels SET saves_count = 1 WHERE id = ?`, [reelId]);
    } catch {
      /* save table may still be creating */
    }
    return NextResponse.json({ success: true, reel, data: reel });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
