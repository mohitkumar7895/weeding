import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const bookingIdFilter = searchParams.get('booking_id');
    const transactionRefFilter = searchParams.get('transaction_ref');

    let sql = `
      SELECT 
        pt.id, pt.booking_id, pt.transaction_ref, pt.amount, pt.currency, pt.status, pt.created_at,
        c.id as customer_id, cu.name as customer_name,
        v.id as vendor_id, v.business_name as vendor_name
      FROM payment_transactions pt
      JOIN bookings b ON pt.booking_id = b.id
      JOIN customer_profiles c ON b.customer_id = c.id
      JOIN users cu ON c.user_id = cu.id
      JOIN vendors v ON b.vendor_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (statusFilter) {
      sql += ` AND pt.status = ?`;
      params.push(statusFilter);
    }
    if (bookingIdFilter) {
      sql += ` AND pt.booking_id = ?`;
      params.push(bookingIdFilter);
    }
    if (transactionRefFilter) {
      sql += ` AND pt.transaction_ref = ?`;
      params.push(transactionRefFilter);
    }

    sql += ` ORDER BY pt.created_at DESC LIMIT 100`;

    const payments = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    console.error('API /api/admin/finance/payments GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
