import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, firstCount, safeSelect } from '@/lib/ensureOpsTables';

export async function GET() {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (!auth.ok) return auth.response!;

    await ensureOpsTables();

    const [
      reportStats,
      disputeStats,
      bookingStats,
      customerStats,
      openReports,
      openDisputes,
      attentionBookings,
    ] = await Promise.all([
      safeSelect<any[]>(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'INVESTIGATING' THEN 1 ELSE 0 END) as investigating,
          SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN status = 'DISMISSED' THEN 1 ELSE 0 END) as dismissed
        FROM customer_reports
      `),
      safeSelect<any[]>(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('OPEN', 'UNDER_REVIEW', 'PENDING_REVIEW') THEN 1 ELSE 0 END) as open_count,
          SUM(CASE WHEN status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) as resolved_count,
          SUM(CASE WHEN status = 'ESCALATED' THEN 1 ELSE 0 END) as escalated
        FROM disputes
      `),
      safeSelect<any[]>(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('DISPUTED', 'CANCELLED', 'REFUND_PENDING', 'REFUND_PROCESSING') THEN 1 ELSE 0 END) as needs_attention
        FROM bookings
      `),
      safeSelect<any[]>(`
        SELECT
          SUM(CASE WHEN role IN ('CUSTOMER','USER') THEN 1 ELSE 0 END) as customers,
          SUM(CASE WHEN role IN ('CUSTOMER','USER') AND status = 'SUSPENDED' THEN 1 ELSE 0 END) as suspended
        FROM users
      `),
      safeSelect<any[]>(`
        SELECT r.id, r.category, r.status, r.created_at, u1.name as reporter_name, u2.name as reported_name
        FROM customer_reports r
        LEFT JOIN users u1 ON r.reporter_user_id = u1.id
        LEFT JOIN users u2 ON r.reported_user_id = u2.id
        WHERE r.status IN ('PENDING', 'INVESTIGATING')
        ORDER BY r.created_at DESC
        LIMIT 2
      `),
      safeSelect<any[]>(`
        SELECT d.id, d.status, d.created_at, d.booking_id, d.reason
        FROM disputes d
        WHERE d.status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')
        ORDER BY d.created_at DESC
        LIMIT 2
      `),
      safeSelect<any[]>(`
        SELECT b.id, b.booking_number, b.status, b.event_date, b.created_at,
               u.name as customer_name, v.business_name as vendor_name
        FROM bookings b
        LEFT JOIN customer_profiles cp ON b.customer_id = cp.id
        LEFT JOIN users u ON cp.user_id = u.id OR b.customer_id = u.id
        LEFT JOIN vendors v ON b.vendor_id = v.id
        WHERE b.status IN ('DISPUTED', 'CANCELLED', 'REFUND_PENDING', 'REFUND_PROCESSING')
        ORDER BY b.updated_at DESC
        LIMIT 2
      `),
    ]);

    const reports = reportStats[0] || {};
    const disputes = disputeStats[0] || {};
    const bookings = bookingStats[0] || {};
    const customers = customerStats[0] || {};

    return NextResponse.json({
      success: true,
      data: {
        reports: {
          total: firstCount([reports], 'total'),
          pending: firstCount([reports], 'pending'),
          investigating: firstCount([reports], 'investigating'),
          resolved: firstCount([reports], 'resolved'),
          dismissed: firstCount([reports], 'dismissed'),
        },
        disputes: {
          total: firstCount([disputes], 'total'),
          open: firstCount([disputes], 'open_count'),
          resolved: firstCount([disputes], 'resolved_count'),
          escalated: firstCount([disputes], 'escalated'),
        },
        bookings: {
          total: firstCount([bookings], 'total'),
          needs_attention: firstCount([bookings], 'needs_attention'),
        },
        customers: {
          total: firstCount([customers], 'customers'),
          suspended: firstCount([customers], 'suspended'),
        },
        queues: {
          reports: openReports,
          disputes: openDisputes,
          bookings: attentionBookings,
        },
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        reports: { total: 0, pending: 0, investigating: 0, resolved: 0, dismissed: 0 },
        disputes: { total: 0, open: 0, resolved: 0, escalated: 0 },
        bookings: { total: 0, needs_attention: 0 },
        customers: { total: 0, suspended: 0 },
        queues: { reports: [], disputes: [], bookings: [] },
      },
    });
  }
}
