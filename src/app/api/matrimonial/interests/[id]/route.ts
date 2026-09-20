import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { sendNotification } from '@/services/notificationEngine';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();
    const status = body.status as string;
    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return NextResponse.json({ success: false, message: 'status must be ACCEPTED or DECLINED' }, { status: 400 });
    }

    const rows = await query<any[]>(
      `SELECT * FROM matrimonial_interests WHERE id = ? AND to_user_id = ? LIMIT 1`,
      [id, user.id]
    );
    if (!rows.length) {
      return NextResponse.json({ success: false, message: 'Interest not found' }, { status: 404 });
    }

    await query(
      `UPDATE matrimonial_interests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, id]
    );

    const actor = await query<any[]>(`SELECT name FROM users WHERE id = ? LIMIT 1`, [user.id]);
    try {
      await sendNotification({
        userId: rows[0].from_user_id,
        title: status === 'ACCEPTED' ? 'Interest accepted' : 'Interest declined',
        message:
          status === 'ACCEPTED'
            ? `${actor[0]?.name || 'A member'} accepted your interest. You can now chat.`
            : `${actor[0]?.name || 'A member'} declined your interest.`,
        category: 'CHAT',
        link: status === 'ACCEPTED' ? '/dashboard?tab=chat' : '/dashboard?tab=interests',
      });
    } catch (notifyErr) {
      console.warn('[interests] notification failed', notifyErr);
    }

    await logAudit(user.id, 'UPDATE_INTEREST', 'matrimonial_interests', id, { status });
    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
