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
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
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

    // Payments Breakdown
    const [paymentsResult]: any = await db.execute(`
      SELECT status, SUM(amount) as total_amount, COUNT(*) as count 
      FROM payments 
      WHERE 1=1${dateFilter} 
      GROUP BY status
    `, params);

    // Commissions
    const [commissionResult]: any = await db.execute(`
      SELECT SUM(commission_amount) as total FROM commission_records WHERE 1=1${dateFilter}
    `, params);

    // Refunds
    const [refundsResult]: any = await db.execute(`
      SELECT SUM(refund_amount) as total, COUNT(*) as count FROM refunds WHERE status = 'COMPLETED'${dateFilter}
    `, params);

    // Payouts
    const [payoutsResult]: any = await db.execute(`
      SELECT SUM(amount) as total, COUNT(*) as count FROM payouts WHERE status = 'PAID'${dateFilter}
    `, params);

    // Disputes
    const [disputesResult]: any = await db.execute(`
      SELECT SUM(dispute_amount) as total, COUNT(*) as count FROM disputes WHERE status = 'OPEN'${dateFilter}
    `, params);

    await db.end();

    const paymentMap: any = {};
    for (const row of paymentsResult) {
      paymentMap[row.status] = { total: row.total_amount, count: row.count };
    }

    return NextResponse.json({
      success: true,
      data: {
        payments: paymentMap,
        totalCommission: commissionResult[0].total || 0,
        refunds: { total: refundsResult[0].total || 0, count: refundsResult[0].count },
        payouts: { total: payoutsResult[0].total || 0, count: payoutsResult[0].count },
        activeDisputes: { total: disputesResult[0].total || 0, count: disputesResult[0].count },
      }
    });

  } catch (error: any) {
    console.error('Error fetching financial analytics:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch financial analytics' }, { status: 500 });
  }
}
