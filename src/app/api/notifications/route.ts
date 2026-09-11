import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const notifications = await query<any[]>(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [user.id]
    );

    const unreadCountRows = await query<any[]>(
      `SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
      [user.id]
    );
    const unreadCount = unreadCountRows[0]?.unread_count || 0;

    return NextResponse.json({
      success: true,
      data: notifications,
      unread_count: unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { id, mark_all = false } = body;

    if (mark_all) {
      await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = ?`, [user.id]);
    } else if (id) {
      await query(`UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`, [id, user.id]);
    }

    return NextResponse.json({ success: true, message: 'Notifications updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
