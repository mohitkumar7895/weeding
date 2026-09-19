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

export async function GET(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const vendorId = searchParams.get('vendorId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    const db = await getDbConnection();

    let query = `
      SELECT 
        b.booking_number, b.created_at as booking_date, b.total_amount as gross_amount, b.status as booking_status,
        c.name as customer_name,
        v.business_name as vendor_name,
        p.transaction_ref, p.amount as payment_amount, p.status as payment_status,
        rec.status as reconciliation_status,
        (SELECT SUM(amount) FROM refunds WHERE booking_id = b.id AND status = 'PROCESSED') as total_refund,
        (SELECT SUM(amount_under_dispute) FROM disputes WHERE booking_id = b.id) as total_dispute
      FROM bookings b
      LEFT JOIN payment_transactions p ON p.booking_id = b.id AND p.status = 'SUCCESS'
      LEFT JOIN users c ON b.customer_id = c.id
      LEFT JOIN vendors v ON b.vendor_id = v.id
      LEFT JOIN reconciliations rec ON rec.booking_id = b.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (startDate) { query += ' AND b.created_at >= ?'; params.push(`${startDate} 00:00:00`); }
    if (endDate) { query += ' AND b.created_at <= ?'; params.push(`${endDate} 23:59:59`); }
    if (vendorId) { query += ' AND b.vendor_id = ?'; params.push(vendorId); }
    if (status) { query += ' AND rec.status = ?'; params.push(status); }
    if (search) {
      query += ` AND (b.booking_number LIKE ? OR p.transaction_ref LIKE ? OR c.name LIKE ? OR v.business_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY b.created_at DESC`;

    const [rows]: any = await db.execute(query, params);

    // Audit Log the export action
    await auditLog(db, {
      actorId: 'system_admin',
      actorRole: 'ADMIN',
      action: 'EXPORT_FINANCIAL_REPORT',
      entityId: 'BATCH',
      entityType: 'reports',
      details: { filters: { startDate, endDate, vendorId, status, search }, record_count: rows.length },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.end();

    // Convert rows to CSV
    if (rows.length === 0) {
      return new NextResponse('No records found for the selected filters.', { status: 404 });
    }

    const headers = [
      'Booking Ref', 'Date', 'Gross Amount', 'Booking Status', 
      'Customer', 'Vendor', 'Payment Ref', 'Payment Amount', 
      'Payment Status', 'Reconciliation Status', 'Refunds', 'Disputes'
    ];

    const csvRows = [headers.join(',')];

    for (const row of rows) {
      const values = [
        row.booking_number,
        new Date(row.booking_date).toISOString(),
        row.gross_amount || 0,
        row.booking_status,
        `"${(row.customer_name || '').replace(/"/g, '""')}"`,
        `"${(row.vendor_name || '').replace(/"/g, '""')}"`,
        row.transaction_ref || '',
        row.payment_amount || 0,
        row.payment_status || '',
        row.reconciliation_status || 'N/A',
        row.total_refund || 0,
        row.total_dispute || 0
      ];
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');

    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', `attachment; filename="financial_report_${new Date().getTime()}.csv"`);

    return response;
  } catch (error: any) {
    console.error('Error generating financial export:', error);
    return new NextResponse('Failed to generate export', { status: 500 });
  }
}
