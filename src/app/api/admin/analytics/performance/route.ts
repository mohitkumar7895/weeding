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
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
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

    // City Performance (Based on vendor profile count)
    const [cityResult]: any = await db.execute(`
      SELECT city, COUNT(*) as vendor_count 
      FROM vendor_profiles 
      WHERE 1=1${dateFilter} 
      GROUP BY city
      ORDER BY vendor_count DESC
      LIMIT 10
    `, params);

    // Category Performance (Based on services)
    const [categoryResult]: any = await db.execute(`
      SELECT category, COUNT(*) as service_count 
      FROM services 
      WHERE 1=1${dateFilter} 
      GROUP BY category
      ORDER BY service_count DESC
      LIMIT 10
    `, params);

    // Top Vendors (Based on bookings)
    const [topVendorsResult]: any = await db.execute(`
      SELECT v.business_name, COUNT(b.id) as booking_count 
      FROM bookings b
      JOIN vendor_profiles v ON b.vendor_id = v.user_id
      WHERE b.status = 'CONFIRMED'${dateFilter.replace('created_at', 'b.created_at')}
      GROUP BY v.user_id, v.business_name
      ORDER BY booking_count DESC
      LIMIT 10
    `, params);

    await db.end();

    return NextResponse.json({
      success: true,
      data: {
        topCities: cityResult,
        topCategories: categoryResult,
        topVendors: topVendorsResult,
      }
    });

  } catch (error: any) {
    console.error('Error fetching performance analytics:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch performance analytics' }, { status: 500 });
  }
}
