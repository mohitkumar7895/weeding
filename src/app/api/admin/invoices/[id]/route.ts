import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
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

    const invoiceId = id;
    const db = await getDbConnection();

    const [invoices]: any = await db.execute(
      `SELECT i.*, 
        b.booking_number, b.status as booking_status,
        p.transaction_ref as payment_ref, p.status as payment_status, p.amount as payment_amount
       FROM invoices i
       LEFT JOIN bookings b ON i.booking_id = b.id
       LEFT JOIN payment_transactions p ON i.payment_id = p.id
       WHERE i.id = ?`,
      [invoiceId]
    );

    if (!invoices.length) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoices[0];
    
    // Fetch related records
    const [receipts]: any = await db.execute('SELECT * FROM receipts WHERE invoice_id = ?', [invoiceId]);
    const [cancellations]: any = await db.execute('SELECT * FROM cancellations WHERE invoice_id = ?', [invoiceId]);
    const [refunds]: any = await db.execute('SELECT * FROM refunds WHERE invoice_id = ?', [invoiceId]);

    await db.end();

    try {
      invoice.customer_billing_info = typeof invoice.customer_billing_info === 'string' 
        ? JSON.parse(invoice.customer_billing_info) 
        : invoice.customer_billing_info;
        
      invoice.vendor_billing_info = typeof invoice.vendor_billing_info === 'string' 
        ? JSON.parse(invoice.vendor_billing_info) 
        : invoice.vendor_billing_info;
    } catch (e) {
      console.warn('Failed to parse billing JSON', e);
    }

    invoice.receipts = receipts;
    invoice.cancellations = cancellations;
    invoice.refunds = refunds;

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    console.error('Error fetching invoice details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoice details' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (authResult instanceof NextResponse) return authResult;

    const invoiceId = id;
    const body = await request.json();
    const { status } = body;

    if (!status || !['ISSUED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing status' }, { status: 400 });
    }

    const db = await getDbConnection();

    const [invoices]: any = await db.execute('SELECT status FROM invoices WHERE id = ?', [invoiceId]);
    if (!invoices.length) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    const currentStatus = invoices[0].status;

    if (currentStatus === 'CANCELLED') {
      await db.end();
      return NextResponse.json({ success: false, error: 'Cannot modify a cancelled invoice' }, { status: 400 });
    }

    if (currentStatus === 'ISSUED' && status === 'ISSUED') {
      await db.end();
      return NextResponse.json({ success: false, error: 'Invoice is already issued' }, { status: 400 });
    }

    const issuedAt = status === 'ISSUED' ? new Date() : null;

    if (status === 'ISSUED') {
      await db.execute('UPDATE invoices SET status = ?, issued_at = ? WHERE id = ? AND status = "DRAFT"', [status, issuedAt, invoiceId]);
    } else {
      await db.execute('UPDATE invoices SET status = ? WHERE id = ?', [status, invoiceId]);
    }

    await db.end();
    return NextResponse.json({ success: true, message: 'Invoice updated successfully' });
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}
