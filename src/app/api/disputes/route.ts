import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    let sql = `
      SELECT d.*, b.booking_number, b.total_amount, u.name as raised_by_name, v.business_name as vendor_name
      FROM disputes d
      JOIN bookings b ON d.booking_id = b.id
      JOIN users u ON d.raised_by_user_id = u.id
      JOIN vendors v ON b.vendor_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user.role === 'CUSTOMER') {
      sql += ` AND d.raised_by_user_id = ?`;
      params.push(user.id);
    } else if (user.role === 'VENDOR') {
      const v = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
      if (!v.length) return NextResponse.json({ success: true, data: [] });
      sql += ` AND b.vendor_id = ?`;
      params.push(v[0].id);
    }
    // Admins see all disputes

    sql += ` ORDER BY d.created_at DESC`;
    const disputes = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, data: disputes });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { booking_id, reason, statement } = body;

    if (!booking_id || !reason) {
      return NextResponse.json({ success: false, message: 'Booking ID and reason are required' }, { status: 400 });
    }

    const bookings = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [booking_id]);
    if (!bookings.length) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    const disputeId = randomUUID();

    await transaction(async (conn) => {
      // 1. Create dispute
      await conn.execute(
        `INSERT INTO disputes (id, booking_id, raised_by_user_id, reason, status)
         VALUES (?, ?, ?, ?, 'OPEN')`,
        [disputeId, booking_id, user.id, reason]
      );

      // 2. Put booking in DISPUTED state
      await conn.execute(
        `UPDATE bookings SET status = 'DISPUTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [booking_id]
      );

      // 3. Put vendor payout ON_HOLD
      await conn.execute(
        `UPDATE payouts SET status = 'PENDING' WHERE booking_id = ?`,
        [booking_id]
      );

      // 4. Record initial message
      if (statement) {
        await conn.execute(
          `INSERT INTO dispute_messages (id, dispute_id, sender_id, sender_role, message)
           VALUES (?, ?, ?, ?, ?)`,
          [randomUUID(), disputeId, user.id, user.role, statement]
        );
      }
    });

    await logAudit(user.id, 'RAISE_DISPUTE', 'disputes', disputeId, { booking_id, reason });

    return NextResponse.json({
      success: true,
      message: 'Dispute submitted. WedWithMe Arbitration team will review within 24 hours.',
      data: { id: disputeId, status: 'OPEN' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
