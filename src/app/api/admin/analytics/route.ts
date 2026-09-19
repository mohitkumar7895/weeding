import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(req: NextRequest) {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!authResult.ok) return authResult.response;

  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin authorization required' }, { status: 403 });
    }

    // 1. Global Financials & Booking Stats
    const [globalMetrics] = await query<any[]>(
      `SELECT 
         COUNT(*) as total_bookings,
         SUM(CASE WHEN status = 'COMPLETED' THEN payable_amount ELSE 0 END) as global_gmv,
         SUM(CASE WHEN status = 'COMPLETED' THEN vendor_commission ELSE 0 END) as global_commission
       FROM bookings`
    );

    // 2. Category Distribution (Health of the Marketplace)
    const categoryDistribution = await query<any[]>(
      `SELECT u.category, COUNT(b.id) as booking_count 
       FROM bookings b
       JOIN users u ON b.vendor_id = u.id
       WHERE u.category IS NOT NULL
       GROUP BY u.category
       ORDER BY booking_count DESC
       LIMIT 5`
    );

    return NextResponse.json({ 
      success: true, 
      analytics: {
        global: {
          totalBookings: Number(globalMetrics?.total_bookings) || 0,
          grossMerchandiseValue: Number(globalMetrics?.global_gmv) || 0,
          totalCommissionRetained: Number(globalMetrics?.global_commission) || 0
        },
        categoryDistribution
      }
    });

  } catch (error: any) {
    console.error('Admin Analytics Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch admin analytics' }, { status: 500 });
  }
}
