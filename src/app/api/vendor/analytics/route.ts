import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Vendor authorization required' }, { status: 403 });
    }

    const days = req.nextUrl.searchParams.get('days');
    let dateFilter = '';
    let params: any[] = [user.id];

    if (days && !isNaN(Number(days))) {
      dateFilter = `AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`;
      params.push(Number(days));
    }

    // Single efficient aggregation query for Vendor KPIs
    const [metrics] = await query<any[]>(
      `SELECT 
         COUNT(*) as total_leads,
         SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_leads,
         SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_bookings,
         SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_bookings,
         SUM(CASE WHEN status = 'COMPLETED' THEN payable_amount ELSE 0 END) as total_revenue
       FROM bookings 
       WHERE vendor_id = ? ${dateFilter}`,
      params
    );

    if (!metrics) {
       return NextResponse.json({ success: false, message: 'Analytics unavailable' }, { status: 404 });
    }

    // Compute derived metrics safely
    const totalLeads = Number(metrics.total_leads) || 0;
    const cancelled = Number(metrics.cancelled_bookings) || 0;
    const cancellationRate = totalLeads > 0 ? (cancelled / totalLeads) * 100 : 0;

    return NextResponse.json({ 
      success: true, 
      analytics: {
        totalLeads,
        pendingLeads: Number(metrics.pending_leads) || 0,
        completedBookings: Number(metrics.completed_bookings) || 0,
        totalRevenue: Number(metrics.total_revenue) || 0,
        cancellationRate: cancellationRate.toFixed(1)
      }
    });

  } catch (error: any) {
    console.error('Vendor Analytics Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch analytics' }, { status: 500 });
  }
}
