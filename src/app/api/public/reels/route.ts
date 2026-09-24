import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureReelsSocialTables } from '@/lib/reelsSocial';

export async function GET() {
  try {
    await ensureReelsSocialTables();
    const reels = await query<any[]>(
      `SELECT r.id, r.vendor_id, r.video_url, r.thumbnail_url, r.title, r.description, r.created_at,
              r.likes_count, r.comments_count, r.shares_count,
              COALESCE(v.business_name, u.name) AS business_name,
              COALESCE(c.name, r.author_role, 'Member') AS category,
              v.city
       FROM vendor_reels r
       LEFT JOIN vendors v ON r.vendor_id = v.id
       LEFT JOIN users u ON u.id = r.author_user_id
       LEFT JOIN categories c ON v.category_id = c.id
       WHERE (r.status = 'APPROVED' OR r.is_approved = TRUE OR r.status IS NULL)
         AND r.video_url NOT LIKE 'data:%'
         AND CHAR_LENGTH(r.video_url) < 2048
       ORDER BY r.created_at DESC
       LIMIT 20`
    );
    return NextResponse.json({ success: true, reels });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to load reels feed', reels: [] }, { status: 500 });
  }
}
