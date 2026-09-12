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

    const rows = await query<any[]>(`SELECT * FROM privacy_settings WHERE user_id = ?`, [user.id]);
    let settings = rows.length ? rows[0] : null;

    if (!settings) {
      const id = randomUUID();
      await query(
        `INSERT INTO privacy_settings (id, user_id, phone_visibility, email_visibility, income_visibility, photos_visibility, family_visibility, location_visibility)
         VALUES (?, ?, 'MATCHED_ONLY', 'PRIVATE', 'MATCHED_ONLY', 'PUBLIC', 'MATCHED_ONLY', 'PUBLIC')`,
        [id, user.id]
      );
      settings = {
        id,
        user_id: user.id,
        phone_visibility: 'MATCHED_ONLY',
        email_visibility: 'PRIVATE',
        income_visibility: 'MATCHED_ONLY',
        photos_visibility: 'PUBLIC',
        family_visibility: 'MATCHED_ONLY',
        location_visibility: 'PUBLIC',
      };
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const {
      phone_visibility,
      email_visibility,
      income_visibility,
      photos_visibility,
      family_visibility,
      location_visibility,
    } = body;

    const validLevels = ['PUBLIC', 'MATCHED_ONLY', 'PRIVATE', 'ADMIN_ONLY'];
    const validate = (val?: string) => !val || validLevels.includes(val);

    if (
      !validate(phone_visibility) ||
      !validate(email_visibility) ||
      !validate(income_visibility) ||
      !validate(photos_visibility) ||
      !validate(location_visibility)
    ) {
      return NextResponse.json({ success: false, message: 'Invalid privacy visibility level' }, { status: 400 });
    }

    await query(
      `INSERT INTO privacy_settings (id, user_id, phone_visibility, email_visibility, income_visibility, photos_visibility, family_visibility, location_visibility)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        phone_visibility = COALESCE(?, phone_visibility),
        email_visibility = COALESCE(?, email_visibility),
        income_visibility = COALESCE(?, income_visibility),
        photos_visibility = COALESCE(?, photos_visibility),
        family_visibility = COALESCE(?, family_visibility),
        location_visibility = COALESCE(?, location_visibility),
        updated_at = CURRENT_TIMESTAMP`,
      [
        randomUUID(),
        user.id,
        phone_visibility || 'MATCHED_ONLY',
        email_visibility || 'PRIVATE',
        income_visibility || 'MATCHED_ONLY',
        photos_visibility || 'PUBLIC',
        family_visibility || 'MATCHED_ONLY',
        location_visibility || 'PUBLIC',
        phone_visibility || null,
        email_visibility || null,
        income_visibility || null,
        photos_visibility || null,
        family_visibility || null,
        location_visibility || null,
      ]
    );

    // Synchronize to customer_profiles if exists
    try {
      const isPhoneHidden = phone_visibility === 'PRIVATE' || phone_visibility === 'MATCHED_ONLY';
      const isPhotosHidden = photos_visibility === 'PRIVATE';
      const isIncomeHidden = income_visibility === 'PRIVATE';
      const isLocationHidden = location_visibility === 'PRIVATE';

      await query(
        `UPDATE customer_profiles SET
           hide_phone = ?,
           hide_photos = ?,
           hide_income = ?,
           hide_location = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [isPhoneHidden, isPhotosHidden, isIncomeHidden, isLocationHidden, user.id]
      );
    } catch (_) {}

    await logAudit(user.id, 'UPDATE_PRIVACY_SETTINGS', 'privacy_settings', user.id, body);

    return NextResponse.json({ success: true, message: 'Privacy settings saved successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
