import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const { id } = await params;

    const [payoutRows]: any = await query(`
      SELECT 
        p.*,
        v.business_name as vendor_name, u.name as owner_name, u.email as vendor_email,
        b.total_amount as gross_booking_amount, b.status as booking_status,
        cr.commission_amount, cr.percentage as commission_percentage
      FROM payouts p
      JOIN vendors v ON p.vendor_id = v.id
      JOIN users u ON v.user_id = u.id
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN commission_records cr ON p.booking_id = cr.booking_id
      WHERE p.id = ?
    `, [id]);

    if (!payoutRows) return NextResponse.json({ success: false, message: 'Payout not found' }, { status: 404 });

    const attempts = await query<any[]>(`SELECT * FROM payout_attempts WHERE payout_id = ? ORDER BY created_at DESC`, [id]);

    return NextResponse.json({ success: true, data: { ...payoutRows, attempts } });
  } catch (error: any) {
    console.error('API /api/admin/finance/payouts/[id] GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
