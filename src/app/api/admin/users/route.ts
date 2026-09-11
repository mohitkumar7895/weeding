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
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    let sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.email_verified,
        u.created_at,
        cp.id as profile_id,
        cp.gender,
        cp.verification_status as profile_verification_status,
        cp.city as customer_city,
        v.id as vendor_id,
        v.business_name
      FROM users u
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      LEFT JOIN vendors v ON u.id = v.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (role) {
      sql += ` AND u.role = ?`;
      params.push(role);
    }
    if (status) {
      sql += ` AND u.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY u.created_at DESC LIMIT 100`;

    const users = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('API /api/admin/users GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
