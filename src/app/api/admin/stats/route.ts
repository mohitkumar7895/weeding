import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    // 1. User stats
    const [userCounts]: any = await query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'CUSTOMER' THEN 1 ELSE 0 END) as total_customers,
        SUM(CASE WHEN role = 'VENDOR' THEN 1 ELSE 0 END) as total_vendor_users
      FROM users
    `);

    // 2. Vendor stats
    const [vendorCounts]: any = await query(`
      SELECT 
        COUNT(*) as total_vendors,
        SUM(CASE WHEN verification_status = 'VERIFIED' THEN 1 ELSE 0 END) as verified_vendors,
        SUM(CASE WHEN verification_status = 'PENDING' THEN 1 ELSE 0 END) as pending_vendors
      FROM vendors
    `);

    // 3. Booking & Financial stats
    const [bookingStats]: any = await query(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'CONFIRMED' OR status = 'COMPLETED' THEN total_amount ELSE 0 END) as gmv,
        SUM(CASE WHEN status = 'CONFIRMED' OR status = 'COMPLETED' THEN commission_amount ELSE 0 END) as total_commission,
        SUM(CASE WHEN status = 'REQUESTED' THEN 1 ELSE 0 END) as pending_bookings
      FROM bookings
    `);

    // 4. Disputes count
    const [disputeCounts]: any = await query(`SELECT COUNT(*) as open_disputes FROM disputes WHERE status = 'OPEN'`);

    // 5. Recent audit logs
    const recentLogs = await query<any[]>(`
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 6
    `);

    return NextResponse.json({
      success: true,
      data: {
        total_users: userCounts?.total_users || 0,
        total_customers: userCounts?.total_customers || 0,
        total_vendors: vendorCounts?.total_vendors || 0,
        verified_vendors: vendorCounts?.verified_vendors || 0,
        pending_vendors: vendorCounts?.pending_vendors || 0,
        total_bookings: bookingStats?.total_bookings || 0,
        pending_bookings: bookingStats?.pending_bookings || 0,
        gmv: parseFloat(bookingStats?.gmv || 0),
        commission_revenue: parseFloat(bookingStats?.total_commission || 0),
        open_disputes: disputeCounts?.open_disputes || 0,
        recent_logs: recentLogs
      }
    });
  } catch (error: any) {
    console.error('API /api/admin/stats Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
