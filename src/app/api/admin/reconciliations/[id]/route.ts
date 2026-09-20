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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT']);
    if (authResult instanceof NextResponse) return authResult;

    const db = await getDbConnection();

    const [reconciliations]: any = await db.execute(
      `SELECT r.*, 
        b.booking_number, b.total_amount as booking_total, b.status as booking_status,
        c.name as customer_name,
        v.business_name as vendor_name
       FROM reconciliations r
       LEFT JOIN bookings b ON r.booking_id = b.id
       LEFT JOIN users c ON b.customer_id = c.id
       LEFT JOIN vendors v ON b.vendor_id = v.id
       WHERE r.id = ?`,
      [id]
    );

    if (!reconciliations.length) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Reconciliation record not found' }, { status: 404 });
    }

    const rec = reconciliations[0];
    rec.mismatch_details = typeof rec.mismatch_details === 'string' ? JSON.parse(rec.mismatch_details) : rec.mismatch_details;

    // Fetch context
    const [payments] = await db.execute('SELECT * FROM payment_transactions WHERE booking_id = ?', [rec.booking_id]);
    const [payouts] = await db.execute('SELECT * FROM vendor_payouts WHERE vendor_id = (SELECT vendor_id FROM bookings WHERE id = ?)', [rec.booking_id]);
    const [invoices] = await db.execute('SELECT * FROM invoices WHERE booking_id = ?', [rec.booking_id]);
    const [refunds] = await db.execute('SELECT * FROM refunds WHERE booking_id = ?', [rec.booking_id]);

    await db.end();

    return NextResponse.json({ 
      success: true, 
      reconciliation: rec,
      context: {
        payments,
        payouts, // We are pulling all for the vendor, we'd ideally filter by a linkage table if it exists
        invoices,
        refunds
      }
    });
  } catch (error: any) {
    console.error('Error fetching reconciliation details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch details' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (authResult instanceof NextResponse) return authResult;

    const actorId = 'system_admin'; 
    const body = await request.json();
    const { status, internal_notes } = body;

    if (!status || !['MATCHED', 'MISMATCH', 'PENDING_REVIEW', 'RESOLVED'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const db = await getDbConnection();

    await db.execute(
      'UPDATE reconciliations SET status = ?, internal_notes = ? WHERE id = ?',
      [status, internal_notes || null, id]
    );

    await auditLog(db, {
      actorId,
      actorRole: 'ADMIN',
      action: 'UPDATE_RECONCILIATION',
      entityId: id,
      entityType: 'reconciliations',
      details: { status },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.end();
    return NextResponse.json({ success: true, message: 'Reconciliation updated successfully' });
  } catch (error: any) {
    console.error('Error updating reconciliation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update reconciliation' },
      { status: 500 }
    );
  }
}
