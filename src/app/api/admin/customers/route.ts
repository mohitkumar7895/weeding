import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
  if (!auth.ok) return auth.response!;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const profileStatus = searchParams.get('profile_status');
    const search = searchParams.get('search');

    let sql = `
      SELECT
        u.id, u.name, u.email, u.phone, u.status, u.email_verified, u.created_at,
        cp.id as profile_id,
        cp.gender, cp.city, cp.state, cp.religion, cp.verification_status as profile_verification_status,
        cp.profile_visibility, cp.hide_phone, cp.hide_photos, cp.hide_income, cp.hide_location
      FROM users u
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      WHERE u.role = 'CUSTOMER'
    `;
    const params: any[] = [];

    if (status) {
      sql += ` AND u.status = ?`;
      params.push(status);
    }
    if (profileStatus) {
      sql += ` AND cp.verification_status = ?`;
      params.push(profileStatus);
    }
    if (search) {
      sql += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY u.created_at DESC LIMIT 2`;
    const data = await query<any[]>(sql, params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
