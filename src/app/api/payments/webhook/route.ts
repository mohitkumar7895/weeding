import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { defaultPaymentProvider } from '@/services/paymentProvider';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const valid = defaultPaymentProvider.verifyWebhookSignature(rawBody, signature);
      if (!valid) {
        return NextResponse.json({ success: false, message: 'Invalid webhook signature' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, message: 'Webhook secret not configured' }, { status: 500 });
    }

    const body = JSON.parse(rawBody || '{}');
    const eventType = body.event || body.event_type;
    const paymentEntity = body.payload?.payment?.entity || {};
    const orderId = paymentEntity.order_id || body.transaction_ref;
    const provider = 'razorpay';

    if (!eventType || !orderId) {
      return NextResponse.json({ success: false, message: 'Invalid webhook payload' }, { status: 400 });
    }

    const txns = await query<any[]>(
      `SELECT * FROM payment_transactions WHERE transaction_ref = ? AND provider = ?`,
      [orderId, provider]
    );

    if (!txns.length) {
      return NextResponse.json({ success: false, message: 'Transaction not found' }, { status: 404 });
    }

    const txn = txns[0];
    if (txn.status !== 'PENDING') {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    const bookings = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [txn.booking_id]);
    if (!bookings.length) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }
    const booking = bookings[0];
    const captured = eventType === 'payment.captured' || paymentEntity.status === 'captured' || body.status === 'SUCCESS';
    const failed = eventType === 'payment.failed' || paymentEntity.status === 'failed' || body.status === 'FAILED';

    await transaction(async (conn) => {
      if (captured) {
        await conn.execute(
          `UPDATE payment_transactions SET status = 'SUCCESS', payment_details = JSON_SET(COALESCE(payment_details, '{}'), '$.razorpay_payment_id', ?, '$.webhook_event', ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [paymentEntity.id || null, eventType, txn.id]
        );
        if (booking.status !== 'CONFIRMED') {
          await conn.execute(`UPDATE bookings SET status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [booking.id]);
          await conn.execute(
            `INSERT INTO vendor_availability (id, vendor_id, date, is_booked, notes)
             VALUES (?, ?, ?, TRUE, ?)
             ON DUPLICATE KEY UPDATE is_booked = TRUE, notes = VALUES(notes)`,
            [randomUUID(), booking.vendor_id, booking.event_date, `Locked by ${booking.booking_number}`]
          );
          await conn.execute(
            `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, reason)
             VALUES (?, ?, ?, 'CONFIRMED', 'SYSTEM', ?)`,
            [randomUUID(), booking.id, booking.status, `Razorpay webhook ${eventType}`]
          );
        }
      } else if (failed) {
        await conn.execute(
          `UPDATE payment_transactions SET status = 'FAILED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [txn.id]
        );
      }
    });

    return NextResponse.json({ success: true, message: 'Webhook processed' });
  } catch (error: any) {
    console.error('API /api/payments/webhook Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
