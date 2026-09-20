import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, safeSelect } from '@/lib/ensureOpsTables';
import { query } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT']);
    if (!auth.ok) return auth.response!;
    await ensureOpsTables();

    const flags = await safeSelect<any[]>(
      `SELECT f.*, u.name as reviewer_name
       FROM risk_flags f
       LEFT JOIN users u ON f.reviewed_by = u.id
       WHERE f.id = ?`,
      [id]
    );
    if (!flags.length) {
      return NextResponse.json({ success: false, error: 'Flag not found' }, { status: 404 });
    }

    const flag = flags[0];
    let context: any = {};
    if (flag.entity_type === 'CUSTOMER' || flag.entity_type === 'VENDOR') {
      const users = await safeSelect<any[]>(
        'SELECT email, created_at, status FROM users WHERE id = ?',
        [flag.entity_id]
      );
      if (users[0]?.email) {
        const emailParts = String(users[0].email).split('@');
        context = {
          maskedEmail: `${emailParts[0].substring(0, 3)}***@${emailParts[1] || ''}`,
          accountStatus: users[0].status,
          memberSince: users[0].created_at,
        };
      }
    } else if (flag.entity_type === 'BOOKING') {
      const bookings = await safeSelect<any[]>(
        'SELECT status, total_amount FROM bookings WHERE id = ?',
        [flag.entity_id]
      );
      if (bookings[0]) {
        context = { bookingStatus: bookings[0].status, amount: bookings[0].total_amount };
      }
    }

    return NextResponse.json({ success: true, flag, context });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch risk flag' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;

    const body = await request.json();
    const { status, review_notes } = body;
    await ensureOpsTables();

    const rows = await safeSelect<any[]>(`SELECT status FROM risk_flags WHERE id = ?`, [id]);
    if (!rows.length) {
      return NextResponse.json({ success: false, error: 'Flag not found' }, { status: 404 });
    }

    await query(
      `UPDATE risk_flags SET status = ?, review_notes = ?, reviewed_by = ? WHERE id = ?`,
      [status, review_notes || null, auth.user?.id || null, id]
    );

    return NextResponse.json({ success: true, message: 'Risk flag updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to update flag' }, { status: 500 });
  }
}
