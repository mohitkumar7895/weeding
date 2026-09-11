import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await getSessionUser();
    if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const [fraudFlags, riskEvents] = await Promise.all([
      query<any[]>(`SELECT * FROM fraud_flags ORDER BY created_at DESC LIMIT 50`),
      query<any[]>(`SELECT * FROM risk_events ORDER BY created_at DESC LIMIT 50`),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        fraud_flags: fraudFlags,
        risk_events: riskEvents,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getSessionUser();
    if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { flag_id, status, action_taken } = body;
    // status: 'OPEN' | 'REVIEWED' | 'DISMISSED' | 'ACTIONED'

    if (!flag_id || !status) {
      return NextResponse.json({ success: false, message: 'flag_id and status are required' }, { status: 400 });
    }

    await query(
      `UPDATE fraud_flags SET
        status = ?,
        action_taken = ?,
        reviewed_by = ?
      WHERE id = ?`,
      [status, action_taken || null, admin.id, flag_id]
    );

    await logAudit(admin.id, 'ACTION_FRAUD_FLAG', 'fraud_flags', flag_id, { status, action_taken });

    return NextResponse.json({
      success: true,
      message: `Fraud flag updated to ${status}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
