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

    let dateFilter = '';
    let params: any[] = [];
    if (startDate && endDate) {
      dateFilter = ' AND created_at BETWEEN ? AND ?';
      params = [startDate, endDate];
    }

    const db = await getDbConnection();

    // Total Users
    const [usersResult]: any = await db.execute(`SELECT COUNT(*) as count FROM users WHERE role = 'USER'${dateFilter}`, params);
    
    // Total Vendors
    const [vendorsResult]: any = await db.execute(`SELECT COUNT(*) as count FROM vendor_profiles WHERE 1=1${dateFilter.replace('created_at', 'created_at')}`, params);

    // Bookings Count
    const [bookingsResult]: any = await db.execute(`SELECT COUNT(*) as count FROM bookings WHERE status = 'CONFIRMED'${dateFilter}`, params);

    // Gross Booking Value (from payments)
    const [gbvResult]: any = await db.execute(`SELECT SUM(amount) as total FROM payments WHERE status = 'COMPLETED'${dateFilter}`, params);

    await db.end();

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: usersResult[0].count,
        totalVendors: vendorsResult[0].count,
        totalBookings: bookingsResult[0].count,
        grossBookingValue: gbvResult[0].total || 0,
      }
    });

  } catch (error: any) {
    console.error('Error fetching analytics overview:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch overview analytics' }, { status: 500 });
  }
}
