import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

function isValidDateString(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

/**
 * GET /api/vendors/[id]/availability
 * Public / customer-facing read-only availability check.
 * Strictly sanitizes internal vendor notes, customer identities, and reasons.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const monthParam = searchParams.get('month');
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');
    const serviceId = searchParams.get('service_id') || 'ALL';

    // Verify vendor exists
    const vendors = await query<any[]>(
      `SELECT id, business_name, verification_status FROM vendors WHERE id = ?`,
      [vendorId]
    );

    if (!vendors || vendors.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // 1. Single date check
    if (dateParam) {
      if (!isValidDateString(dateParam)) {
        return NextResponse.json(
          { success: false, message: 'Invalid date format (YYYY-MM-DD required)' },
          { status: 400 }
        );
      }

      // Check manual blocks
      const blocks = await query<any[]>(
        `SELECT id FROM vendor_availability 
         WHERE vendor_id = ? AND date = ? 
           AND (service_id = ? OR service_id = 'ALL' OR ? = 'ALL')
           AND (status IN ('BLOCKED', 'CONFIRMED', 'BOOKING_LOCKED') OR is_booked = 1)
         LIMIT 1`,
        [vendorId, dateParam, serviceId, serviceId]
      );

      // Check confirmed bookings
      const bookings = await query<any[]>(
        `SELECT id FROM bookings 
         WHERE vendor_id = ? AND event_date = ? 
           AND (service_id = ? OR service_id IS NULL OR ? = 'ALL')
           AND status IN ('CONFIRMED', 'IN_PROGRESS', 'ACCEPTED', 'PAYMENT_PENDING')
         LIMIT 1`,
        [vendorId, dateParam, serviceId, serviceId]
      );

      // Check active locks
      const locks = await query<any[]>(
        `SELECT id FROM vendor_booking_locks 
         WHERE vendor_id = ? AND event_date = ? 
           AND (service_id = ? OR service_id = 'ALL' OR ? = 'ALL')
           AND status = 'LOCKED' AND expires_at > NOW()
         LIMIT 1`,
        [vendorId, dateParam, serviceId, serviceId]
      );

      const isUnavailable = blocks.length > 0 || bookings.length > 0 || locks.length > 0;

      return NextResponse.json({
        success: true,
        data: {
          vendor_id: vendorId,
          date: dateParam,
          service_id: serviceId,
          available: !isUnavailable,
          status: isUnavailable ? 'UNAVAILABLE' : 'AVAILABLE',
        },
      });
    }

    // 2. Month or Date Range check
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
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      startDate = `${y}-${m}-01`;
      const lastDay = new Date(y, Number(m), 0).getDate();
      endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    }

    // Fetch manual blocks in range
    const blocks = await query<any[]>(
      `SELECT DATE_FORMAT(date, '%Y-%m-%d') as date 
       FROM vendor_availability 
       WHERE vendor_id = ? AND date >= ? AND date <= ?
         AND (service_id = ? OR service_id = 'ALL' OR ? = 'ALL')
         AND (status IN ('BLOCKED', 'CONFIRMED', 'BOOKING_LOCKED') OR is_booked = 1)`,
      [vendorId, startDate, endDate, serviceId, serviceId]
    );

    // Fetch confirmed bookings in range
    const bookings = await query<any[]>(
      `SELECT DATE_FORMAT(event_date, '%Y-%m-%d') as date 
       FROM bookings 
       WHERE vendor_id = ? AND event_date >= ? AND event_date <= ?
         AND (service_id = ? OR service_id IS NULL OR ? = 'ALL')
         AND status IN ('CONFIRMED', 'IN_PROGRESS', 'ACCEPTED', 'PAYMENT_PENDING')`,
      [vendorId, startDate, endDate, serviceId, serviceId]
    );

    // Fetch active locks in range
    const locks = await query<any[]>(
      `SELECT DATE_FORMAT(event_date, '%Y-%m-%d') as date 
       FROM vendor_booking_locks 
       WHERE vendor_id = ? AND event_date >= ? AND event_date <= ?
         AND (service_id = ? OR service_id = 'ALL' OR ? = 'ALL')
         AND status = 'LOCKED' AND expires_at > NOW()`,
      [vendorId, startDate, endDate, serviceId, serviceId]
    );

    const unavailableSet = new Set<string>();
    blocks.forEach((b) => unavailableSet.add(b.date));
    bookings.forEach((b) => unavailableSet.add(b.date));
    locks.forEach((l) => unavailableSet.add(l.date));

    const allDates = getDatesInRange(startDate, endDate);
    const dateStatuses = allDates.map((d) => ({
      date: d,
      available: !unavailableSet.has(d),
      status: unavailableSet.has(d) ? 'UNAVAILABLE' : 'AVAILABLE',
    }));

    return NextResponse.json({
      success: true,
      data: {
        vendor_id: vendorId,
        start_date: startDate,
        end_date: endDate,
        service_id: serviceId,
        total_days: allDates.length,
        available_days_count: allDates.length - unavailableSet.size,
        unavailable_days_count: unavailableSet.size,
        unavailable_dates: Array.from(unavailableSet).sort(),
        dates: dateStatuses,
      },
    });
  } catch (error: any) {
    console.error('API /api/vendors/[id]/availability GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
