import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { query } from '@/lib/db';
import { ensureOpsTables, safeSelect } from '@/lib/ensureOpsTables';

function generateInvoiceNumber() {
  const prefix = 'INV';
  const timestamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${rand}`;
}

export async function GET(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!authResult.ok) return authResult.response!;

    await ensureOpsTables();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let sql = `
      SELECT i.*,
        u.name as customer_name,
        v.business_name as vendor_name,
        b.booking_number
      FROM invoices i
      LEFT JOIN bookings b ON i.booking_id = b.id
      LEFT JOIN users u ON i.customer_id = u.id
      LEFT JOIN vendors v ON i.vendor_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ` AND i.status = ?`;
      params.push(status);
    }

    if (search) {
      sql += ` AND (i.invoice_number LIKE ? OR u.name LIKE ? OR v.business_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY i.created_at DESC LIMIT 200`;

    const rows = await safeSelect<any[]>(sql, params);
    return NextResponse.json({ success: true, invoices: rows });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ success: true, invoices: [] });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!authResult.ok) return authResult.response!;

    const actorId = authResult.user?.id || 'system_admin';
    const body = await request.json();
    const { booking_id } = body;

    if (!booking_id) {
      return NextResponse.json({ success: false, error: 'booking_id is required' }, { status: 400 });
    }

    await ensureOpsTables();

    const bookings = await safeSelect<any[]>(
      `
      SELECT b.*,
        c.name as customer_name, cp.billing_address as customer_billing_address, c.email as customer_email,
        v.business_name as vendor_name, v.gstin as vendor_gstin, v.billing_address as vendor_billing_address, v.business_email as vendor_email
      FROM bookings b
      LEFT JOIN users c ON b.customer_id = c.id
      LEFT JOIN customer_profiles cp ON b.customer_id = cp.user_id
      LEFT JOIN vendors v ON b.vendor_id = v.id
      WHERE b.id = ?
    `,
      [booking_id]
    );

    if (!bookings.length) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];

    const existing = await safeSelect<any[]>('SELECT id FROM invoices WHERE booking_id = ?', [booking_id]);
    if (existing.length) {
      return NextResponse.json({ success: false, error: 'Invoice already exists for this booking' }, { status: 409 });
    }

    const gstRows = await safeSelect<any[]>(
      `SELECT config_value FROM system_configuration WHERE config_key = 'GST_RATE' LIMIT 1`
    );
    let taxRate = 18.0;
    try {
      if (gstRows?.[0]?.config_value) {
        const parsed =
          typeof gstRows[0].config_value === 'string' ? JSON.parse(gstRows[0].config_value) : gstRows[0].config_value;
        if (parsed.rate) taxRate = parseFloat(parsed.rate);
      }
    } catch {
      /* keep default */
    }
    const totalAmount = parseFloat(booking.total_amount);
    const taxableAmount = totalAmount / (1 + taxRate / 100);
    const taxAmount = totalAmount - taxableAmount;

    const customerBillingInfo = JSON.stringify({
      name: booking.customer_name,
      email: booking.customer_email,
      address: booking.customer_billing_address || 'Not Provided',
    });

    const vendorBillingInfo = JSON.stringify({
      business_name: booking.vendor_name,
      email: booking.vendor_email,
      gstin: booking.vendor_gstin || 'Not Provided',
      address: booking.vendor_billing_address || 'Not Provided',
    });

    const payments = await safeSelect<any[]>(
      'SELECT id FROM payment_transactions WHERE booking_id = ? AND status = "SUCCESS" ORDER BY created_at DESC LIMIT 1',
      [booking_id]
    );
    const paymentId = payments.length ? payments[0].id : null;

    const invoiceId = crypto.randomUUID();
    const invoiceNumber = generateInvoiceNumber();

    await query(
      `
      INSERT INTO invoices (
        id, invoice_number, booking_id, payment_id, customer_id, vendor_id,
        customer_billing_info, vendor_billing_info,
        taxable_amount, tax_rate, tax_amount, total_amount,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')
    `,
      [
        invoiceId,
        invoiceNumber,
        booking_id,
        paymentId,
        booking.customer_id,
        booking.vendor_id,
        customerBillingInfo,
        vendorBillingInfo,
        taxableAmount.toFixed(2),
        taxRate.toFixed(2),
        taxAmount.toFixed(2),
        totalAmount.toFixed(2),
      ]
    );

    try {
      await query(
        `INSERT INTO audit_logs (id, user_id, role, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          actorId,
          'FINANCE',
          'GENERATE_INVOICE',
          'invoices',
          invoiceId,
          null,
          JSON.stringify({ booking_id, invoiceNumber, totalAmount }),
          request.headers.get('x-forwarded-for') || '127.0.0.1',
          null,
        ]
      );
    } catch {
      /* audit is best-effort */
    }

    return NextResponse.json({ success: true, invoice: { id: invoiceId, invoice_number: invoiceNumber } });
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate invoice' }, { status: 500 });
  }
}
