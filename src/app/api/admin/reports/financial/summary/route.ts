import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { firstCount, safeSelect } from '@/lib/ensureOpsTables';

const EMPTY = {
  success: true,
  summary: {
    gross_booking_value: 0,
    successful_payments: 0,
    failed_payments: 0,
    total_refunds: 0,
    total_disputed: 0,
    reconciliation: {
      total: 0,
      MATCHED: 0,
      MISMATCH: 0,
      PENDING_REVIEW: 0,
      RESOLVED: 0,
    },
  },
};

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const vendorId = searchParams.get('vendorId');

    let bCond = '1=1';
    const bParams: any[] = [];
    if (startDate) {
      bCond += ' AND b.created_at >= ?';
      bParams.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      bCond += ' AND b.created_at <= ?';
      bParams.push(`${endDate} 23:59:59`);
    }
    if (vendorId) {
      bCond += ' AND b.vendor_id = ?';
      bParams.push(vendorId);
    }

    const [grossRows, payRows, refundRows, disputeRows, recStats] = await Promise.all([
      safeSelect<any[]>(
        `SELECT SUM(total_amount) as gross_booking_value FROM bookings b WHERE ${bCond} AND b.status IN ('CONFIRMED', 'COMPLETED')`,
        bParams
      ),
      safeSelect<any[]>(
        `SELECT
           SUM(CASE WHEN p.status IN ('SUCCESS','COMPLETED') THEN p.amount ELSE 0 END) as successful_payments,
           SUM(CASE WHEN p.status IN ('FAILED', 'PENDING') THEN p.amount ELSE 0 END) as failed_payments
         FROM payment_transactions p
         LEFT JOIN bookings b ON p.booking_id = b.id
         WHERE ${bCond}`,
        bParams
      ),
      safeSelect<any[]>(
        `SELECT SUM(r.amount) as total_refunds
         FROM refunds r
         LEFT JOIN bookings b ON r.booking_id = b.id
         WHERE ${bCond} AND r.status IN ('PROCESSED','APPROVED','COMPLETED')`,
        bParams
      ),
      safeSelect<any[]>(
        `SELECT COUNT(*) as count
         FROM disputes d
         LEFT JOIN bookings b ON d.booking_id = b.id
         WHERE ${bCond} AND d.status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')`,
        bParams
      ),
      safeSelect<any[]>(
        `SELECT r.status, COUNT(r.id) as count
         FROM reconciliations r
         LEFT JOIN bookings b ON r.booking_id = b.id
         WHERE ${bCond}
         GROUP BY r.status`,
        bParams
      ),
    ]);

    const recCounts = {
      MATCHED: 0,
      MISMATCH: 0,
      PENDING_REVIEW: 0,
      RESOLVED: 0,
    };
    let total_reconciled = 0;
    recStats.forEach((r: any) => {
      if (r.status in recCounts) recCounts[r.status as keyof typeof recCounts] = Number(r.count || 0);
      total_reconciled += Number(r.count || 0);
    });

    return NextResponse.json({
      success: true,
      summary: {
        gross_booking_value: Number(grossRows[0]?.gross_booking_value || 0),
        successful_payments: Number(payRows[0]?.successful_payments || 0),
        failed_payments: Number(payRows[0]?.failed_payments || 0),
        total_refunds: Number(refundRows[0]?.total_refunds || 0),
        total_disputed: firstCount(disputeRows),
        reconciliation: { total: total_reconciled, ...recCounts },
      },
    });
  } catch (error: any) {
    console.error('Error fetching financial summary:', error);
    return NextResponse.json(EMPTY);
  }
}
