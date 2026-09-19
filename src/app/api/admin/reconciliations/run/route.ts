import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { auditLog } from '@/lib/security';
import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function getDbConnection() {
  return mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });
}

export async function POST(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (authResult instanceof NextResponse) return authResult;

    const actorId = 'system_admin'; 
    const body = await request.json();
    const { booking_id } = body;

    const db = await getDbConnection();

    // Reconcile a specific booking or all active bookings if not provided
    let query = `SELECT id, total_amount, status FROM bookings`;
    const params: any[] = [];
    
    if (booking_id) {
      query += ` WHERE id = ?`;
      params.push(booking_id);
    } else {
      query += ` ORDER BY created_at DESC LIMIT 50`; // Batch limit for mass run
    }

    const [bookings]: any = await db.execute(query, params);
    const results = [];

    for (const booking of bookings) {
      const mismatches: string[] = [];
      const bookingTotal = parseFloat(booking.total_amount);

      // Fetch related records
      const [payments]: any = await db.execute('SELECT * FROM payment_transactions WHERE booking_id = ? AND status = "SUCCESS"', [booking.id]);
      const [invoices]: any = await db.execute('SELECT * FROM invoices WHERE booking_id = ? AND status != "CANCELLED"', [booking.id]);
      const [refunds]: any = await db.execute('SELECT * FROM refunds WHERE booking_id = ? AND status = "PROCESSED"', [booking.id]);

      // Check 1: Booking vs Payment
      const totalPaid = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
      
      if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
        if (totalPaid < bookingTotal) {
          mismatches.push(`Amount mismatch: Booking total is ${bookingTotal}, but successful payments total ${totalPaid}`);
        }
        
        // Check 2: Invoice Issued
        if (invoices.length === 0) {
          mismatches.push('Missing active invoice for confirmed booking');
        } else {
          // Check Invoice Totals
          const invoiceTotal = parseFloat(invoices[0].total_amount);
          if (invoiceTotal !== bookingTotal) {
            mismatches.push(`Invoice total (${invoiceTotal}) does not match booking total (${bookingTotal})`);
          }
        }
      }

      // Check 3: Duplicate Payments
      if (payments.length > 1) {
        mismatches.push('Multiple successful payments detected for the same booking');
      }

      // Check 4: Refund logic (if booking cancelled, check refunds)
      if (booking.status === 'CANCELLED') {
        const totalRefunded = refunds.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);
        // Simple logic: if paid, there should usually be a refund (part or full) depending on policy,
        // but just flagging if there is a payment but no refund trace.
        if (totalPaid > 0 && refunds.length === 0) {
          mismatches.push('Booking is cancelled and has successful payments, but no processed refunds found (Review policy)');
        }
      }

      // Determine Status
      let recStatus = mismatches.length > 0 ? 'MISMATCH' : 'MATCHED';

      // Upsert into reconciliations
      const [existing]: any = await db.execute('SELECT id, status, internal_notes FROM reconciliations WHERE booking_id = ?', [booking.id]);
      
      if (existing.length > 0) {
        // If it was already marked as RESOLVED manually, we don't revert it unless we want to, 
        // but to respect manual reviews, let's keep it if it's PENDING_REVIEW or RESOLVED unless new mismatches appeared.
        const currentRec = existing[0];
        if (['PENDING_REVIEW', 'RESOLVED'].includes(currentRec.status) && recStatus === 'MISMATCH') {
          // Keep existing status if they are reviewing it manually, or downgrade if we force it.
          // Let's just update the mismatch details and timestamp, but leave status if RESOLVED.
          if (currentRec.status === 'PENDING_REVIEW') {
            recStatus = 'PENDING_REVIEW';
          } else {
            recStatus = 'RESOLVED';
          }
        }
        
        await db.execute(
          `UPDATE reconciliations SET status = ?, mismatch_details = ?, last_run_at = NOW() WHERE booking_id = ?`,
          [recStatus, JSON.stringify(mismatches), booking.id]
        );
        results.push({ booking_id: booking.id, status: recStatus, mismatches });
      } else {
        const recId = crypto.randomUUID();
        await db.execute(
          `INSERT INTO reconciliations (id, booking_id, status, mismatch_details, last_run_at) VALUES (?, ?, ?, ?, NOW())`,
          [recId, booking.id, recStatus, JSON.stringify(mismatches)]
        );
        results.push({ booking_id: booking.id, status: recStatus, mismatches });
      }
    }

    await auditLog(db, {
      actorId,
      actorRole: 'ADMIN',
      action: 'RUN_RECONCILIATION',
      entityId: 'BATCH',
      entityType: 'reconciliations',
      details: { run_count: bookings.length },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.end();

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Error running reconciliation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run reconciliation' },
      { status: 500 }
    );
  }
}
