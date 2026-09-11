import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let sql = `
      SELECT 
        b.*,
        v.business_name as vendor_name,
        v.city as vendor_city,
        c.name as category_name,
        u_cust.name as customer_name,
        u_cust.phone as customer_phone,
        u_cust.email as customer_email,
        vp.name as package_name,
        vs.title as service_name
      FROM bookings b
      JOIN vendors v ON b.vendor_id = v.id
      JOIN categories c ON v.category_id = c.id
      JOIN customer_profiles cp ON b.customer_id = cp.id
      JOIN users u_cust ON cp.user_id = u_cust.id
      LEFT JOIN vendor_packages vp ON b.package_id = vp.id
      LEFT JOIN vendor_services vs ON b.service_id = vs.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter according to role
    if (user.role === 'CUSTOMER') {
      const profiles = await query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ?`, [user.id]);
      if (!profiles || profiles.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }
      sql += ` AND b.customer_id = ?`;
      params.push(profiles[0].id);
    } else if (user.role === 'VENDOR') {
      const vendorProfiles = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
      if (!vendorProfiles || vendorProfiles.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }
      sql += ` AND b.vendor_id = ?`;
      params.push(vendorProfiles[0].id);
    }
    // If ADMIN, sees all bookings

    if (status) {
      sql += ` AND b.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY b.created_at DESC LIMIT ?`;
    params.push(limit);

    const bookings = await query<any[]>(sql, params);

    return NextResponse.json({ success: true, data: bookings });
  } catch (error: any) {
    console.error('API /api/bookings GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    // Must have a customer profile
    let customerId = user.profile_id;
    if (!customerId) {
      const profiles = await query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ?`, [user.id]);
      if (!profiles || profiles.length === 0) {
        return NextResponse.json({ success: false, message: 'Customer profile required to create a booking' }, { status: 403 });
      }
      customerId = profiles[0].id;
    }

    const body = await req.json();
    const { vendor_id, package_id, service_id, event_date, guest_count, notes } = body;

    if (!vendor_id || !event_date) {
      return NextResponse.json({ success: false, message: 'vendor_id and event_date are required' }, { status: 400 });
    }

    // 1. Anti Double-Booking Server-Side Validation
    const existingBookedDate = await query<any[]>(
      `SELECT id FROM vendor_availability WHERE vendor_id = ? AND date = ? AND is_booked = TRUE`,
      [vendor_id, event_date]
    );
    const existingActiveBooking = await query<any[]>(
      `SELECT id, booking_number FROM bookings WHERE vendor_id = ? AND event_date = ? AND status IN ('CONFIRMED', 'IN_PROGRESS', 'ACCEPTED')`,
      [vendor_id, event_date]
    );

    if (existingBookedDate.length > 0 || existingActiveBooking.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'This vendor is not available on this date. Double-booking is strictly prohibited.'
      }, { status: 409 });
    }

    // 2. Determine base amount
    const vendors = await query<any[]>(`SELECT category_id, starting_price FROM vendors WHERE id = ?`, [vendor_id]);
    const categoryId = vendors.length > 0 ? vendors[0].category_id : null;

    let totalAmount = 0;
    if (package_id) {
      const pkgs = await query<any[]>(`SELECT price FROM vendor_packages WHERE id = ? AND vendor_id = ?`, [package_id, vendor_id]);
      if (pkgs.length > 0) totalAmount = parseFloat(pkgs[0].price);
    } else if (service_id) {
      const srvs = await query<any[]>(`SELECT starting_price FROM vendor_services WHERE id = ? AND vendor_id = ?`, [service_id, vendor_id]);
      if (srvs.length > 0) totalAmount = parseFloat(srvs[0].starting_price);
    }

    if (totalAmount === 0) {
      if (vendors.length > 0 && vendors[0].starting_price) {
        totalAmount = parseFloat(vendors[0].starting_price);
      } else {
        totalAmount = 15000.00;
      }
    }

    // 3. Dynamic Commission Calculation via Commission Engine
    const { calculateCommission } = await import('@/services/commissionEngine');
    const commCalc = await calculateCommission(vendor_id, categoryId, totalAmount);
    const commissionRate = commCalc.commissionValue;
    const commissionAmount = commCalc.commissionAmount;
    const vendorPayout = commCalc.vendorPayoutAmount;

    const bookingId = randomUUID();
    const bookingNumber = `WWM-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    await transaction(async (conn) => {
      // Insert Booking
      await conn.execute(
        `INSERT INTO bookings (
          id, booking_number, customer_id, vendor_id, service_id, package_id,
          event_date, guest_count, total_amount, commission_rate, commission_amount,
          vendor_payout_amount, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'REQUESTED', ?)`,
        [
          bookingId,
          bookingNumber,
          customerId,
          vendor_id,
          service_id || null,
          package_id || null,
          event_date,
          guest_count || 200,
          totalAmount,
          commissionRate,
          commissionAmount,
          vendorPayout,
          notes || 'Direct inquiry via WedWithMe platform'
        ]
      );

      // Record in booking_status_history
      await conn.execute(
        `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by, reason)
         VALUES (?, ?, 'DRAFT', 'REQUESTED', ?, 'Initial booking inquiry placed')`,
        [randomUUID(), bookingId, user.id]
      );

      // Create commission record
      await conn.execute(
        `INSERT INTO commission_records (id, booking_id, percentage, commission_amount, is_settled)
         VALUES (?, ?, ?, ?, FALSE)`,
        [randomUUID(), bookingId, commissionRate, commissionAmount]
      );
    });

    // Notify vendor
    try {
      const { sendNotification } = await import('@/services/notificationService');
      const vendorUser = await query<any[]>(`SELECT user_id FROM vendors WHERE id = ?`, [vendor_id]);
      if (vendorUser.length > 0) {
        await sendNotification({
          userId: vendorUser[0].user_id,
          type: 'BOOKING',
          title: 'New Wedding Booking Inquiry',
          message: `You have received a new booking inquiry (${bookingNumber}) for ${event_date}.`,
          deepLink: '/vendor',
        });
      }
    } catch {}

    await logAudit(user.id, 'CREATE_BOOKING', 'bookings', bookingId, {
      booking_number: bookingNumber,
      vendor_id,
      totalAmount,
      commissionAmount
    });

    return NextResponse.json({
      success: true,
      message: 'Booking request placed successfully',
      data: {
        id: bookingId,
        booking_number: bookingNumber,
        total_amount: totalAmount,
        commission_rate: commissionRate,
        vendor_payout: vendorPayout,
        status: 'REQUESTED'
      }
    });
  } catch (error: any) {
    console.error('API /api/bookings POST Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
