import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { safeSelect } from '@/lib/ensureOpsTables';

function firstRow(rows: any[]) {
  return Array.isArray(rows) && rows.length ? rows[0] : {};
}

export async function GET(_req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']);
    if (!auth.ok) return auth.response!;
    const userRole = auth.user!.role;
    const canViewFinance = userRole === 'SUPER_ADMIN' || userRole === 'FINANCE';

    const [
      userCountsRows,
      profileCountsRows,
      userStatusCounts,
      vendorStatusCounts,
      fraudFlagsCounts,
      bookingCounts,
      bookingFinanceRows,
      refundsFinanceRows,
      payoutsFinanceRows,
      recentRegistrations,
      recentDisputes,
      recentAlerts,
      funnelPerformance,
      cityPerformance,
    ] = await Promise.all([
      safeSelect<any[]>(`
        SELECT
          COUNT(*) as total_users,
          SUM(CASE WHEN role IN ('CUSTOMER','USER') THEN 1 ELSE 0 END) as total_customers,
          SUM(CASE WHEN role = 'VENDOR' THEN 1 ELSE 0 END) as total_vendors
        FROM users
      `),
      safeSelect<any[]>(`SELECT COUNT(*) as total_profiles FROM customer_profiles`),
      safeSelect<any[]>(`SELECT status, COUNT(*) as count FROM users GROUP BY status`),
      safeSelect<any[]>(`SELECT verification_status, COUNT(*) as count FROM vendors GROUP BY verification_status`),
      safeSelect<any[]>(`SELECT status, COUNT(*) as count FROM fraud_flags GROUP BY status`),
      safeSelect<any[]>(`SELECT status, COUNT(*) as count FROM bookings GROUP BY status`),
      canViewFinance
        ? safeSelect<any[]>(`
            SELECT
              SUM(CASE WHEN status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED') THEN total_amount ELSE 0 END) as gmv,
              SUM(CASE WHEN status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED') THEN commission_amount ELSE 0 END) as total_commission
            FROM bookings
          `)
        : Promise.resolve([]),
      canViewFinance
        ? safeSelect<any[]>(`SELECT SUM(amount) as total_refunds FROM refunds WHERE status IN ('APPROVED', 'PROCESSED')`)
        : Promise.resolve([]),
      canViewFinance
        ? safeSelect<any[]>(`SELECT SUM(amount) as total_payouts FROM payouts WHERE status = 'PAID'`)
        : Promise.resolve([]),
      safeSelect<any[]>(`SELECT id, name, email, created_at FROM users WHERE role = 'VENDOR' ORDER BY created_at DESC LIMIT 5`),
      safeSelect<any[]>(`SELECT id, booking_id, status, created_at FROM disputes ORDER BY created_at DESC LIMIT 5`),
      safeSelect<any[]>(`SELECT id, entity_type, flag_reason, severity, created_at FROM fraud_flags ORDER BY created_at DESC LIMIT 5`),
      safeSelect<any[]>(`
        SELECT funnel_type, step_name, COUNT(*) as completions
        FROM funnel_events
        WHERE completed = TRUE
        GROUP BY funnel_type, step_name
        ORDER BY completions DESC
        LIMIT 8
      `),
      safeSelect<any[]>(`
        SELECT city, COUNT(*) as profile_count
        FROM customer_profiles
        WHERE city IS NOT NULL
        GROUP BY city
        ORDER BY profile_count DESC
        LIMIT 5
      `),
    ]);

    const userCounts = firstRow(userCountsRows);
    const profileCounts = firstRow(profileCountsRows);
    const bookingFinance = firstRow(bookingFinanceRows);
    const refundsFinance = firstRow(refundsFinanceRows);
    const payoutsFinance = firstRow(payoutsFinanceRows);

    const body = {
      success: true,
      data: {
        role: userRole,
        platform_counts: {
          customers: Number(userCounts?.total_customers || 0),
          vendors: Number(userCounts?.total_vendors || 0),
          profiles: Number(profileCounts?.total_profiles || 0),
        },
        record_status: {
          users: userStatusCounts,
          vendors: vendorStatusCounts,
          fraud: fraudFlagsCounts,
        },
        booking_overview: bookingCounts,
        financial_summary: canViewFinance
          ? {
              gmv: parseFloat(bookingFinance?.gmv || 0),
              commission: parseFloat(bookingFinance?.total_commission || 0),
              refunds: parseFloat(refundsFinance?.total_refunds || 0),
              payouts: parseFloat(payoutsFinance?.total_payouts || 0),
            }
          : null,
        recent_activity: {
          registrations: recentRegistrations,
          disputes: recentDisputes,
          alerts: recentAlerts,
        },
        performance: {
          funnel: funnelPerformance,
          cities: cityPerformance,
        },
      },
    };

    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'private, max-age=20' },
    });
  } catch (error: any) {
    console.error('API /api/admin/stats Error:', error);
    return NextResponse.json(
      {
        success: true,
        data: {
          platform_counts: { customers: 0, vendors: 0, profiles: 0 },
          record_status: { users: [], vendors: [], fraud: [] },
          booking_overview: [],
          financial_summary: null,
          recent_activity: { registrations: [], disputes: [], alerts: [] },
          performance: { funnel: [], cities: [] },
        },
      },
      { headers: { 'Cache-Control': 'private, max-age=5' } }
    );
  }
}
