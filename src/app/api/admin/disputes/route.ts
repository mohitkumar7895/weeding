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
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const escalated = searchParams.get('escalated');
    const overdue = searchParams.get('overdue');
    
    let query = `
      SELECT d.*, 
        c.name as customer_name,
        v.business_name as vendor_name,
        b.booking_number
      FROM disputes d
      LEFT JOIN bookings b ON d.booking_id = b.id
      LEFT JOIN customer_profiles c ON b.customer_id = c.id
      LEFT JOIN vendors v ON b.vendor_id = v.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND d.status = ?`;
      params.push(status);
    }
    
    if (type) {
      query += ` AND d.type = ?`;
      params.push(type);
    }

    if (escalated === 'true') {
      query += ` AND d.status = 'ESCALATED'`;
    }

    if (overdue === 'true') {
      query += ` AND d.deadline_date IS NOT NULL AND d.deadline_date < NOW() AND d.status NOT IN ('RESOLVED', 'REJECTED', 'CLOSED')`;
    }

    if (search) {
      query += ` AND (d.id LIKE ? OR c.name LIKE ? OR v.business_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY d.created_at DESC`;

    const db = await getDbConnection();
    const [rows] = await db.execute(query, params);
    await db.end();

    return NextResponse.json({ success: true, disputes: rows });
  } catch (error: any) {
    console.error('Error fetching disputes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch disputes' },
      { status: 500 }
    );
  }
}
