import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    // Get customer profile
    const profiles = await query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ?`, [user.id]);
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ success: false, message: 'Only registered customers can leave reviews' }, { status: 403 });
    }
    const customerId = profiles[0].id;

    const body = await req.json();
    const { vendor_id, rating, comment, booking_id } = body;

    if (!vendor_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, message: 'Valid vendor ID and rating (1-5) required' }, { status: 400 });
    }

    // Completed Booking verification: One completed booking = One review
    if (!booking_id) {
      return NextResponse.json({
        success: false,
        message: 'A completed booking reference is required to leave a verified review.'
      }, { status: 400 });
    }

    const eligibleBookings = await query<any[]>(
      `SELECT id, status FROM bookings 
       WHERE id = ? AND customer_id = ? AND vendor_id = ? AND status = 'COMPLETED'`,
      [booking_id, customerId, vendor_id]
    );

    if (!eligibleBookings.length) {
      return NextResponse.json({
        success: false,
        message: 'Review eligibility requires a completed booking with this vendor.'
      }, { status: 403 });
    }

    // Check if review already exists for this booking or customer/vendor
    const existing = await query<any[]>(
      `SELECT id FROM reviews WHERE customer_id = ? AND vendor_id = ?`,
      [customerId, vendor_id]
    );
    if (existing.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'You have already submitted a review for this booking. Duplicate reviews are prevented.'
      }, { status: 400 });
    }

    const isVerifiedBooking = true;
    const reviewId = randomUUID();

    await transaction(async (conn) => {
      // Insert review
      await conn.execute(
        `INSERT INTO reviews (id, vendor_id, customer_id, rating, comment, is_verified_booking, moderation_status)
         VALUES (?, ?, ?, ?, ?, ?, 'APPROVED')`,
        [reviewId, vendor_id, customerId, rating, comment || '', isVerifiedBooking]
      );

      // Recalculate average rating and review count
      const [agg]: any = await conn.execute(
        `SELECT COUNT(*) as total_reviews, AVG(rating) as avg_rating FROM reviews WHERE vendor_id = ?`,
        [vendor_id]
      );

      const totalReviews = agg[0]?.total_reviews || 1;
      const avgRating = parseFloat(agg[0]?.avg_rating || rating).toFixed(2);

      await conn.execute(
        `UPDATE vendors SET rating = ?, review_count = ? WHERE id = ?`,
        [avgRating, totalReviews, vendor_id]
      );
    });

    await logAudit(user.id, 'CREATE_REVIEW', 'reviews', reviewId, { vendor_id, rating });

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      data: { id: reviewId }
    });
  } catch (error: any) {
    console.error('API /api/vendors/reviews Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
