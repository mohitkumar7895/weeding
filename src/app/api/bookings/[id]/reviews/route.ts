import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { recalculateVendorRating } from '@/services/ratingEngine';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest, { params }: any) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ success: false, message: 'Only customers can leave reviews' }, { status: 403 });
    }

    const bookingId = params.id;
    const body = await req.json();
    const { rating, comment } = body;

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ success: false, message: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    // Validate booking ownership and completion status
    const [booking] = await query<any[]>(
      `SELECT * FROM bookings WHERE id = ? AND customer_id = ?`,
      [bookingId, user.id]
    );

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found or not owned by you' }, { status: 404 });
    }

    if (booking.status !== 'COMPLETED') {
      return NextResponse.json({ success: false, message: 'You can only review completed bookings' }, { status: 400 });
    }

    // Check for duplicate reviews (idx_reviews_booking ensures this at DB level, but we check nicely here too)
    const [existing] = await query<any[]>(`SELECT id FROM reviews WHERE booking_id = ?`, [bookingId]);
    if (existing) {
      return NextResponse.json({ success: false, message: 'You have already reviewed this booking' }, { status: 409 });
    }

    const reviewId = randomUUID();
    // Insert Review - default to PUBLISHED based on platform settings, or PENDING if moderation required
    await query(
      `INSERT INTO reviews (id, booking_id, vendor_id, customer_id, rating, comment, is_verified_booking, moderation_status)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, 'PUBLISHED')`,
      [reviewId, bookingId, booking.vendor_id, user.id, parsedRating, comment || null]
    );

    // Recalculate Vendor Rating
    await recalculateVendorRating(booking.vendor_id);

    await logAudit(user.id, 'SUBMIT_REVIEW', 'reviews', reviewId, { bookingId, rating: parsedRating });

    return NextResponse.json({ success: true, message: 'Review submitted successfully', review_id: reviewId });

  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
       return NextResponse.json({ success: false, message: 'You have already reviewed this booking' }, { status: 409 });
    }
    console.error('Review error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
