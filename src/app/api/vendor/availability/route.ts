import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

/**
 * Format a Date object to YYYY-MM-DD
 */
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate YYYY-MM-DD string
 */
function isValidDateString(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

/**
 * Generate all dates between start and end (inclusive)
 */
function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');
  while (curr <= end) {
    dates.push(formatDate(curr));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorIdParam = searchParams.get('vendor_id');
    const monthParam = searchParams.get('month'); // e.g. '2026-09'
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');
    const serviceIdParam = searchParams.get('service_id');

    let targetVendorId = vendorIdParam;
    const sessionUser = await getSessionUser();

    if (!targetVendorId && sessionUser) {
      if (sessionUser.role === 'VENDOR') {
        const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [sessionUser.id]);
        if (vendors.length) targetVendorId = vendors[0].id;
      }
    }

    if (!targetVendorId) {
      return NextResponse.json(
        { success: false, message: 'vendor_id parameter or authenticated vendor session required' },
        { status: 400 }
      );
    }

    // Determine date boundaries
    let startDate: string;
    let endDate: string;

    if (startDateParam && endDateParam && isValidDateString(startDateParam) && isValidDateString(endDateParam)) {
      startDate = startDateParam;
      endDate = endDateParam;
    } else if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split('-').map(Number);
      startDate = `${monthParam}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      endDate = `${monthParam}-${String(lastDay).padStart(2, '0')}`;
    } else {
      // Default to current month
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      startDate = `${y}-${m}-01`;
      const lastDay = new Date(y, Number(m), 0).getDate();
      endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    }

    // 1. Fetch vendor services
    const services = await query<any[]>(
      `SELECT id, title, category_id, starting_price FROM vendor_services WHERE vendor_id = ? AND is_active = TRUE ORDER BY title ASC`,
      [targetVendorId]
    );

    // 2. Fetch manual availability / blocks
    let blocksSql = `
      SELECT 
        va.id, 
        DATE_FORMAT(va.date, '%Y-%m-%d') as date, 
        va.service_id, 
        va.status, 
        va.reason, 
        va.notes, 
        va.is_booked, 
        va.created_at,
        vs.title as service_title
      FROM vendor_availability va
      LEFT JOIN vendor_services vs ON va.service_id = vs.id
      WHERE va.vendor_id = ? 
        AND va.date >= ? 
        AND va.date <= ?
    `;
    const blocksParams: any[] = [targetVendorId, startDate, endDate];

    if (serviceIdParam && serviceIdParam !== 'ALL') {
      blocksSql += ` AND (va.service_id = ? OR va.service_id = 'ALL')`;
      blocksParams.push(serviceIdParam);
    }
    blocksSql += ` ORDER BY va.date ASC`;

    const manualBlocks = await query<any[]>(blocksSql, blocksParams);

    // 3. Fetch confirmed / committed bookings from bookings table
    let bookingsSql = `
      SELECT 
        b.id,
        b.booking_number,
        DATE_FORMAT(b.event_date, '%Y-%m-%d') as date,
        b.service_id,
        b.status,
        b.guest_count,
        b.total_amount,
        u.name as customer_name,
        vs.title as service_title
      FROM bookings b
      LEFT JOIN customer_profiles cp ON b.customer_id = cp.id
      LEFT JOIN users u ON cp.user_id = u.id
      LEFT JOIN vendor_services vs ON b.service_id = vs.id
      WHERE b.vendor_id = ? 
        AND b.event_date >= ? 
        AND b.event_date <= ?
        AND b.status IN ('CONFIRMED', 'IN_PROGRESS', 'ACCEPTED', 'PAYMENT_PENDING')
    `;
    const bookingsParams: any[] = [targetVendorId, startDate, endDate];
    if (serviceIdParam && serviceIdParam !== 'ALL') {
      bookingsSql += ` AND (b.service_id = ? OR b.service_id IS NULL)`;
      bookingsParams.push(serviceIdParam);
    }
    bookingsSql += ` ORDER BY b.event_date ASC`;

    const confirmedBookings = await query<any[]>(bookingsSql, bookingsParams);

    // 4. Fetch active booking reservation locks
    let locksSql = `
      SELECT 
        vbl.id,
        vbl.lock_token,
        DATE_FORMAT(vbl.event_date, '%Y-%m-%d') as date,
        vbl.service_id,
        vbl.status,
        vbl.expires_at
      FROM vendor_booking_locks vbl
      WHERE vbl.vendor_id = ?
        AND vbl.event_date >= ?
        AND vbl.event_date <= ?
        AND vbl.status = 'LOCKED'
        AND vbl.expires_at > NOW()
    `;
    const locksParams: any[] = [targetVendorId, startDate, endDate];
    if (serviceIdParam && serviceIdParam !== 'ALL') {
      locksSql += ` AND (vbl.service_id = ? OR vbl.service_id = 'ALL')`;
      locksParams.push(serviceIdParam);
    }
    const activeLocks = await query<any[]>(locksSql, locksParams);

    // 5. Build unified date map and calculate metrics
    const allRangeDates = getDatesInRange(startDate, endDate);
    const dateMap: Record<string, any> = {};

    // Group manual blocks by date
    const manualBlocksMap = new Map<string, any>();
    for (const b of manualBlocks) {
      manualBlocksMap.set(b.date, b);
    }

    // Group bookings by date
    const bookingsMap = new Map<string, any>();
    for (const b of confirmedBookings) {
      bookingsMap.set(b.date, b);
    }

    // Group locks by date
    const locksMap = new Map<string, any>();
    for (const l of activeLocks) {
      locksMap.set(l.date, l);
    }

    let availableCount = 0;
    let blockedCount = 0;
    let bookedCount = 0;
    let lockedCount = 0;

    for (const dateStr of allRangeDates) {
      const booking = bookingsMap.get(dateStr);
      const manualBlock = manualBlocksMap.get(dateStr);
      const lock = locksMap.get(dateStr);

      if (booking) {
        bookedCount++;
        dateMap[dateStr] = {
          date: dateStr,
          status: 'BOOKED',
          source: 'BOOKING',
          booking_id: booking.id,
          booking_number: booking.booking_number,
          customer_name: booking.customer_name,
          service_title: booking.service_title,
          guest_count: booking.guest_count,
          can_unblock: false,
          notes: `Confirmed Booking #${booking.booking_number}`,
        };
      } else if (lock) {
        lockedCount++;
        dateMap[dateStr] = {
          date: dateStr,
          status: 'LOCKED',
          source: 'BOOKING_LOCK',
          lock_token: lock.lock_token,
          expires_at: lock.expires_at,
          can_unblock: false,
          notes: 'Temporarily reserved during checkout',
        };
      } else if (manualBlock && (manualBlock.status === 'BLOCKED' || manualBlock.is_booked === 1)) {
        blockedCount++;
        dateMap[dateStr] = {
          date: dateStr,
          status: 'BLOCKED',
          source: 'MANUAL_BLOCK',
          block_id: manualBlock.id,
          service_id: manualBlock.service_id,
          service_title: manualBlock.service_title,
          reason: manualBlock.reason || 'Blocked by vendor',
          notes: manualBlock.notes,
          can_unblock: true,
        };
      } else {
        availableCount++;
        dateMap[dateStr] = {
          date: dateStr,
          status: 'AVAILABLE',
          source: 'DEFAULT',
          can_unblock: false,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        vendor_id: targetVendorId,
        start_date: startDate,
        end_date: endDate,
        services,
        summary: {
          total_days: allRangeDates.length,
          available_days: availableCount,
          blocked_days: blockedCount,
          booked_days: bookedCount,
          locked_days: lockedCount,
        },
        calendar_dates: dateMap,
        manual_blocks: manualBlocks,
        confirmed_bookings: confirmedBookings,
        active_locks: activeLocks,
      },
    });
  } catch (error: any) {
    console.error('API /api/vendor/availability GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Vendor role required.' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    }
    const vendorId = vendors[0].id;

    const body = await req.json();
    const {
      date,
      start_date,
      end_date,
      status = 'BLOCKED', // 'BLOCKED' | 'AVAILABLE'
      is_booked = true,
      reason = 'PERSONAL_LEAVE',
      notes = '',
      service_id = 'ALL',
    } = body;

    // Support single date or date range
    let targetDates: string[] = [];
    if (start_date && end_date) {
      if (!isValidDateString(start_date) || !isValidDateString(end_date)) {
        return NextResponse.json({ success: false, message: 'Invalid start_date or end_date format (YYYY-MM-DD required)' }, { status: 400 });
      }
      if (start_date > end_date) {
        return NextResponse.json({ success: false, message: 'start_date must be before or equal to end_date' }, { status: 400 });
      }
      targetDates = getDatesInRange(start_date, end_date);
    } else if (date) {
      if (!isValidDateString(date)) {
        return NextResponse.json({ success: false, message: 'Invalid date format (YYYY-MM-DD required)' }, { status: 400 });
      }
      targetDates = [date];
    } else {
      return NextResponse.json({ success: false, message: 'Either date or (start_date and end_date) is required' }, { status: 400 });
    }

    const effectiveStatus = (status === 'AVAILABLE' || is_booked === false || is_booked === 0) ? 'AVAILABLE' : 'BLOCKED';

    // 1. Guard against unblocking dates committed to confirmed bookings
    if (effectiveStatus === 'AVAILABLE') {
      const placeholders = targetDates.map(() => '?').join(',');
      const committedBookings = await query<any[]>(
        `SELECT booking_number, DATE_FORMAT(event_date, '%Y-%m-%d') as event_date 
         FROM bookings 
         WHERE vendor_id = ? 
           AND event_date IN (${placeholders}) 
           AND status IN ('CONFIRMED', 'IN_PROGRESS', 'ACCEPTED', 'PAYMENT_PENDING')`,
        [vendorId, ...targetDates]
      );

      if (committedBookings.length > 0) {
        const firstCommitted = committedBookings[0];
        return NextResponse.json(
          {
            success: false,
            message: `Cannot mark date ${firstCommitted.event_date} as available: it is committed to confirmed booking ${firstCommitted.booking_number}. Double-booking is strictly prohibited.`,
          },
          { status: 409 }
        );
      }
    }

    // 2. Persist availability changes for each target date
    for (const d of targetDates) {
      const existing = await query<any[]>(
        `SELECT id FROM vendor_availability WHERE vendor_id = ? AND date = ? AND service_id = ?`,
        [vendorId, d, service_id]
      );

      if (effectiveStatus === 'AVAILABLE') {
        if (existing.length) {
          await query(
            `UPDATE vendor_availability 
             SET status = 'AVAILABLE', is_booked = 0, notes = ?, reason = NULL 
             WHERE id = ?`,
            [notes || 'Marked available by vendor', existing[0].id]
          );
        }
      } else {
        if (existing.length) {
          await query(
            `UPDATE vendor_availability 
             SET status = 'BLOCKED', is_booked = 1, reason = ?, notes = ? 
             WHERE id = ?`,
            [reason, notes, existing[0].id]
          );
        } else {
          await query(
            `INSERT INTO vendor_availability (id, vendor_id, service_id, date, status, reason, notes, is_booked)
             VALUES (?, ?, ?, ?, 'BLOCKED', ?, ?, 1)`,
            [randomUUID(), vendorId, service_id, d, reason, notes]
          );
        }
      }
    }

    await logAudit(user.id, 'UPDATE_AVAILABILITY', 'vendor_availability', vendorId, {
      dates_count: targetDates.length,
      effectiveStatus,
      reason,
      service_id,
    });

    return NextResponse.json({
      success: true,
      message: `${targetDates.length} date(s) marked as ${effectiveStatus === 'BLOCKED' ? 'Unavailable / Blocked' : 'Available'}`,
      data: {
        dates_affected: targetDates,
        status: effectiveStatus,
        service_id,
      },
    });
  } catch (error: any) {
    console.error('API /api/vendor/availability POST Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Vendor role required.' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) {
      return NextResponse.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
    }
    const vendorId = vendors[0].id;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const serviceId = searchParams.get('service_id') || 'ALL';

    if (!date || !isValidDateString(date)) {
      return NextResponse.json({ success: false, message: 'Valid date parameter required (YYYY-MM-DD)' }, { status: 400 });
    }

    // Guard: Check if date has a confirmed booking
    const committedBookings = await query<any[]>(
      `SELECT booking_number FROM bookings 
       WHERE vendor_id = ? AND event_date = ? 
         AND status IN ('CONFIRMED', 'IN_PROGRESS', 'ACCEPTED', 'PAYMENT_PENDING')`,
      [vendorId, date]
    );

    if (committedBookings.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot unblock date ${date}: it is committed to confirmed booking ${committedBookings[0].booking_number}.`,
        },
        { status: 409 }
      );
    }

    // Remove block
    await query(
      `DELETE FROM vendor_availability 
       WHERE vendor_id = ? AND date = ? AND (service_id = ? OR ? = 'ALL')`,
      [vendorId, date, serviceId, serviceId]
    );

    await logAudit(user.id, 'DELETE_AVAILABILITY_BLOCK', 'vendor_availability', vendorId, { date, serviceId });

    return NextResponse.json({
      success: true,
      message: `Block removed for date ${date}. Date is now available.`,
    });
  } catch (error: any) {
    console.error('API /api/vendor/availability DELETE Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
