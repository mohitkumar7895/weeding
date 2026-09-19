import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendor_id');
    const status = searchParams.get('status');
    const bookingId = searchParams.get('booking_id');

    let sql = `
      SELECT 
        p.id, p.vendor_id, p.booking_id, p.amount, p.status, p.created_at, p.payout_date,
        v.business_name as vendor_name,
        u.email as vendor_email
      FROM payouts p
      JOIN vendors v ON p.vendor_id = v.id
      JOIN users u ON v.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (vendorId) { sql += ` AND p.vendor_id = ?`; params.push(vendorId); }
    if (status) { sql += ` AND p.status = ?`; params.push(status); }
    if (bookingId) { sql += ` AND p.booking_id = ?`; params.push(bookingId); }

    sql += ` ORDER BY p.created_at DESC LIMIT 100`;

    const payouts = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, data: payouts });
  } catch (error: any) {
    console.error('API /api/admin/finance/payouts GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
