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
    const search = searchParams.get('search')?.trim();
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200);

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
        vp.package_tier,
        vs.title as service_name,
        r.status as refund_status
      FROM bookings b
      JOIN vendors v ON b.vendor_id = v.id
      JOIN categories c ON v.category_id = c.id
      JOIN customer_profiles cp ON b.customer_id = cp.id
      JOIN users u_cust ON cp.user_id = u_cust.id
      LEFT JOIN vendor_packages vp ON b.package_id = vp.id
      LEFT JOIN vendor_services vs ON b.service_id = vs.id
      LEFT JOIN refunds r ON b.id = r.booking_id
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
      if (status === 'PENDING') {
        sql += ` AND b.status IN ('REQUESTED', 'PENDING_VENDOR', 'PENDING')`;
      } else if (status === 'ACTIVE' || status === 'CONFIRMED_ACTIVE') {
        sql += ` AND b.status IN ('CONFIRMED', 'IN_PROGRESS', 'ACCEPTED')`;
      } else if (status.includes(',')) {
        const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
        const placeholders = statuses.map(() => '?').join(',');
        sql += ` AND b.status IN (${placeholders})`;
        params.push(...statuses);
      } else {
        sql += ` AND b.status = ?`;
        params.push(status);
      }
    }

    if (search) {
      sql += ` AND (b.booking_number LIKE ? OR u_cust.name LIKE ? OR vs.title LIKE ? OR vp.name LIKE ? OR b.event_location LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    if (fromDate) {
      sql += ` AND b.event_date >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      sql += ` AND b.event_date <= ?`;
      params.push(toDate);
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
    const {
      vendor_id,
      package_id,
      service_id,
      event_date,
      event_location,
      guest_count,
      notes,
      special_instructions,
      add_ons,
      lock_token,
    } = body;

    if (!vendor_id || !event_date) {
      return NextResponse.json({ success: false, message: 'vendor_id and event_date are required' }, { status: 400 });
    }

    // 1. Anti Double-Booking Server-Side Validation
    const existingBookedDate = await query<any[]>(
      `SELECT id, status, reason FROM vendor_availability 
       WHERE vendor_id = ? AND date = ? 
         AND (service_id = ? OR service_id = 'ALL' OR ? IS NULL)
         AND (status IN ('BLOCKED', 'CONFIRMED', 'BOOKING_LOCKED') OR is_booked = TRUE)`,
      [vendor_id, event_date, service_id || 'ALL', service_id]
    );
    const existingActiveBooking = await query<any[]>(
      `SELECT id, booking_number FROM bookings 
       WHERE vendor_id = ? AND event_date = ? 
         AND (service_id = ? OR service_id IS NULL OR ? IS NULL)
         AND status IN ('CONFIRMED', 'IN_PROGRESS', 'ACCEPTED', 'PAYMENT_PENDING')`,
      [vendor_id, event_date, service_id || null, service_id]
    );
    const existingActiveLocks = await query<any[]>(
      `SELECT id, lock_token, locked_by_user_id FROM vendor_booking_locks 
       WHERE vendor_id = ? AND event_date = ? 
         AND status = 'LOCKED' AND expires_at > NOW()`,
      [vendor_id, event_date]
    );

    const isLockedByAnother = existingActiveLocks.some(
      (l) => l.locked_by_user_id !== user.id && (!lock_token || l.lock_token !== lock_token)
    );

    if (existingBookedDate.length > 0 || existingActiveBooking.length > 0 || isLockedByAnother) {
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

    // Include selected add-ons in totalAmount
    if (Array.isArray(add_ons) && add_ons.length > 0) {
      for (const addon of add_ons) {
        if (addon && !isNaN(parseFloat(addon.price))) {
          totalAmount += parseFloat(addon.price);
        }
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
    const addOnsJsonStr = add_ons ? JSON.stringify(add_ons) : null;

    await transaction(async (conn) => {
      // Insert Booking
      await conn.execute(
        `INSERT INTO bookings (
          id, booking_number, customer_id, vendor_id, service_id, package_id,
          event_date, event_location, guest_count, total_amount, commission_rate, commission_amount,
          vendor_payout_amount, status, notes, special_instructions, add_ons_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'REQUESTED', ?, ?, ?)`,
        [
          bookingId,
          bookingNumber,
          customerId,
          vendor_id,
          service_id || null,
          package_id || null,
          event_date,
          event_location || null,
          guest_count || 200,
          totalAmount,
          commissionRate,
          commissionAmount,
          vendorPayout,
          notes || 'Direct inquiry via WedWithMe platform',
          special_instructions || null,
          addOnsJsonStr,
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

      // Mark provisional hold in vendor_availability
      await conn.execute(
        `INSERT INTO vendor_availability (id, vendor_id, service_id, date, status, is_booked, reason, notes)
         VALUES (?, ?, ?, ?, 'BOOKED', TRUE, 'BOOKING_REQUEST', ?)
         ON DUPLICATE KEY UPDATE status = 'BOOKED', is_booked = TRUE, notes = ?`,
        [randomUUID(), vendor_id, service_id || 'ALL', event_date, `Held for booking #${bookingNumber}`, `Held for booking #${bookingNumber}`]
      );
    });

    // If lock_token provided, confirm the booking lock
    if (lock_token) {
      try {
        const { confirmBookingLock } = await import('@/services/bookingLockService');
        await confirmBookingLock({ lockToken: lock_token, bookingId });
      } catch {}
    }

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
        vendor_payout_amount: vendorPayout,
        status: 'REQUESTED'
      }
    });
  } catch (error: any) {
    console.error('API /api/bookings POST Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
