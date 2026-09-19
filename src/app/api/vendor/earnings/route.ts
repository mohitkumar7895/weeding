import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Vendor access only.' }, { status: 403 });
    }

    const vendors = await query<any[]>(
      `SELECT id, business_name, bank_account_number, bank_ifsc FROM vendors WHERE user_id = ?`,
      [user.id]
    );
    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    }
    const vendor = vendors[0];
    const vendorId = vendor.id;

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'ALL';
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Build period filter condition for bookings
    let dateCondition = '';
    const dateParams: any[] = [];

    if (period === 'THIS_MONTH') {
      dateCondition = ` AND b.event_date >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') AND b.event_date <= LAST_DAY(CURRENT_DATE) `;
    } else if (period === 'LAST_MONTH') {
      dateCondition = ` AND b.event_date >= DATE_FORMAT(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-01') AND b.event_date <= LAST_DAY(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH)) `;
    } else if (period === 'THIS_YEAR') {
      dateCondition = ` AND b.event_date >= DATE_FORMAT(CURRENT_DATE, '%Y-01-01') AND b.event_date <= DATE_FORMAT(CURRENT_DATE, '%Y-12-31') `;
    } else if (fromDate && toDate) {
      dateCondition = ` AND b.event_date >= ? AND b.event_date <= ? `;
      dateParams.push(fromDate, toDate);
    } else if (fromDate) {
      dateCondition = ` AND b.event_date >= ? `;
      dateParams.push(fromDate);
    } else if (toDate) {
      dateCondition = ` AND b.event_date <= ? `;
      dateParams.push(toDate);
    }

    // 1. Financial calculations strictly executed server-side from MySQL
    const financialRows = await query<any[]>(
      `SELECT 
        COUNT(b.id) as total_bookings_count,
        SUM(CASE WHEN b.status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED') THEN b.total_amount ELSE 0 END) as gross_revenue,
        SUM(b.total_amount) as total_bookings_volume,
        SUM(CASE WHEN b.status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED') THEN b.commission_amount ELSE 0 END) as platform_commission_deducted,
        SUM(CASE WHEN b.status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED') THEN b.vendor_payout_amount ELSE 0 END) as net_vendor_earnings,
        SUM(CASE WHEN b.status = 'COMPLETED' THEN b.vendor_payout_amount ELSE 0 END) as completed_earnings,
        SUM(CASE WHEN b.status IN ('CONFIRMED', 'IN_PROGRESS') THEN b.vendor_payout_amount ELSE 0 END) as escrow_held_earnings,
        SUM(CASE WHEN b.status IN ('REQUESTED', 'PENDING_VENDOR', 'PENDING') THEN b.total_amount ELSE 0 END) as pipeline_requested_volume,
        SUM(CASE WHEN b.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN b.status IN ('CONFIRMED', 'IN_PROGRESS') THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN b.status IN ('CANCELLED', 'REJECTED') THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN b.status IN ('REQUESTED', 'PENDING_VENDOR', 'PENDING') THEN 1 ELSE 0 END) as requested_count
      FROM bookings b
      WHERE b.vendor_id = ? ${dateCondition}`,
      [vendorId, ...dateParams]
    );

    const fin = financialRows[0] || {};
    const grossRevenue = parseFloat(fin.gross_revenue || 0);
    const totalVolume = parseFloat(fin.total_bookings_volume || 0);
    const commissionDeducted = parseFloat(fin.platform_commission_deducted || 0);
    const netEarnings = parseFloat(fin.net_vendor_earnings || 0);
    const completedEarnings = parseFloat(fin.completed_earnings || 0);
    const escrowHeld = parseFloat(fin.escrow_held_earnings || 0);
    const pipelineVolume = parseFloat(fin.pipeline_requested_volume || 0);

    const totalCount = parseInt(fin.total_bookings_count || 0, 10);
    const completedCount = parseInt(fin.completed_count || 0, 10);
    const confirmedCount = parseInt(fin.confirmed_count || 0, 10);
    const cancelledCount = parseInt(fin.cancelled_count || 0, 10);
    const requestedCount = parseInt(fin.requested_count || 0, 10);

    const activeOrCompletedCount = completedCount + confirmedCount;
    const averageOrderValue = activeOrCompletedCount > 0 ? Math.round((grossRevenue / activeOrCompletedCount) * 100) / 100 : 0;

    // 2. Real Payouts & Settlements Ledger from MySQL payouts table
    let payoutDateCondition = '';
    const payoutDateParams: any[] = [];
    if (period === 'THIS_MONTH') {
      payoutDateCondition = ` AND p.created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') AND p.created_at <= LAST_DAY(CURRENT_DATE) `;
    } else if (period === 'LAST_MONTH') {
      payoutDateCondition = ` AND p.created_at >= DATE_FORMAT(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-01') AND p.created_at <= LAST_DAY(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH)) `;
    } else if (period === 'THIS_YEAR') {
      payoutDateCondition = ` AND p.created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-01-01') AND p.created_at <= DATE_FORMAT(CURRENT_DATE, '%Y-12-31') `;
    } else if (fromDate && toDate) {
      payoutDateCondition = ` AND p.created_at >= ? AND p.created_at <= ? `;
      payoutDateParams.push(fromDate, toDate);
    }

    const payoutRecords = await query<any[]>(
      `SELECT 
        p.id,
        p.reference_id,
        p.amount,
        p.status,
        p.payout_date,
        p.created_at,
        p.updated_at,
        b.booking_number,
        b.event_date,
        b.status as booking_status,
        b.total_amount as booking_gross_amount,
        b.commission_amount as booking_commission_amount
      FROM payouts p 
      JOIN bookings b ON p.booking_id = b.id 
      WHERE p.vendor_id = ? ${payoutDateCondition}
      ORDER BY p.created_at DESC`,
      [vendorId, ...payoutDateParams]
    );

    // Sum settled and pending payouts
    let settledEarnings = 0;
    let pendingSettlement = 0;
    let processingSettlement = 0;

    for (const p of payoutRecords) {
      const amt = parseFloat(p.amount) || 0;
      if (p.status === 'PAID') {
        settledEarnings += amt;
      } else if (p.status === 'PENDING') {
        pendingSettlement += amt;
      } else if (p.status === 'PROCESSING') {
        processingSettlement += amt;
      }
    }

    // If there are completed bookings without a payout record yet, count them in pending settlement
    if (completedEarnings > (settledEarnings + pendingSettlement + processingSettlement)) {
      pendingSettlement = completedEarnings - settledEarnings;
    }

    // 3. Itemized Booking Financial Breakdown Statement
    const bookingsBreakdown = await query<any[]>(
      `SELECT 
        b.id,
        b.booking_number,
        b.event_date,
        b.event_location,
        b.guest_count,
        b.total_amount,
        b.commission_rate,
        b.commission_amount,
        b.vendor_payout_amount,
        b.status as booking_status,
        vs.title as service_title,
        vp.name as package_name,
        vp.package_tier,
        p.status as payout_status,
        p.reference_id as payout_reference,
        p.payout_date
      FROM bookings b
      LEFT JOIN vendor_services vs ON b.service_id = vs.id
      LEFT JOIN vendor_packages vp ON b.package_id = vp.id
      LEFT JOIN payouts p ON b.id = p.booking_id
      WHERE b.vendor_id = ? ${dateCondition}
      ORDER BY b.event_date DESC, b.created_at DESC
      LIMIT 100`,
      [vendorId, ...dateParams]
    );

    // Mask bank account for privacy
    const rawBank = vendor.bank_account_number || '';
    const maskedBank = rawBank.length > 4
      ? '•••• •••• ' + rawBank.slice(-4)
      : (rawBank || 'Not configured');

    const summary = {
      gross_revenue: grossRevenue,
      total_bookings_volume: totalVolume,
      commission_deducted: commissionDeducted,
      commission_rate_applied: 10.0,
      net_vendor_earnings: netEarnings,
      settled_earnings: settledEarnings,
      pending_settlement: pendingSettlement,
      escrow_held_earnings: escrowHeld,
      pipeline_requested_volume: pipelineVolume,
      average_order_value: averageOrderValue,
    };

    const itemizedBookings = bookingsBreakdown.map((b: any) => ({
      id: b.id,
      booking_number: b.booking_number,
      customer_name: b.customer_name,
      service_title: b.service_title,
      package_name: b.package_name,
      event_date: b.event_date,
      status: b.booking_status,
      gross_amount: parseFloat(b.total_amount || 0),
      commission_rate: parseFloat(b.commission_rate || 10),
      commission_amount: parseFloat(b.commission_amount || 0),
      net_vendor_payout: parseFloat(b.vendor_payout_amount || 0),
      settlement_status: b.payout_status || (b.booking_status === 'COMPLETED' ? 'PENDING' : b.booking_status === 'CONFIRMED' ? 'ESCROW HELD' : 'N/A'),
      payout_reference: b.payout_reference || null,
    }));

    const bankInfo = {
      account_number_masked: maskedBank,
      ifsc_code: vendor.bank_ifsc || 'Not configured',
      is_configured: !!(vendor.bank_account_number && vendor.bank_ifsc),
    };

    return NextResponse.json({
      success: true,
      data: {
        vendor_id: vendorId,
        business_name: vendor.business_name,
        bank_account_masked: maskedBank,
        bank_ifsc: vendor.bank_ifsc || 'Not configured',
        bank_info: bankInfo,
        period,
        from_date: fromDate || null,
        to_date: toDate || null,
        summary,
        // Primary financial KPIs
        gross_revenue: grossRevenue,
        total_bookings_volume: totalVolume,
        commission_deducted: commissionDeducted,
        total_commission: commissionDeducted,
        net_earnings: netEarnings,
        net_vendor_earnings: netEarnings,
        settled_earnings: settledEarnings,
        paid_payouts: settledEarnings,
        pending_settlement: pendingSettlement,
        pending_payouts: pendingSettlement,
        processing_settlement: processingSettlement,
        escrow_held_earnings: escrowHeld,
        pipeline_requested_volume: pipelineVolume,
        // Booking volume statistics
        total_bookings: totalCount,
        completed_bookings: completedCount,
        confirmed_bookings: confirmedCount,
        cancelled_bookings: cancelledCount,
        requested_bookings: requestedCount,
        average_order_value: averageOrderValue,
        // Detailed Ledgers
        payouts: payoutRecords,
        recent_payouts: payoutRecords,
        financial_breakdown: bookingsBreakdown,
        itemized_bookings: itemizedBookings,
      }
    });
  } catch (error: any) {
    console.error('API /api/vendor/earnings GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
