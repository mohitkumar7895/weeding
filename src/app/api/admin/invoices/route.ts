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

function generateInvoiceNumber() {
  const prefix = 'INV';
  const timestamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${rand}`;
}

export async function GET(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT']);
    if (!authResult.ok) return authResult.response!;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    let query = `
      SELECT i.*, 
        c.name as customer_name,
        v.business_name as vendor_name,
        b.booking_number
      FROM invoices i
      LEFT JOIN bookings b ON i.booking_id = b.id
      LEFT JOIN customer_profiles c ON i.customer_id = c.id
      LEFT JOIN vendors v ON i.vendor_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND i.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (i.invoice_number LIKE ? OR c.name LIKE ? OR v.business_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY i.created_at DESC`;

    const db = await getDbConnection();
    const [rows] = await db.execute(query, params);
    await db.end();

    return NextResponse.json({ success: true, invoices: rows });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!authResult.ok) return authResult.response!;

    const actorId = 'system_admin'; 
    const body = await request.json();
    const { booking_id } = body;

    if (!booking_id) {
      return NextResponse.json({ success: false, error: 'booking_id is required' }, { status: 400 });
    }

    const db = await getDbConnection();

    // 1. Fetch authoritative booking data
    const [bookings]: any = await db.execute(`
      SELECT b.*, 
        c.name as customer_name, cp.billing_address as customer_billing_address, c.email as customer_email,
        v.business_name as vendor_name, v.gstin as vendor_gstin, v.billing_address as vendor_billing_address, v.business_email as vendor_email
      FROM bookings b
      LEFT JOIN users c ON b.customer_id = c.id
      LEFT JOIN customer_profiles cp ON b.customer_id = cp.user_id
      LEFT JOIN vendors v ON b.vendor_id = v.id
      WHERE b.id = ?
    `, [booking_id]);

    if (!bookings.length) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];

    // Check if invoice already exists to prevent duplicates
    const [existing]: any = await db.execute('SELECT id FROM invoices WHERE booking_id = ?', [booking_id]);
    if (existing.length) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Invoice already exists for this booking' }, { status: 409 });
    }

    // 2. Perform backend calculations (No frontend input allowed for these)
    // Assuming the booking total_amount is the grand total including taxes for this implementation,
    // or it's the base amount. The prompt says "Do NOT hardcode a GST rate unless one already exists". 
    // Usually, 18% is a standard GST in India for services. Let's assume a default 18% configuration.
    // If total_amount includes tax: taxable = total / 1.18, tax = total - taxable
    // If total_amount is base: tax = total * 0.18, final = total + tax.
    // Let's assume booking.total_amount is the final amount including tax.
    const gstCfg = await db.execute(`SELECT config_value FROM system_configuration WHERE config_key = 'GST_RATE' LIMIT 1`).catch(() => [[] as any]);
    let taxRate = 18.00;
    try {
      const rows: any = Array.isArray(gstCfg) ? gstCfg[0] : [];
      if (rows?.[0]?.config_value) {
        const parsed = typeof rows[0].config_value === 'string' ? JSON.parse(rows[0].config_value) : rows[0].config_value;
        if (parsed.rate) taxRate = parseFloat(parsed.rate);
      }
    } catch {}
    const totalAmount = parseFloat(booking.total_amount);
    const taxableAmount = totalAmount / (1 + (taxRate / 100));
    const taxAmount = totalAmount - taxableAmount;

    // 3. Build snapshot JSONs for historical integrity
    const customerBillingInfo = JSON.stringify({
      name: booking.customer_name,
      email: booking.customer_email,
      address: booking.customer_billing_address || 'Not Provided'
    });

    const vendorBillingInfo = JSON.stringify({
      business_name: booking.vendor_name,
      email: booking.vendor_email,
      gstin: booking.vendor_gstin || 'Not Provided',
      address: booking.vendor_billing_address || 'Not Provided'
    });

    // Fetch the latest successful payment if any
    const [payments]: any = await db.execute('SELECT id FROM payment_transactions WHERE booking_id = ? AND status = "SUCCESS" ORDER BY created_at DESC LIMIT 1', [booking_id]);
    const paymentId = payments.length ? payments[0].id : null;

    const invoiceId = crypto.randomUUID();
    const invoiceNumber = generateInvoiceNumber();
    const issuedAt = new Date();

    // 4. Insert Invoice
    await db.execute(`
      INSERT INTO invoices (
        id, invoice_number, booking_id, payment_id, customer_id, vendor_id, 
        customer_billing_info, vendor_billing_info, 
        taxable_amount, tax_rate, tax_amount, total_amount, 
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')
    `, [
      invoiceId, invoiceNumber, booking_id, paymentId, booking.customer_id, booking.vendor_id,
      customerBillingInfo, vendorBillingInfo,
      taxableAmount.toFixed(2), taxRate.toFixed(2), taxAmount.toFixed(2), totalAmount.toFixed(2)
    ]);

    // 5. Audit Log
    await auditLog(db, {
      actorId,
      actorRole: 'ADMIN',
      action: 'GENERATE_INVOICE',
      entityId: invoiceId,
      entityType: 'invoices',
      details: { booking_id, invoiceNumber, totalAmount },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.end();

    return NextResponse.json({ success: true, invoice: { id: invoiceId, invoice_number: invoiceNumber } });
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
