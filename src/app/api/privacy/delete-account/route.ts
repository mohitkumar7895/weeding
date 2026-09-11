import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    // Check if user has active bookings
    const activeBookings = await query<any[]>(
      `SELECT b.id FROM bookings b
       LEFT JOIN customer_profiles cp ON b.customer_id = cp.id
       LEFT JOIN vendors v ON b.vendor_id = v.id
       WHERE (cp.user_id = ? OR v.user_id = ?) AND b.status IN ('CONFIRMED', 'IN_PROGRESS', 'PENDING')`,
      [user.id, user.id]
    );

    if (activeBookings.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Account cannot be deleted while you have active or in-progress bookings. Please fulfill or cancel active bookings first.',
      }, { status: 400 });
    }

    await transaction(async (conn) => {
      // 1. Soft delete and deactivate account
      await conn.execute(
        `UPDATE users SET 
          status = 'SUSPENDED',
          deleted_at = CURRENT_TIMESTAMP,
          email = CONCAT('deleted_', id, '@anonymized.wedwithme.com'),
          phone = NULL,
          name = 'Anonymized User'
        WHERE id = ?`,
        [user.id]
      );

      // 2. Anonymize profile
      await conn.execute(
        `UPDATE customer_profiles SET 
          about_me = '[Account Deleted by User Request]',
          profile_visibility = 'PRIVATE'
        WHERE user_id = ?`,
        [user.id]
      );
    });

    await logAudit(user.id, 'ACCOUNT_DELETION_REQUESTED', 'users', user.id);

    const response = NextResponse.json({
      success: true,
      message: 'Your account has been deactivated and personal identifiers anonymized in accordance with retention rules.',
    });

    // Clear auth cookie
    response.cookies.delete('wwm_auth_token');

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
