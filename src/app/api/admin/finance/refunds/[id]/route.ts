import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT']);
    if (!auth.ok) return auth.response!;

    const { id } = await params;

    const rows = await query<any[]>(`
      SELECT 
        r.*,
        b.booking_number, b.total_amount as booking_gross,
        u.name as customer_name, u.email as customer_email,
        v.business_name as vendor_name,
        c.reason as cancellation_reason, c.cancelled_by_role,
        cr.refund_percentage, cr.penalty_percentage
      FROM refunds r
      JOIN bookings b ON r.booking_id = b.id
      JOIN customer_profiles cp ON b.customer_id = cp.id
      JOIN users u ON cp.user_id = u.id
      JOIN vendors v ON b.vendor_id = v.id
      LEFT JOIN cancellations c ON r.cancellation_id = c.id
      LEFT JOIN cancellation_rules cr ON r.rule_applied_id = cr.id
      WHERE r.id = ?
    `, [id]);

    if (!rows.length) {
      return NextResponse.json({ success: false, message: 'Refund not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    console.error('API /api/admin/finance/refunds/[id] GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
