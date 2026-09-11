import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const history = await query<any[]>(
      `SELECT bsh.*, u.name as changed_by_name, u.role as changed_by_role
       FROM booking_status_history bsh
       LEFT JOIN users u ON bsh.changed_by = u.id
       WHERE bsh.booking_id = ?
       ORDER BY bsh.created_at ASC`,
      [id]
    );

    return NextResponse.json({ success: true, data: history });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
