import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { query } from '@/lib/db';
import { ensureOpsTables, safeSelect } from '@/lib/ensureOpsTables';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!authResult.ok) return authResult.response!;

    await ensureOpsTables();

    const invoices = await safeSelect<any[]>(
      `SELECT i.*,
        b.booking_number, b.status as booking_status,
        p.transaction_ref as payment_ref, p.status as payment_status, p.amount as payment_amount
       FROM invoices i
       LEFT JOIN bookings b ON i.booking_id = b.id
       LEFT JOIN payment_transactions p ON i.payment_id = p.id
       WHERE i.id = ?`,
      [id]
    );

    if (!invoices.length) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoices[0];
    const receipts = await safeSelect<any[]>('SELECT * FROM receipts WHERE invoice_id = ?', [id]);
    const cancellations = await safeSelect<any[]>('SELECT * FROM cancellations WHERE invoice_id = ?', [id]);
    const refunds = await safeSelect<any[]>('SELECT * FROM refunds WHERE invoice_id = ?', [id]);

    try {
      invoice.customer_billing_info =
        typeof invoice.customer_billing_info === 'string'
          ? JSON.parse(invoice.customer_billing_info)
          : invoice.customer_billing_info;
      invoice.vendor_billing_info =
        typeof invoice.vendor_billing_info === 'string'
          ? JSON.parse(invoice.vendor_billing_info)
          : invoice.vendor_billing_info;
    } catch {
      /* keep raw */
    }

    invoice.receipts = receipts;
    invoice.cancellations = cancellations;
    invoice.refunds = refunds;

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    console.error('Error fetching invoice details:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoice details' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!authResult.ok) return authResult.response!;

    const body = await request.json();
    const { status } = body;

    if (!status || !['ISSUED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing status' }, { status: 400 });
    }

    await ensureOpsTables();
    const invoices = await safeSelect<any[]>('SELECT status FROM invoices WHERE id = ?', [id]);
    if (!invoices.length) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    const currentStatus = invoices[0].status;

    if (currentStatus === 'CANCELLED') {
      return NextResponse.json({ success: false, error: 'Cannot modify a cancelled invoice' }, { status: 400 });
    }

    if (currentStatus === 'ISSUED' && status === 'ISSUED') {
      return NextResponse.json({ success: false, error: 'Invoice is already issued' }, { status: 409 });
    }

    const issuedAt = status === 'ISSUED' ? new Date() : null;

    if (status === 'ISSUED') {
      await query('UPDATE invoices SET status = ?, issued_at = ? WHERE id = ? AND status = "DRAFT"', [
        status,
        issuedAt,
        id,
      ]);
    } else {
      await query('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
    }

    return NextResponse.json({ success: true, message: 'Invoice updated successfully' });
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to update invoice' }, { status: 500 });
  }
}
