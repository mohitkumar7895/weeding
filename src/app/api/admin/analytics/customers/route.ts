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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    let params: any[] = [];
    if (startDate && endDate) {
      dateFilter = ' AND created_at BETWEEN ? AND ?';
      params = [startDate, endDate];
    }

    const db = await getDbConnection();

    const [registrationsResult]: any = await db.execute(`SELECT COUNT(*) as count FROM users WHERE role = 'USER'${dateFilter}`, params);
    
    const [profilesResult]: any = await db.execute(`SELECT COUNT(*) as count FROM customer_profiles WHERE 1=1${dateFilter}`, params);

    const [shortlistsResult]: any = await db.execute(`SELECT COUNT(*) as count FROM shortlists WHERE 1=1${dateFilter}`, params);

    await db.end();

    return NextResponse.json({
      success: true,
      data: {
        registrations: registrationsResult[0].count,
        profilesCompleted: profilesResult[0].count,
        shortlistActions: shortlistsResult[0].count,
      }
    });

  } catch (error: any) {
    console.error('Error fetching customer analytics:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch customer analytics' }, { status: 500 });
  }
}
