import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendor_id');

    let targetVendorId = vendorId;
    if (!targetVendorId) {
      const user = await getSessionUser();
      if (user && user.role === 'VENDOR') {
        const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
        if (vendors.length) targetVendorId = vendors[0].id;
      }
    }

    if (!targetVendorId) {
      return NextResponse.json({ success: false, message: 'vendor_id parameter required' }, { status: 400 });
    }

    // 1. Fetch manual availability / blocks
    const manualBlocks = await query<any[]>(
      `SELECT date, is_booked, notes FROM vendor_availability WHERE vendor_id = ? ORDER BY date ASC`,
      [targetVendorId]
    );

    // 2. Fetch confirmed/in_progress bookings
    const bookedDates = await query<any[]>(
      `SELECT event_date as date, booking_number, status 
       FROM bookings 
       WHERE vendor_id = ? AND status IN ('CONFIRMED', 'IN_PROGRESS', 'ACCEPTED')
       ORDER BY event_date ASC`,
      [targetVendorId]
    );

    return NextResponse.json({
      success: true,
      data: {
        vendor_id: targetVendorId,
        manual_blocks: manualBlocks,
        confirmed_bookings: bookedDates,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const vendors = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
    if (!vendors.length) return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    const vendorId = vendors[0].id;

    const body = await req.json();
    const { date, is_booked = true, notes = 'Blocked by vendor' } = body;

    if (!date) {
      return NextResponse.json({ success: false, message: 'Date is required' }, { status: 400 });
    }

    // Check if this date already has an active confirmed booking
    const activeBooking = await query<any[]>(
      `SELECT booking_number FROM bookings 
       WHERE vendor_id = ? AND event_date = ? AND status IN ('CONFIRMED', 'IN_PROGRESS')`,
      [vendorId, date]
    );

    if (activeBooking.length && !is_booked) {
      return NextResponse.json({
        success: false,
        message: `Date is already committed to confirmed booking ${activeBooking[0].booking_number}. Cannot unblock.`
      }, { status: 400 });
    }

    const existing = await query<any[]>(
      `SELECT id FROM vendor_availability WHERE vendor_id = ? AND date = ?`,
      [vendorId, date]
    );

    if (existing.length) {
      await query(
        `UPDATE vendor_availability SET is_booked = ?, notes = ? WHERE id = ?`,
        [is_booked ? 1 : 0, notes, existing[0].id]
      );
    } else {
      await query(
        `INSERT INTO vendor_availability (id, vendor_id, date, is_booked, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), vendorId, date, is_booked ? 1 : 0, notes]
      );
    }

    await logAudit(user.id, 'UPDATE_AVAILABILITY', 'vendor_availability', vendorId, { date, is_booked });

    return NextResponse.json({
      success: true,
      message: `Date ${date} set to ${is_booked ? 'Blocked / Unavailable' : 'Available'}`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
