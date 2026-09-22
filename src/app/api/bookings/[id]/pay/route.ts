import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { provider = 'razorpay' } = body;

    const bookings = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [id]);
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }
    const booking = bookings[0];

    const { defaultPaymentProvider } = await import('@/services/paymentProvider');

    // Make sure booking is in an eligible state
    if (!['REQUESTED', 'PENDING_VENDOR', 'ACCEPTED', 'PAYMENT_PENDING'].includes(booking.status)) {
      return NextResponse.json({ success: false, message: 'Booking is not in a valid state for payment initiation' }, { status: 400 });
    }

    // --- RETRY SAFETY & DUPLICATE PREVENTION ---
    const existingTxns = await query<any[]>(
      `SELECT id, status, created_at FROM payment_transactions WHERE booking_id = ? ORDER BY created_at DESC`,
      [id]
    );

    const hasSuccess = existingTxns.some(t => t.status === 'SUCCESS');
    if (hasSuccess) {
      return NextResponse.json({ success: false, message: 'A successful payment already exists for this booking. Duplicate charge prevented.' }, { status: 400 });
    }

    const recentPending = existingTxns.find(t => t.status === 'PENDING' && (new Date().getTime() - new Date(t.created_at).getTime()) < 1 * 60 * 1000);
    if (recentPending) {
      return NextResponse.json({ success: false, message: 'A payment is currently processing. Please wait 1 minute before retrying.' }, { status: 409 });
    }
    // -------------------------------------------

    const paymentId = randomUUID();
    const receiptNumber = `RCPT_${booking.booking_number}_${Date.now()}`;

    // 1. Create order with payment provider
    const order = await defaultPaymentProvider.createOrder({
      amount: booking.total_amount,
      currency: 'INR',
      bookingId: id,
      receiptNumber
    });

    await transaction(async (conn) => {
      // 2. Record payment transaction as PENDING
      await conn.execute(
        `INSERT INTO payment_transactions (
          id, booking_id, transaction_ref, amount, currency, provider, status, payment_details
        ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
        [
          paymentId,
          id,
          order.orderId,
          booking.total_amount,
          order.currency,
          order.provider,
          JSON.stringify({
            receipt: receiptNumber,
            initiated_at: new Date().toISOString(),
            payer_user_id: user.id
          })
        ]
      );

      // 3. Update booking status to PAYMENT_PENDING if not already
      if (booking.status !== 'PAYMENT_PENDING') {
        await conn.execute(
          `UPDATE bookings SET status = 'PAYMENT_PENDING', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [id]
        );
        
        await conn.execute(
          `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, reason)
           VALUES (?, ?, ?, 'PAYMENT_PENDING', ?, ?)`,
          [randomUUID(), id, booking.status, user.id, `Payment initiated via ${order.provider}`]
        );
      }
    });

    await logAudit(user.id, 'INITIATE_PAYMENT', 'payment_transactions', paymentId, {
      booking_id: id,
      amount: booking.total_amount,
      order_id: order.orderId
    });

    return NextResponse.json({
      success: true,
      message: 'Payment initiated successfully.',
      data: {
        order_id: order.orderId,
        amount: booking.total_amount,
        currency: order.currency,
        provider: order.provider,
        key_id: order.keyId || process.env.RAZORPAY_KEY_ID || null,
        payment_transaction_id: paymentId
      }
    });
  } catch (error: any) {
    console.error('API /api/bookings/[id]/pay Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
