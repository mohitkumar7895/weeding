import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']);
    if (!auth.ok) {
      return auth.response!;
    }
    const userRole = auth.user!.role;

    // 1. Platform Counts (Customer, Vendor, Profiles)
    const [userCounts]: any = await query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'CUSTOMER' THEN 1 ELSE 0 END) as total_customers,
        SUM(CASE WHEN role = 'VENDOR' THEN 1 ELSE 0 END) as total_vendors
      FROM users
    `);
    const [profileCounts]: any = await query(`SELECT COUNT(*) as total_profiles FROM customer_profiles`);

    // 2. Record Status Summary
    const userStatusCounts = await query<any[]>(`SELECT status, COUNT(*) as count FROM users GROUP BY status`);
    const vendorStatusCounts = await query<any[]>(`SELECT verification_status, COUNT(*) as count FROM vendors GROUP BY verification_status`);
    const fraudFlagsCounts = await query<any[]>(`SELECT status, COUNT(*) as count FROM fraud_flags GROUP BY status`);

    // 3. Booking Overview
    const bookingCounts = await query<any[]>(`SELECT status, COUNT(*) as count FROM bookings GROUP BY status`);

    // 4. Financial Summary (Restricted)
    let financialSummary = null;
    const canViewFinance = userRole === 'SUPER_ADMIN' || userRole === 'FINANCE';
    if (canViewFinance) {
      const [bookingFinance]: any = await query(`
        SELECT 
          SUM(CASE WHEN status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED') THEN total_amount ELSE 0 END) as gmv,
          SUM(CASE WHEN status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED') THEN commission_amount ELSE 0 END) as total_commission
        FROM bookings
      `);
      const [refundsFinance]: any = await query(`SELECT SUM(amount) as total_refunds FROM refunds WHERE status IN ('APPROVED', 'PROCESSED')`);
      const [payoutsFinance]: any = await query(`SELECT SUM(amount) as total_payouts FROM payouts WHERE status = 'PAID'`);
      
      financialSummary = {
        gmv: parseFloat(bookingFinance?.gmv || 0),
        commission: parseFloat(bookingFinance?.total_commission || 0),
        refunds: parseFloat(refundsFinance?.total_refunds || 0),
        payouts: parseFloat(payoutsFinance?.total_payouts || 0),
      };
    }

    // 5. Recent Activity
    const recentRegistrations = await query<any[]>(`SELECT id, name, email, created_at FROM users WHERE role = 'VENDOR' ORDER BY created_at DESC LIMIT 5`);
    const recentDisputes = await query<any[]>(`SELECT id, booking_id, status, created_at FROM disputes ORDER BY created_at DESC LIMIT 5`);
    const recentAlerts = await query<any[]>(`SELECT id, entity_type, flag_reason, severity, created_at FROM fraud_flags ORDER BY created_at DESC LIMIT 5`);

    // 6. Performance Summaries
    const funnelPerformance = await query<any[]>(`
      SELECT funnel_type, step_name, COUNT(*) as completions 
      FROM funnel_events 
      WHERE completed = TRUE 
      GROUP BY funnel_type, step_name 
      ORDER BY completions DESC
    `);

    const cityPerformance = await query<any[]>(`
      SELECT city, COUNT(*) as profile_count 
      FROM customer_profiles 
      WHERE city IS NOT NULL 
      GROUP BY city 
      ORDER BY profile_count DESC 
      LIMIT 5
    `);

    return NextResponse.json({
      success: true,
      data: {
        role: userRole,
        platform_counts: {
          customers: userCounts?.total_customers || 0,
          vendors: userCounts?.total_vendors || 0,
          profiles: profileCounts?.total_profiles || 0,
        },
        record_status: {
          users: userStatusCounts,
          vendors: vendorStatusCounts,
          fraud: fraudFlagsCounts,
        },
        booking_overview: bookingCounts,
        financial_summary: financialSummary,
        recent_activity: {
          registrations: recentRegistrations,
          disputes: recentDisputes,
          alerts: recentAlerts,
        },
        performance: {
          funnel: funnelPerformance,
          cities: cityPerformance,
        }
      }
    });
  } catch (error: any) {
    console.error('API /api/admin/stats Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

