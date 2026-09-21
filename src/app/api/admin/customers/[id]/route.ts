import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
  if (!auth.ok) return auth.response!;

  try {
    const { id } = await params;
    const users = await query<any[]>(
      `SELECT u.*, cp.id as profile_id, cp.*
       FROM users u
       LEFT JOIN customer_profiles cp ON u.id = cp.user_id
       WHERE u.id = ? AND u.role = 'CUSTOMER'`,
      [id]
    );
    if (!users.length) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }

    const reports = await query<any[]>(
      `SELECT * FROM customer_reports WHERE reporter_user_id = ? OR reported_user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [id, id]
    );
    const blocks = await query<any[]>(
      `SELECT * FROM blocked_profiles WHERE user_id = ? OR blocked_user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [id, id]
    );
    let prefs: any[] = [];
    if (users[0].profile_id) {
      prefs = await query<any[]>(`SELECT * FROM partner_preferences WHERE profile_id = ? LIMIT 1`, [users[0].profile_id]);
    }

    return NextResponse.json({
      success: true,
      data: { user: users[0], reports, blocks, preferences: prefs[0] || null },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
  if (!auth.ok) return auth.response!;

  try {
    const admin = await getSessionUser();
    const { id } = await params;
    const body = await req.json();
    const { status, profile_verification_status, profile_visibility, hide_phone, hide_photos, hide_income, hide_location } = body;

    const existing = await query<any[]>(`SELECT id FROM users WHERE id = ? AND role = 'CUSTOMER'`, [id]);
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }

    if (status) {
      await query(`UPDATE users SET status = ? WHERE id = ?`, [status, id]);
    }

    const profileUpdates: string[] = [];
    const profileParams: any[] = [];
    if (profile_verification_status) {
      profileUpdates.push('verification_status = ?');
      profileParams.push(profile_verification_status);
    }
    if (profile_visibility) {
      profileUpdates.push('profile_visibility = ?');
      profileParams.push(profile_visibility);
    }
    if (typeof hide_phone === 'boolean') {
      profileUpdates.push('hide_phone = ?');
      profileParams.push(hide_phone);
    }
    if (typeof hide_photos === 'boolean') {
      profileUpdates.push('hide_photos = ?');
      profileParams.push(hide_photos);
    }
    if (typeof hide_income === 'boolean') {
      profileUpdates.push('hide_income = ?');
      profileParams.push(hide_income);
    }
    if (typeof hide_location === 'boolean') {
      profileUpdates.push('hide_location = ?');
      profileParams.push(hide_location);
    }

    if (profileUpdates.length) {
      profileParams.push(id);
      await query(`UPDATE customer_profiles SET ${profileUpdates.join(', ')} WHERE user_id = ?`, profileParams);
    }

    await logAudit({
      userId: admin!.id,
      role: admin!.role,
      action: 'UPDATE_CUSTOMER',
      entityType: 'users',
      entityId: id,
      newValues: body,
    });
    return NextResponse.json({ success: true, message: 'Customer updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
