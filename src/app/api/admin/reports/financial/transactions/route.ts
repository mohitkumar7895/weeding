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

export async function GET(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT']);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const vendorId = searchParams.get('vendorId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const db = await getDbConnection();

    let query = `
      SELECT 
        b.id as booking_id, b.booking_number, b.total_amount as gross_amount, b.created_at as booking_date, b.status as booking_status,
        c.name as customer_name,
        v.business_name as vendor_name,
        p.id as payment_id, p.transaction_ref, p.amount as payment_amount, p.status as payment_status,
        rec.status as reconciliation_status,
        (SELECT SUM(amount) FROM vendor_payouts WHERE vendor_id = b.vendor_id AND status = 'COMPLETED') as total_payout_history,
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

    // Count Total for Pagination
    const countQuery = `SELECT COUNT(DISTINCT b.id) as total FROM bookings b 
                        LEFT JOIN payment_transactions p ON p.booking_id = b.id AND p.status = 'SUCCESS'
                        LEFT JOIN users c ON b.customer_id = c.id
                        LEFT JOIN vendors v ON b.vendor_id = v.id
                        LEFT JOIN reconciliations rec ON rec.booking_id = b.id 
                        ${query.substring(query.indexOf('WHERE'))}`;
    
    const [[{ total }]] = await db.execute(countQuery, params);

    query += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit.toString(), offset.toString()); 
    // note: mysql2 driver handles string parsing for limit/offset gracefully or we cast to Int in driver but prepared statement limit needs to be careful, using direct interpolation or integers.
    // wait, prepared statements with LIMIT ? OFFSET ? can be tricky in mysql2 if not enabled. Let's cast them.

    const [rows]: any = await db.execute(query.replace('LIMIT ? OFFSET ?', `LIMIT ${limit} OFFSET ${offset}`), params.slice(0, -2));

    await db.end();

    return NextResponse.json({ 
      success: true, 
      transactions: rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching transactions report:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
