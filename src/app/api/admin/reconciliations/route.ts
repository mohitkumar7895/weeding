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
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    let query = `
      SELECT r.*, 
        b.booking_number, b.total_amount as booking_total,
        c.name as customer_name,
        v.business_name as vendor_name
      FROM reconciliations r
      LEFT JOIN bookings b ON r.booking_id = b.id
      LEFT JOIN users c ON b.customer_id = c.id
      LEFT JOIN vendors v ON b.vendor_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (b.booking_number LIKE ? OR c.name LIKE ? OR v.business_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY r.last_run_at DESC`;

    const db = await getDbConnection();
    const [rows]: any = await db.execute(query, params);
    await db.end();

    const reconciliations = rows.map((r: any) => ({
      ...r,
      mismatch_details: typeof r.mismatch_details === 'string' ? JSON.parse(r.mismatch_details) : r.mismatch_details
    }));

    return NextResponse.json({ success: true, reconciliations });
  } catch (error: any) {
    console.error('Error fetching reconciliations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reconciliations' },
      { status: 500 }
    );
  }
}
