import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch booking joined with vendor, customer, category, service, package
    const bookings = await query<any[]>(
      `SELECT 
        b.*,
        v.business_name as vendor_name,
        v.city as vendor_city,
        v.address as vendor_address,
        c.name as category_name,
        u_cust.name as customer_name,
        u_cust.phone as customer_phone,
        u_cust.email as customer_email,
        vp.name as package_name,
        vp.package_tier,
        vp.price as package_price,
        vp.description as package_description,
        vp.included_items_json as package_inclusions_json,
        vp.guest_capacity as package_guest_capacity,
        vs.title as service_name,
        vs.description as service_description,
        vs.starting_price as service_starting_price
      FROM bookings b
      JOIN vendors v ON b.vendor_id = v.id
      JOIN categories c ON v.category_id = c.id
      JOIN customer_profiles cp ON b.customer_id = cp.id
      JOIN users u_cust ON cp.user_id = u_cust.id
      LEFT JOIN vendor_packages vp ON b.package_id = vp.id
      LEFT JOIN vendor_services vs ON b.service_id = vs.id
      WHERE b.id = ?`,
      [id]
    );

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];

    // Tenant authorization check
    const isSuperOrAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
    if (!isSuperOrAdmin) {
      if (user.role === 'VENDOR') {
        const vendor = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
        if (!vendor.length || vendor[0].id !== booking.vendor_id) {
          return NextResponse.json({ success: false, message: 'Unauthorized. You do not own this booking.' }, { status: 403 });
        }
      } else if (user.role === 'CUSTOMER') {
        const customer = await query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ?`, [user.id]);
        if (!customer.length || customer[0].id !== booking.customer_id) {
          return NextResponse.json({ success: false, message: 'Unauthorized. This booking belongs to another client.' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
      }
    }

    // Fetch status history
    const history = await query<any[]>(
      `SELECT bsh.*, u.name as changed_by_name, u.role as changed_by_role
       FROM booking_status_history bsh
       LEFT JOIN users u ON bsh.changed_by = u.id
       WHERE bsh.booking_id = ?
       ORDER BY bsh.created_at ASC`,
      [id]
    );

    // Fetch refund status if cancelled
    let refundInfo = null;
    if (booking.status === 'CANCELLED' || booking.status === 'REJECTED') {
      const refundRows = await query<any[]>(
        `SELECT id, amount, deduction_amount, status, created_at, processed_at
         FROM refunds WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1`,
        [id]
      );
      if (refundRows.length > 0) {
        refundInfo = refundRows[0];
      }
    }

    // Fetch or resolve conversation
    const convRows = await query<any[]>(
      `SELECT id FROM conversations WHERE booking_id = ? LIMIT 1`,
      [id]
    );
    let conversationId = convRows.length > 0 ? convRows[0].id : null;
    if (!conversationId) {
      conversationId = randomUUID();
      try {
        await query(
          `INSERT INTO conversations (id, booking_id, customer_id, vendor_id, status)
           VALUES (?, ?, ?, ?, 'ACTIVE')`,
          [conversationId, id, booking.customer_id, booking.vendor_id]
        );
      } catch {
        conversationId = null;
      }
    }

    // Parse add_ons_json safely
    let addOns: any[] = [];
    if (booking.add_ons_json) {
      try {
        addOns = typeof booking.add_ons_json === 'string' ? JSON.parse(booking.add_ons_json) : booking.add_ons_json;
      } catch {}
    }

    // Parse package_inclusions_json safely
    let packageInclusions: string[] = [];
    if (booking.package_inclusions_json) {
      try {
        packageInclusions = typeof booking.package_inclusions_json === 'string'
          ? JSON.parse(booking.package_inclusions_json)
          : booking.package_inclusions_json;
      } catch {}
    }

    // Sanitize and structure response
    const sanitizedBooking = {
      id: booking.id,
      booking_number: booking.booking_number,
      event_date: booking.event_date,
      event_location: booking.event_location,
      guest_count: booking.guest_count,
      status: booking.status,
      cancellation_reason: booking.cancellation_reason,
      notes: booking.notes,
      special_instructions: booking.special_instructions,
      total_amount: booking.total_amount,
      commission_rate: booking.commission_rate,
      commission_amount: booking.commission_amount,
      vendor_payout_amount: booking.vendor_payout_amount,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      // Vendor info
      vendor_id: booking.vendor_id,
      vendor_name: booking.vendor_name,
      vendor_city: booking.vendor_city,
      vendor_address: booking.vendor_address,
      category_name: booking.category_name,
      // Flat customer fulfillment info
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      customer_email: booking.customer_email,
      customer: {
        id: booking.customer_id,
        name: booking.customer_name,
        phone: booking.customer_phone,
        email: booking.customer_email,
      },
      // Service & Package info
      service_title: booking.service_name,
      service: booking.service_id
        ? {
            id: booking.service_id,
            title: booking.service_name,
            description: booking.service_description,
            starting_price: booking.service_starting_price,
          }
        : null,
      package_name: booking.package_name,
      package_tier: booking.package_tier,
      package_price: booking.package_price,
      package_description: booking.package_description,
      package_inclusions: packageInclusions,
      package_guest_capacity: booking.package_guest_capacity,
      package: booking.package_id
        ? {
            id: booking.package_id,
            name: booking.package_name,
            tier: booking.package_tier,
            price: booking.package_price,
            description: booking.package_description,
            inclusions: packageInclusions,
            guest_capacity: booking.package_guest_capacity,
          }
        : null,
      // Payment info
      payment_status: booking.payment_status,
      // Refund info
      refund_info: refundInfo,
      // Metadata
      add_ons: addOns,
      package_inclusions: packageInclusions,
      // Relationships
      status_history: history,
      conversation_id: conversationId,
    };

    return NextResponse.json({ success: true, data: sanitizedBooking });
  } catch (error: any) {
    console.error('API /api/bookings/[id] GET Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
