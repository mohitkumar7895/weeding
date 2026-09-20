import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: true, preferences: [] });

    const preferences = await query<any[]>(
      `SELECT * FROM notification_preferences WHERE user_id = ?`,
      [user.id]
    );

    return NextResponse.json({ success: true, preferences: Array.isArray(preferences) ? preferences : [] });
  } catch (error: any) {
    return NextResponse.json({ success: true, preferences: [] });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { category, in_app_enabled, email_enabled, whatsapp_enabled } = body;

    if (!category) {
      return NextResponse.json({ success: false, message: 'Category is required' }, { status: 400 });
    }

    // Upsert preference
    await query(
      `INSERT INTO notification_preferences (user_id, category, in_app_enabled, email_enabled, whatsapp_enabled)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         in_app_enabled = VALUES(in_app_enabled), 
         email_enabled = VALUES(email_enabled), 
         whatsapp_enabled = VALUES(whatsapp_enabled),
         updated_at = CURRENT_TIMESTAMP`,
      [
        user.id, 
        category, 
        in_app_enabled ?? true, 
        email_enabled ?? true, 
        whatsapp_enabled ?? false
      ]
    );

    return NextResponse.json({ success: true, message: 'Preferences updated successfully' });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
