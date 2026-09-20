import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, firstCount, safeSelect } from '@/lib/ensureOpsTables';

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    await ensureOpsTables();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const params: any[] = [];
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = ' AND created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const paymentsResult = await safeSelect<any[]>(
      `SELECT status, SUM(amount) as total_amount, COUNT(*) as count FROM payment_transactions WHERE 1=1${dateFilter} GROUP BY status`,
      params
    );
    const commissionResult = await safeSelect<any[]>(
      `SELECT SUM(commission_amount) as total FROM commission_records WHERE 1=1${dateFilter}`,
      params
    );
    const refundsResult = await safeSelect<any[]>(
      `SELECT SUM(amount) as total, COUNT(*) as count FROM refunds WHERE status IN ('COMPLETED','APPROVED','PROCESSED')${dateFilter}`,
      params
    );
    const payoutsResult = await safeSelect<any[]>(
      `SELECT SUM(amount) as total, COUNT(*) as count FROM payouts WHERE status = 'PAID'${dateFilter}`,
      params
    );
    const disputesResult = await safeSelect<any[]>(
      `SELECT COUNT(*) as count FROM disputes WHERE status = 'OPEN'${dateFilter}`,
      params
    );

    const payments: Record<string, { total: number; count: number }> = {};
    paymentsResult.forEach((row) => {
      payments[row.status] = { total: Number(row.total_amount || 0), count: Number(row.count || 0) };
    });

    return NextResponse.json({
      success: true,
      data: {
        payments,
        totalCommission: Number(commissionResult[0]?.total || 0),
        refunds: { total: Number(refundsResult[0]?.total || 0), count: firstCount(refundsResult, 'count') },
        payouts: { total: Number(payoutsResult[0]?.total || 0), count: firstCount(payoutsResult, 'count') },
        activeDisputes: { total: 0, count: firstCount(disputesResult) },
      },
    });
  } catch (error: any) {
    console.error('Error fetching financial analytics:', error);
    return NextResponse.json({
      success: true,
      data: {
        payments: {},
        totalCommission: 0,
        refunds: { total: 0, count: 0 },
        payouts: { total: 0, count: 0 },
        activeDisputes: { total: 0, count: 0 },
      },
    });
  }
}
