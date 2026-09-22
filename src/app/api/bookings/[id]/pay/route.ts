import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

function paymentInitResponse(booking: any, txn: { id: string; transaction_ref: string; currency?: string; provider?: string }) {
  return NextResponse.json({
    success: true,
    message: 'Payment initiated successfully.',
    data: {
      order_id: txn.transaction_ref,
      amount: booking.total_amount,
      currency: txn.currency || 'INR',
      provider: txn.provider || 'razorpay',
      key_id: process.env.RAZORPAY_KEY_ID || null,
      payment_transaction_id: txn.id,
    },
  });
}

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
    await req.json().catch(() => ({}));

    const bookings = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [id]);
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }
    const booking = bookings[0];

    if (!['REQUESTED', 'PENDING_VENDOR', 'ACCEPTED', 'PAYMENT_PENDING'].includes(booking.status)) {
      return NextResponse.json({ success: false, message: 'Booking is not in a valid state for payment initiation' }, { status: 400 });
    }

    const existingTxns = await query<any[]>(
      `SELECT id, status, created_at, transaction_ref, amount, currency, provider
       FROM payment_transactions WHERE booking_id = ? ORDER BY created_at DESC`,
      [id]
    );

    if (existingTxns.some((t) => t.status === 'SUCCESS')) {
      return NextResponse.json(
        { success: false, message: 'A successful payment already exists for this booking. Duplicate charge prevented.' },
        { status: 400 }
      );
    }

    const pendingTxn = existingTxns.find((t) => t.status === 'PENDING' && t.transaction_ref);
    if (pendingTxn) {
      return paymentInitResponse(booking, pendingTxn);
    }

    const { defaultPaymentProvider } = await import('@/services/paymentProvider');
    const paymentId = randomUUID();
    const receiptNumber = `RCPT_${booking.booking_number}_${Date.now()}`;

    const order = await defaultPaymentProvider.createOrder({
      amount: booking.total_amount,
      currency: 'INR',
      bookingId: id,
      receiptNumber,
    });

    const reused = await transaction(async (conn) => {
      const [lockedRows]: any = await conn.execute(
        `SELECT id, status FROM bookings WHERE id = ? FOR UPDATE`,
        [id]
      );
      const locked = Array.isArray(lockedRows) ? lockedRows[0] : null;
      if (!locked) {
        throw new Error('Booking not found');
      }

      const [txRows]: any = await conn.execute(
        `SELECT id, status, transaction_ref, currency, provider
         FROM payment_transactions WHERE booking_id = ? ORDER BY created_at DESC`,
        [id]
      );
      const txns = Array.isArray(txRows) ? txRows : [];
      if (txns.some((t) => t.status === 'SUCCESS')) {
        throw new Error('A successful payment already exists for this booking. Duplicate charge prevented.');
      }
      const pending = txns.find((t) => t.status === 'PENDING' && t.transaction_ref);
      if (pending) {
        return pending as { id: string; transaction_ref: string; currency?: string; provider?: string };
      }

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
            payer_user_id: user.id,
          }),
        ]
      );

      if (locked.status !== 'PAYMENT_PENDING') {
        await conn.execute(
          `UPDATE bookings SET status = 'PAYMENT_PENDING', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [id]
        );

        await conn.execute(
          `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, reason)
           VALUES (?, ?, ?, 'PAYMENT_PENDING', ?, ?)`,
          [randomUUID(), id, locked.status, user.id, `Payment initiated via ${order.provider}`]
        );
      }

      return null;
    });

    if (reused) {
      return paymentInitResponse(booking, reused);
    }

    await logAudit(user.id, 'INITIATE_PAYMENT', 'payment_transactions', paymentId, {
      booking_id: id,
      amount: booking.total_amount,
      order_id: order.orderId,
    });

    return paymentInitResponse(booking, {
      id: paymentId,
      transaction_ref: order.orderId,
      currency: order.currency,
      provider: order.provider,
    });
  } catch (error: any) {
    console.error('API /api/bookings/[id]/pay Error:', error);
    const alreadyPaid = String(error?.message || '').includes('successful payment already exists');
    return NextResponse.json(
      { success: false, message: error.message },
      { status: alreadyPaid ? 400 : 500 }
    );
  }
}
