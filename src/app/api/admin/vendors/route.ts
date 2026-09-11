import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let sql = `
      SELECT 
        v.*,
        c.name as category_name,
        u.name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone,
        COALESCE(vo.status, 'DRAFT') as onboarding_status,
        vo.checklist_json,
        vo.rejection_reason as onboarding_rejection_reason,
        (SELECT COUNT(*) FROM bookings b WHERE b.vendor_id = v.id) as total_bookings,
        (SELECT SUM(total_amount) FROM bookings b WHERE b.vendor_id = v.id AND b.status IN ('CONFIRMED', 'COMPLETED')) as revenue_generated
      FROM vendors v
      JOIN categories c ON v.category_id = c.id
      JOIN users u ON v.user_id = u.id
      LEFT JOIN vendor_onboarding vo ON vo.vendor_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ` AND v.verification_status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY v.created_at DESC`;

    const vendors = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, data: vendors });
  } catch (error: any) {
    console.error('API /api/admin/vendors GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
