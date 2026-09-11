import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'FINANCE')) {
      return NextResponse.json({ success: false, message: 'Finance or Admin authorization required' }, { status: 403 });
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
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'FINANCE')) {
      return NextResponse.json({ success: false, message: 'Finance or Admin authorization required' }, { status: 403 });
    }

    const body = await req.json();
    const { payout_id, status = 'PAID', reference_id } = body;

    if (!payout_id) return NextResponse.json({ success: false, message: 'payout_id required' }, { status: 400 });

    const ref = reference_id || `SETTLE_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE payouts SET status = ?, reference_id = ?, payout_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [status, ref, payout_id]
      );

      // Record payout attempt
      await conn.execute(
        `INSERT INTO payout_attempts (id, payout_id, attempt_number, status, response_payload)
         VALUES (?, ?, 1, 'SUCCESS', ?)`,
        [randomUUID(), payout_id, JSON.stringify({ reference_id: ref, settled_by: user.id })]
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
