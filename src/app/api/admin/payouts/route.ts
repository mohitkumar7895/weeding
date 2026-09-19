import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(req: NextRequest) {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!authResult.ok) return authResult.response;

  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'FINANCE')) {
      return NextResponse.json(
        { success: false, message: 'Finance or Super Admin authorization required to manage payouts' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let sql = `
      SELECT p.*, v.business_name, v.city, v.bank_account_number, v.bank_ifsc, b.booking_number, b.total_amount
      FROM payouts p
      JOIN vendors v ON p.vendor_id = v.id
      JOIN bookings b ON p.booking_id = b.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status) {
      sql += ` AND p.status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY p.created_at DESC`;

    const payouts = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, data: payouts });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!authResult.ok) return authResult.response;

  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'FINANCE')) {
      return NextResponse.json(
        { success: false, message: 'Finance or Super Admin authorization required to settle payouts' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { payout_id, status = 'PAID', reference_id, error_message } = body;

    if (!payout_id) return NextResponse.json({ success: false, message: 'payout_id required' }, { status: 400 });

    const ref = reference_id || (status === 'PAID' ? `SETTLE_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}` : null);

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE payouts SET status = ?, reference_id = COALESCE(?, reference_id), updated_at = CURRENT_TIMESTAMP ${status === 'PAID' ? ', payout_date = CURRENT_TIMESTAMP' : ''} WHERE id = ?`,
        [status, ref, payout_id]
      );

      // Record payout attempt
      await conn.execute(
        `INSERT INTO payout_attempts (id, payout_id, attempt_number, status, response_payload, error_message)
         VALUES (?, ?, 1, ?, ?, ?)`,
        [randomUUID(), payout_id, status === 'PAID' ? 'SUCCESS' : (status === 'FAILED' ? 'FAILED' : 'MANUAL_REVIEW'), JSON.stringify({ reference_id: ref, resolved_by: user.id }), error_message || null]
      );
    });

    await logAudit(user.id, 'SETTLE_PAYOUT', 'payouts', payout_id, { status, reference_id: ref });

    return NextResponse.json({
      success: true,
      message: `Payout successfully marked as ${status}`,
      data: { payout_id, status, reference_id: ref }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
