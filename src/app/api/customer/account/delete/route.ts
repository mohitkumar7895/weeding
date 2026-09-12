import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const requests = await query<any[]>(
      `SELECT * FROM account_deletion_requests WHERE user_id = ? ORDER BY requested_at DESC LIMIT 1`,
      [session.id]
    );

    return NextResponse.json({
      success: true,
      hasPendingDeletion: requests.length > 0 && requests[0].status === 'REQUESTED',
      deletionRequest: requests.length > 0 ? requests[0] : null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { reason, feedback } = body;
    const isConfirmed = Boolean(body.confirmation || body.confirm || body.confirmed);

    if (!isConfirmed) {
      return NextResponse.json(
        { success: false, message: 'Please check the confirmation box to proceed with account deletion.' },
        { status: 400 }
      );
    }

    const effectiveUserId = session.id || (session as any).userId;

    // 1. Mark user as deactivated and set deleted_at timestamp
    await query(
      `UPDATE users 
       SET status = 'SUSPENDED', deleted_at = NOW(), updated_at = NOW() 
       WHERE id = ?`,
      [effectiveUserId]
    );

    // 2. Hide customer profile from discovery immediately
    await query(
      `UPDATE customer_profiles 
       SET profile_visibility = 'PRIVATE', updated_at = NOW() 
       WHERE user_id = ?`,
      [effectiveUserId]
    );

    // 3. Store deletion request record with 30-day retention countdown
    const requestId = 'del_' + randomUUID();
    await query(
      `INSERT INTO account_deletion_requests (id, user_id, reason, feedback, status, requested_at, scheduled_deletion_at)
       VALUES (?, ?, ?, ?, 'REQUESTED', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))`,
      [requestId, effectiveUserId, reason?.trim() || 'User requested deactivation', feedback?.trim() || null]
    );

    await logAudit(effectiveUserId, 'REQUEST_ACCOUNT_DELETION', 'users', effectiveUserId, {
      requestId,
      reason,
      scheduledDeletion: '30_days',
    });

    // 4. Create response and clear authentication cookie
    const response = NextResponse.json({
      success: true,
      message: 'Your account deletion request has been submitted. Your profile has been deactivated and hidden from all matrimonial searches.',
      requestId,
    });

    response.cookies.set('wwm_auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error: any) {
    console.error('[Account Delete Request Error]:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
