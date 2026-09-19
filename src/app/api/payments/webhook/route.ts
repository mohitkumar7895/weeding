import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { randomUUID } from 'crypto';

// This is a secure server-to-server webhook endpoint meant to be called by the payment provider
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    
    // Validate webhook payload (in a real app, verify signature here using paymentProvider)
    const { event_type, transaction_ref, provider, payment_details, status } = body;

    if (!event_type || !transaction_ref) {
      return NextResponse.json({ success: false, message: 'Invalid webhook payload' }, { status: 400 });
    }

    // Lookup the PENDING transaction
    const txns = await query<any[]>(
      `SELECT * FROM payment_transactions WHERE transaction_ref = ? AND provider = ?`,
      [transaction_ref, provider || 'mock_provider']
    );

    if (!txns || txns.length === 0) {
      return NextResponse.json({ success: false, message: 'Transaction not found for reconciliation' }, { status: 404 });
    }

    const txn = txns[0];
    
    // Idempotency: If transaction is already processed, return 200 OK
    if (txn.status !== 'PENDING') {
      return NextResponse.json({ success: true, message: 'Transaction already processed (Idempotent)' });
    }

    // Lookup booking
    const bookings = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [txn.booking_id]);
    if (!bookings || bookings.length === 0) {
       return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }
    const booking = bookings[0];

    // Handle reconciliation based on event
    await transaction(async (conn) => {
      if (status === 'SUCCESS' || event_type === 'payment.captured') {
        // RECONCILED SUCCESS
        await conn.execute(
          `UPDATE payment_transactions 
           SET status = 'SUCCESS', payment_details = JSON_SET(payment_details, '$.reconciled_at', ?, '$.reconciliation_status', 'SUCCESS_MATCHED'), updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [new Date().toISOString(), txn.id]
        );

        // Only update booking if it hasn't been confirmed by another successful retry attempt
        if (booking.status !== 'CONFIRMED') {
          await conn.execute(
            `UPDATE bookings SET status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [booking.id]
          );

          await conn.execute(
            `INSERT INTO vendor_availability (id, vendor_id, date, is_booked, notes)
             VALUES (?, ?, ?, TRUE, ?)
             ON DUPLICATE KEY UPDATE is_booked = TRUE, notes = VALUES(notes)`,
            [randomUUID(), booking.vendor_id, booking.event_date, `Locked by Confirmed Booking ${booking.booking_number} (Webhook Reconciled)`]
          );

          await conn.execute(
            `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, reason)
             VALUES (?, ?, ?, 'CONFIRMED', 'SYSTEM', ?)`,
            [randomUUID(), booking.id, booking.status, `Payment reconciliation success via webhook (Txn: ${transaction_ref})`]
          );

          await conn.execute(
            `INSERT INTO payouts (
              id, vendor_id, booking_id, amount, status, reference_id
            ) VALUES (?, ?, ?, ?, 'PENDING', ?)`,
            [
              randomUUID(),
              booking.vendor_id,
              booking.id,
              booking.vendor_payout_amount,
              `PAYOUT_REF_${Date.now()}`
            ]
          );
        }
      } else if (status === 'FAILED' || event_type === 'payment.failed') {
        // RECONCILED FAILED
        const detailsUpdate = JSON.stringify({
          reconciled_at: new Date().toISOString(),
          reconciliation_status: 'FAILED_MATCHED',
          webhook_reason: payment_details?.error || 'Provider rejected payment'
        });
        
        await conn.execute(
          `UPDATE payment_transactions 
           SET status = 'FAILED', payment_details = JSON_MERGE_PATCH(payment_details, ?), updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [detailsUpdate, txn.id]
        );
      }
    });

    return NextResponse.json({ success: true, message: 'Webhook processed and reconciled successfully' });

  } catch (error: any) {
    console.error('API /api/payments/webhook Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
