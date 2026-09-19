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

    const [statusResult]: any = await db.execute(`
      SELECT status, COUNT(*) as count 
      FROM vendor_profiles 
      WHERE 1=1${dateFilter} 
      GROUP BY status
    `, params);

    const [verifiedResult]: any = await db.execute(`
      SELECT COUNT(*) as count FROM vendor_profiles WHERE is_verified = 1${dateFilter}
    `, params);

    const [servicesResult]: any = await db.execute(`
      SELECT COUNT(*) as count FROM services WHERE 1=1${dateFilter}
    `, params);

    await db.end();

    const statusMap: any = {};
    for (const row of statusResult) {
      statusMap[row.status] = row.count;
    }

    return NextResponse.json({
      success: true,
      data: {
        statuses: statusMap,
        verified: verifiedResult[0].count,
        totalServices: servicesResult[0].count,
      }
    });

  } catch (error: any) {
    console.error('Error fetching vendor analytics:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch vendor analytics' }, { status: 500 });
  }
}
