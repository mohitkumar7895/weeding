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
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let filterQuery = '';
    let params: any[] = [];

    if (status) {
      filterQuery += ' AND c.status = ?';
      params.push(status);
    }

    const db = await getDbConnection();

    // Summary counts
    const [counts]: any = await db.execute(`
      SELECT status, COUNT(*) as c FROM duplicate_profile_cases GROUP BY status
    `);

    // List records
    const [cases]: any = await db.execute(`
      SELECT c.*, 
             u.name as reviewer_name,
             p1.first_name as p1_first, p1.last_name as p1_last,
             p2.first_name as p2_first, p2.last_name as p2_last
      FROM duplicate_profile_cases c
      LEFT JOIN users u ON c.reviewed_by = u.id
      JOIN customer_profiles p1 ON c.primary_profile_id = p1.user_id
      JOIN customer_profiles p2 ON c.suspected_duplicate_id = p2.user_id
      WHERE 1=1 ${filterQuery}
      ORDER BY c.created_at DESC
      LIMIT 100
    `, params);

    await db.end();

    const summary = {
      OPEN: 0,
      UNDER_REVIEW: 0,
      CONFIRMED_DUPLICATE: 0,
      NOT_DUPLICATE: 0,
      DISMISSED: 0
    };

    for (const row of counts) {
      if (summary[row.status as keyof typeof summary] !== undefined) {
        summary[row.status as keyof typeof summary] = row.c;
      }
    }

    return NextResponse.json({ success: true, summary, cases });
  } catch (error: any) {
    console.error('Error fetching duplicate cases:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch duplicate cases' }, { status: 500 });
  }
}
