import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT']);
    if (!auth.ok) return auth.response!;

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('booking_id');
    const initiator = searchParams.get('initiator_role');

    let sql = `
      SELECT 
        c.id, c.booking_id, c.cancelled_by_role, c.reason, c.created_at,
        b.event_date, b.total_amount, b.status as booking_status,
        v.business_name as vendor_name,
        u.name as customer_name,
        cr.refund_percentage, cr.penalty_percentage
      FROM cancellations c
      JOIN bookings b ON c.booking_id = b.id
      JOIN vendors v ON b.vendor_id = v.id
      JOIN customer_profiles cp ON b.customer_id = cp.id
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN cancellation_rules cr ON c.rule_applied_id = cr.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (bookingId) {
      sql += ` AND c.booking_id = ?`;
      params.push(bookingId);
    }
    if (initiator) {
      sql += ` AND c.cancelled_by_role = ?`;
      params.push(initiator);
    }

    sql += ` ORDER BY c.created_at DESC LIMIT 100`;

    const records = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error('API /api/admin/cancellations/records GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
