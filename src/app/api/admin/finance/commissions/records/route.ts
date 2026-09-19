import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('booking_id');
    const status = searchParams.get('status'); // 'SETTLED' or 'UNSETTLED'

    let sql = `
      SELECT 
        cr.id, cr.booking_id, cr.percentage, cr.commission_amount, cr.is_settled, cr.settled_at, cr.created_at,
        b.total_amount as gross_amount,
        v.business_name as vendor_name,
        u.name as customer_name
      FROM commission_records cr
      JOIN bookings b ON cr.booking_id = b.id
      JOIN vendors v ON b.vendor_id = v.id
      JOIN customer_profiles c ON b.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (bookingId) {
      sql += ` AND cr.booking_id = ?`;
      params.push(bookingId);
    }
    if (status) {
      sql += ` AND cr.is_settled = ?`;
      params.push(status === 'SETTLED' ? 1 : 0);
    }

    sql += ` ORDER BY cr.created_at DESC LIMIT 100`;

    const records = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error('API /api/admin/finance/commissions/records GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
