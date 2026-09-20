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
    if (!authResult.ok) return authResult.response!;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const vendorId = searchParams.get('vendorId');

    const db = await getDbConnection();

    // Base query conditions for Bookings
    let bCond = '1=1';
    const bParams: any[] = [];
    if (startDate) { bCond += ' AND b.created_at >= ?'; bParams.push(`${startDate} 00:00:00`); }
    if (endDate) { bCond += ' AND b.created_at <= ?'; bParams.push(`${endDate} 23:59:59`); }
    if (vendorId) { bCond += ' AND b.vendor_id = ?'; bParams.push(vendorId); }

    const [grossRows]: any = await db.execute(`
      SELECT SUM(total_amount) as gross_booking_value FROM bookings b WHERE ${bCond} AND b.status IN ('CONFIRMED', 'COMPLETED')
    `, bParams);
    const gross_booking_value = grossRows?.[0]?.gross_booking_value;

    const [payRows]: any = await db.execute(`
      SELECT 
        SUM(CASE WHEN p.status = 'SUCCESS' THEN p.amount ELSE 0 END) as successful_payments,
        SUM(CASE WHEN p.status IN ('FAILED', 'PENDING') THEN p.amount ELSE 0 END) as failed_payments
      FROM payment_transactions p
      JOIN bookings b ON p.booking_id = b.id
      WHERE ${bCond}
    `, bParams);
    const successful_payments = payRows?.[0]?.successful_payments;
    const failed_payments = payRows?.[0]?.failed_payments;

    const [refundRows]: any = await db.execute(`
      SELECT SUM(r.amount) as total_refunds
      FROM refunds r
      JOIN bookings b ON r.booking_id = b.id
      WHERE ${bCond} AND r.status = 'PROCESSED'
    `, bParams);
    const total_refunds = refundRows?.[0]?.total_refunds;

    const [disputeRows]: any = await db.execute(`
      SELECT SUM(d.amount_under_dispute) as total_disputed
      FROM disputes d
      JOIN bookings b ON d.booking_id = b.id
      WHERE ${bCond} AND d.status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')
    `, bParams);
    const total_disputed = disputeRows?.[0]?.total_disputed;

    // 5. Reconciliation Stats
    const [recStats]: any = await db.execute(`
      SELECT r.status, COUNT(r.id) as count
      FROM reconciliations r
      JOIN bookings b ON r.booking_id = b.id
      WHERE ${bCond}
      GROUP BY r.status
    `, bParams);

    const recCounts = {
      MATCHED: 0,
      MISMATCH: 0,
      PENDING_REVIEW: 0,
      RESOLVED: 0
    };
    let total_reconciled = 0;
    
    recStats.forEach((r: any) => {
      recCounts[r.status as keyof typeof recCounts] = r.count;
      total_reconciled += r.count;
    });

    await db.end();

    const summary = {
      gross_booking_value: gross_booking_value || 0,
      successful_payments: successful_payments || 0,
      failed_payments: failed_payments || 0,
      total_refunds: total_refunds || 0,
      total_disputed: total_disputed || 0,
      reconciliation: {
        total: total_reconciled,
        ...recCounts
      }
    };

    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    console.error('Error fetching financial summary:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch financial summary' }, { status: 500 });
  }
}
