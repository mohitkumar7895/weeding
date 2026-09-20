import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { ensureOpsTables } from '@/lib/ensureOpsTables';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, authenticated: false, user: null }, { status: 200 });
    }

    await ensureOpsTables();

    const users = await query<any[]>(
      `SELECT u.id, u.email, u.phone, u.name, u.role, u.status, u.created_at,
              cp.id as customer_profile_id, cp.verification_status, cp.city,
              v.id as vendor_id, v.business_name, v.category_id
       FROM users u
       LEFT JOIN customer_profiles cp ON u.id = cp.user_id
       LEFT JOIN vendors v ON u.id = v.user_id
       WHERE u.id = ? LIMIT 1`,
      [session.id]
    );

    if (users.length === 0) {
      return NextResponse.json({ success: false, authenticated: false, user: null }, { status: 200 });
    }

    const user = users[0];
    const role = String(user.role || session.role || '').trim().toUpperCase();
    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role,
        status: user.status,
        customerProfileId: user.customer_profile_id,
        profile_id: user.customer_profile_id,
        vendorId: user.vendor_id,
        vendor_id: user.vendor_id,
        city: user.city,
        businessName: user.business_name,
        business_name: user.business_name,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, authenticated: false, message: error.message }, { status: 500 });
  }
}
