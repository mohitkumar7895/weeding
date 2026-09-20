import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { firstCount, safeSelect } from '@/lib/ensureOpsTables';

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT']);
    if (!auth.ok) return auth.response!;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const params: any[] = [];
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = ' AND created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const [users, vendors, bookings, gbv] = await Promise.all([
      safeSelect<any[]>(`SELECT COUNT(*) as count FROM users WHERE role IN ('CUSTOMER','USER')${dateFilter}`, params),
      safeSelect<any[]>(`SELECT COUNT(*) as count FROM vendors WHERE 1=1${dateFilter}`, params),
      safeSelect<any[]>(
        `SELECT COUNT(*) as count FROM bookings WHERE status IN ('CONFIRMED','COMPLETED','IN_PROGRESS')${dateFilter}`,
        params
      ),
      safeSelect<any[]>(
        `SELECT SUM(amount) as total FROM payment_transactions WHERE status IN ('SUCCESS','COMPLETED')${dateFilter}`,
        params
      ),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          totalUsers: firstCount(users),
          totalVendors: firstCount(vendors),
          totalBookings: firstCount(bookings),
          grossBookingValue: Number(gbv[0]?.total || 0),
        },
      },
      { headers: { 'Cache-Control': 'private, max-age=20' } }
    );
  } catch {
    return NextResponse.json({
      success: true,
      data: { totalUsers: 0, totalVendors: 0, totalBookings: 0, grossBookingValue: 0 },
    });
  }
}
