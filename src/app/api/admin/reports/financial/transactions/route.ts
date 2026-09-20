import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { firstCount, safeSelect } from '@/lib/ensureOpsTables';

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (!auth.ok) return auth.response!;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const vendorId = searchParams.get('vendorId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100);
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (startDate) {
      where += ' AND b.created_at >= ?';
      params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      where += ' AND b.created_at <= ?';
      params.push(`${endDate} 23:59:59`);
    }
    if (vendorId) {
      where += ' AND b.vendor_id = ?';
      params.push(vendorId);
    }
    if (status) {
      where += ' AND rec.status = ?';
      params.push(status);
    }
    if (search) {
      where += ` AND (IFNULL(b.booking_number,'') LIKE ? OR IFNULL(p.transaction_ref,'') LIKE ? OR IFNULL(c.name,'') LIKE ? OR IFNULL(v.business_name,'') LIKE ?)`;
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }

    const countRows = await safeSelect<any[]>(
      `SELECT COUNT(DISTINCT b.id) as count
       FROM bookings b
       LEFT JOIN payment_transactions p ON p.booking_id = b.id AND p.status IN ('SUCCESS','COMPLETED')
       LEFT JOIN users c ON b.customer_id = c.id
       LEFT JOIN vendors v ON b.vendor_id = v.id
       LEFT JOIN reconciliations rec ON rec.booking_id = b.id
       ${where}`,
      params
    );
    const total = firstCount(countRows);

    const rows = await safeSelect<any[]>(
      `SELECT
         b.id as booking_id,
         b.booking_number,
         b.total_amount as gross_amount,
         b.created_at as booking_date,
         b.status as booking_status,
         c.name as customer_name,
         v.business_name as vendor_name,
         p.id as payment_id,
         p.transaction_ref,
         p.amount as payment_amount,
         p.status as payment_status,
         rec.status as reconciliation_status
       FROM bookings b
       LEFT JOIN payment_transactions p ON p.booking_id = b.id AND p.status IN ('SUCCESS','COMPLETED')
       LEFT JOIN users c ON b.customer_id = c.id
       LEFT JOIN vendors v ON b.vendor_id = v.id
       LEFT JOIN reconciliations rec ON rec.booking_id = b.id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return NextResponse.json({
      success: true,
      transactions: rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit) || 1),
      },
    });
  } catch (error: any) {
    console.error('Error fetching transactions report:', error);
    return NextResponse.json({
      success: true,
      transactions: [],
      pagination: { total: 0, page: 1, limit: 20, pages: 1 },
    });
  }
}
