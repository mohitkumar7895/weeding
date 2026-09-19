import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest, { params }: any) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const bookingId = params.id;
    const [booking] = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [bookingId]);
    if (!booking) return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'FINANCE' && booking.customer_id !== user.id && booking.vendor_id !== user.id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const disputes = await query<any[]>(`SELECT * FROM disputes WHERE booking_id = ? ORDER BY created_at DESC`, [bookingId]);
    return NextResponse.json({ success: true, disputes });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: any) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const bookingId = params.id;
    const body = await req.json();
    const { reason, amount_under_dispute, evidence_json } = body;

    if (!reason) {
      return NextResponse.json({ success: false, message: 'Reason is required' }, { status: 400 });
    }

    const [booking] = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [bookingId]);
    if (!booking) return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });

    if (booking.customer_id !== user.id && booking.vendor_id !== user.id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Only allow disputes on Paid or Cancelled/Completed bookings usually, but we'll accept any non-draft booking that has a payment
    const [payment] = await query<any[]>(`SELECT * FROM payments WHERE booking_id = ? AND status = 'SUCCESS' LIMIT 1`, [bookingId]);

    const disputeId = randomUUID();
    // Default escalation deadline 7 days from now
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    await query(
      `INSERT INTO disputes (id, booking_id, raised_by_user_id, reason, payment_id, amount_under_dispute, evidence_json, escalation_deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [disputeId, bookingId, user.id, reason, payment?.id || null, amount_under_dispute || null, evidence_json ? JSON.stringify(evidence_json) : null, deadline]
    );

    await logAudit(user.id, 'RAISE_DISPUTE', 'disputes', disputeId, { bookingId });

    return NextResponse.json({ success: true, dispute_id: disputeId });
  } catch (error: any) {
    console.error('Dispute error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
