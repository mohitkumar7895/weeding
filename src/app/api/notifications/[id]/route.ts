import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: any) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const notifId = params.id;
    
    // Ensure the notification actually belongs to the user
    const [result] = await query<any>(
      `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`,
      [notifId, user.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: 'Notification not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Notification marked as read' });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
