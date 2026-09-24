import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { ensureReelsSocialTables } from '@/lib/reelsSocial';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureReelsSocialTables();
    const { id } = await params;
    const comments = await query<any[]>(
      `SELECT c.id, c.body, c.created_at, c.user_id, u.name AS author_name
       FROM reel_comments c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.reel_id = ?
       ORDER BY c.created_at DESC
       LIMIT 100`,
      [id]
    );
    return NextResponse.json({ success: true, data: comments });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureReelsSocialTables();
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Sign in to comment' }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const text = String(body.body || body.text || '').trim();
    if (!text) {
      return NextResponse.json({ success: false, message: 'Comment cannot be empty' }, { status: 400 });
    }
    const commentId = randomUUID();
    await query(
      `INSERT INTO reel_comments (id, reel_id, user_id, body) VALUES (?, ?, ?, ?)`,
      [commentId, id, user.id, text.slice(0, 500)]
    );
    await query(`UPDATE vendor_reels SET comments_count = comments_count + 1 WHERE id = ?`, [id]);
    return NextResponse.json({
      success: true,
      comment: { id: commentId, body: text.slice(0, 500), author_name: user.name, created_at: new Date().toISOString(), user_id: user.id },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
