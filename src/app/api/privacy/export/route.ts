import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    // Fetch all user-owned records
    const [userRows, profileRows, prefRows, bookingRows, reviewRows, consentRows, privacyRows] = await Promise.all([
      query<any[]>(`SELECT id, email, phone, name, role, created_at FROM users WHERE id = ?`, [user.id]),
      query<any[]>(`SELECT * FROM customer_profiles WHERE user_id = ?`, [user.id]),
      query<any[]>(
        `SELECT pp.* FROM partner_preferences pp 
         JOIN customer_profiles cp ON pp.profile_id = cp.id 
         WHERE cp.user_id = ?`,
        [user.id]
      ),
      query<any[]>(
        `SELECT b.booking_number, b.event_date, b.guest_count, b.total_amount, b.status, b.created_at, v.business_name as vendor_name
         FROM bookings b
         JOIN customer_profiles cp ON b.customer_id = cp.id
         JOIN vendors v ON b.vendor_id = v.id
         WHERE cp.user_id = ?`,
        [user.id]
      ),
      query<any[]>(
        `SELECT r.rating, r.comment, r.created_at, v.business_name as vendor_name
         FROM reviews r
         JOIN customer_profiles cp ON r.customer_id = cp.id
         JOIN vendors v ON r.vendor_id = v.id
         WHERE cp.user_id = ?`,
        [user.id]
      ),
      query<any[]>(`SELECT consent_type, consent_version, is_granted, granted_at, revoked_at FROM user_consents WHERE user_id = ?`, [user.id]),
      query<any[]>(`SELECT * FROM privacy_settings WHERE user_id = ?`, [user.id]),
    ]);

    // Record export request in data_export_requests table
    const exportId = randomUUID();
    await query(
      `INSERT INTO data_export_requests (id, user_id, status, completed_at)
       VALUES (?, ?, 'READY', CURRENT_TIMESTAMP)`,
      [exportId, user.id]
    );

    await logAudit(user.id, 'DATA_EXPORT', 'data_export_requests', exportId);

    const exportPayload = {
      export_metadata: {
        export_id: exportId,
        generated_at: new Date().toISOString(),
        application: 'WedWithMe India Ecosystem',
        retention_notice: 'This export contains personal data processed in accordance with the WedWithMe Privacy Policy.',
      },
      account: userRows[0] || {},
      customer_profile: profileRows[0] || null,
      partner_preferences: prefRows[0] || null,
      bookings: bookingRows,
      reviews: reviewRows,
      consents: consentRows,
      privacy_settings: privacyRows[0] || null,
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="wedwithme_export_${user.id}_${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Data Export Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
