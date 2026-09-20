import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const bookingId = searchParams.get('booking_id');

    let sql = `
      SELECT 
        r.id, r.booking_id, r.amount, r.original_amount, r.deduction_amount, r.status, r.created_at, r.processed_at,
        b.booking_number,
        u.name as customer_name,
        v.business_name as vendor_name,
        c.cancelled_by_role
      FROM refunds r
      JOIN bookings b ON r.booking_id = b.id
      JOIN customer_profiles cp ON b.customer_id = cp.id
      JOIN users u ON cp.user_id = u.id
      JOIN vendors v ON b.vendor_id = v.id
      LEFT JOIN cancellations c ON r.cancellation_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ` AND r.status = ?`;
      params.push(status);
    }
    if (bookingId) {
      sql += ` AND r.booking_id = ?`;
      params.push(bookingId);
    }

    sql += ` ORDER BY r.created_at DESC LIMIT 100`;

    const records = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error('API /api/admin/finance/refunds GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
