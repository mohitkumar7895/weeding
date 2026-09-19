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
      `SELECT id, business_name, rating, review_count FROM vendors WHERE user_id = ?`,
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

    // Build period filter conditions
    let bookingDateCond = '';
    let analyticsDateCond = '';
    const bParams: any[] = [];
    const aParams: any[] = [];

    if (period === 'THIS_MONTH') {
      bookingDateCond = ` AND b.event_date >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') AND b.event_date <= LAST_DAY(CURRENT_DATE) `;
      analyticsDateCond = ` AND created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') AND created_at <= LAST_DAY(CURRENT_DATE) `;
    } else if (period === 'LAST_MONTH') {
      bookingDateCond = ` AND b.event_date >= DATE_FORMAT(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-01') AND b.event_date <= LAST_DAY(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH)) `;
      analyticsDateCond = ` AND created_at >= DATE_FORMAT(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-01') AND created_at <= LAST_DAY(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH)) `;
    } else if (period === 'THIS_YEAR') {
      bookingDateCond = ` AND b.event_date >= DATE_FORMAT(CURRENT_DATE, '%Y-01-01') AND b.event_date <= DATE_FORMAT(CURRENT_DATE, '%Y-12-31') `;
      analyticsDateCond = ` AND created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-01-01') AND created_at <= DATE_FORMAT(CURRENT_DATE, '%Y-12-31') `;
    } else if (fromDate && toDate) {
      bookingDateCond = ` AND b.event_date >= ? AND b.event_date <= ? `;
      analyticsDateCond = ` AND created_at >= ? AND created_at <= ? `;
      bParams.push(fromDate, toDate);
      aParams.push(fromDate, toDate);
    } else if (fromDate) {
      bookingDateCond = ` AND b.event_date >= ? `;
      analyticsDateCond = ` AND created_at >= ? `;
      bParams.push(fromDate);
      aParams.push(fromDate);
    } else if (toDate) {
      bookingDateCond = ` AND b.event_date <= ? `;
      analyticsDateCond = ` AND created_at <= ? `;
      bParams.push(toDate);
      aParams.push(toDate);
    }

    // 1. Profile / Storefront Impressions from analytics_events
    const viewsRows = await query<any[]>(
      `SELECT COUNT(*) as views_count 
       FROM analytics_events 
       WHERE entity_type = 'vendor' AND entity_id = ? AND event_name = 'vendor_profile_view' ${analyticsDateCond}`,
      [vendorId, ...aParams]
    );
    const profileViews = parseInt(viewsRows[0]?.views_count || 0, 10);

    // 2. Direct Booking Inquiries & Conversion Metrics from bookings table
    const bookingMetricsRows = await query<any[]>(
      `SELECT 
        COUNT(b.id) as total_inquiries,
        SUM(CASE WHEN b.status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED') THEN 1 ELSE 0 END) as confirmed_and_active,
        SUM(CASE WHEN b.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN b.status = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted_count,
        SUM(CASE WHEN b.status IN ('CANCELLED', 'REJECTED') THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN b.status IN ('REQUESTED', 'PENDING_VENDOR', 'PENDING') THEN 1 ELSE 0 END) as pending_requests_count,
        SUM(CASE WHEN b.status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED') THEN b.total_amount ELSE 0 END) as gross_confirmed_revenue
      FROM bookings b
      WHERE b.vendor_id = ? ${bookingDateCond}`,
      [vendorId, ...bParams]
    );

    const bm = bookingMetricsRows[0] || {};
    const totalInquiries = parseInt(bm.total_inquiries || 0, 10);
    const confirmedCount = parseInt(bm.confirmed_and_active || 0, 10);
    const completedCount = parseInt(bm.completed_count || 0, 10);
    const acceptedCount = parseInt(bm.accepted_count || 0, 10);
    const cancelledCount = parseInt(bm.cancelled_count || 0, 10);
    const pendingRequestsCount = parseInt(bm.pending_requests_count || 0, 10);
    const grossRevenue = parseFloat(bm.gross_confirmed_revenue || 0);

    // Conversation direct leads count
    const convRows = await query<any[]>(
      `SELECT COUNT(*) as conv_count FROM conversations WHERE vendor_id = ?`,
      [vendorId]
    );
    const directConversations = parseInt(convRows[0]?.conv_count || 0, 10);
    const totalLeads = Math.max(totalInquiries, directConversations);

    // Rate calculations with zero-safety
    const conversionRate = totalInquiries > 0
      ? Math.round((confirmedCount / totalInquiries) * 1000) / 10
      : 0;

    const evaluatedInquiries = acceptedCount + confirmedCount + cancelledCount;
    const acceptanceRate = evaluatedInquiries > 0
      ? Math.round(((acceptedCount + confirmedCount) / evaluatedInquiries) * 1000) / 10
      : (totalInquiries > 0 ? 100.0 : 0);

    const totalCommitted = completedCount + (confirmedCount - completedCount);
    const completionRate = totalCommitted > 0
      ? Math.round((completedCount / totalCommitted) * 1000) / 10
      : 0;

    const cancellationRate = totalInquiries > 0
      ? Math.round((cancelledCount / totalInquiries) * 1000) / 10
      : 0;

    const averageBookingValue = confirmedCount > 0
      ? Math.round((grossRevenue / confirmedCount) * 100) / 100
      : 0;

    // 3. Customer Reviews & Satisfaction from reviews table
    const reviewStatsRows = await query<any[]>(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as stars_5,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as stars_4,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as stars_3,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as stars_2,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as stars_1
      FROM reviews
      WHERE vendor_id = ?`,
      [vendorId]
    );

    const rs = reviewStatsRows[0] || {};
    const totalReviewsCount = parseInt(rs.total_reviews || 0, 10);
    const avgRating = totalReviewsCount > 0
      ? Math.round(parseFloat(rs.average_rating || 0) * 10) / 10
      : parseFloat(vendor.rating || 4.8);

    const recentReviews = await query<any[]>(
      `SELECT 
        r.id,
        r.rating,
        r.comment,
        r.is_verified_booking,
        r.created_at,
        COALESCE(u.name, 'Verified Customer') as customer_name
      FROM reviews r
      LEFT JOIN customer_profiles cp ON (r.customer_id = cp.id OR r.customer_id = cp.user_id)
      LEFT JOIN users u ON (cp.user_id = u.id OR r.customer_id = u.id)
      WHERE r.vendor_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10`,
      [vendorId]
    );

    const metrics = {
      profile_views: profileViews,
      storefront_impressions: profileViews,
      inquiries_count: totalInquiries,
      total_leads: totalLeads,
      pending_requests: pendingRequestsCount,
      confirmed_bookings_count: confirmedCount,
      completed_bookings_count: completedCount,
      cancelled_bookings_count: cancelledCount,
      gross_confirmed_revenue: grossRevenue,
      average_booking_value: averageBookingValue,
      conversion_rate: conversionRate,
      acceptance_rate: acceptanceRate,
      completion_rate: completionRate,
      cancellation_rate: cancellationRate,
    };

    const ratingDistribution = {
      '5_star': parseInt(rs.stars_5 || 0, 10),
      '4_star': parseInt(rs.stars_4 || 0, 10),
      '3_star': parseInt(rs.stars_3 || 0, 10),
      '2_star': parseInt(rs.stars_2 || 0, 10),
      '1_star': parseInt(rs.stars_1 || 0, 10),
      stars_5: parseInt(rs.stars_5 || 0, 10),
      stars_4: parseInt(rs.stars_4 || 0, 10),
      stars_3: parseInt(rs.stars_3 || 0, 10),
      stars_2: parseInt(rs.stars_2 || 0, 10),
      stars_1: parseInt(rs.stars_1 || 0, 10),
    };

    const reviewsSummary = {
      average_rating: avgRating,
      total_reviews: totalReviewsCount > 0 ? totalReviewsCount : (vendor.review_count || 0),
      breakdown: ratingDistribution,
      rating_distribution: ratingDistribution,
      recent_reviews: recentReviews,
    };

    return NextResponse.json({
      success: true,
      data: {
        vendor_id: vendorId,
        business_name: vendor.business_name,
        period,
        from_date: fromDate || null,
        to_date: toDate || null,
        metrics,
        // Traffic & Discovery
        profile_views: profileViews,
        storefront_impressions: profileViews,
        // Leads & Inquiries
        inquiries_count: totalInquiries,
        total_leads: totalLeads,
        pending_requests: pendingRequestsCount,
        // Fulfillment & Orders
        confirmed_bookings_count: confirmedCount,
        completed_bookings_count: completedCount,
        cancelled_bookings_count: cancelledCount,
        gross_confirmed_revenue: grossRevenue,
        average_booking_value: averageBookingValue,
        // Operational Quality Indicators (%)
        conversion_rate: conversionRate,
        acceptance_rate: acceptanceRate,
        completion_rate: completionRate,
        cancellation_rate: cancellationRate,
        // Customer Reviews & Satisfaction
        reviews_summary: reviewsSummary,
        recent_reviews: recentReviews,
      }
    });
  } catch (error: any) {
    console.error('API /api/vendor/performance GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
