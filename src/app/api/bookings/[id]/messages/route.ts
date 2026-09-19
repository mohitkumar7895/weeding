import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

// Get messages for a booking
export async function GET(req: NextRequest, { params }: any) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const bookingId = params.id;

    // Validate booking access
    const [booking] = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [bookingId]);
    if (!booking) return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });

    const isCustomer = user.role === 'CUSTOMER' && booking.customer_id === user.id;
    const isVendor = user.role === 'VENDOR' && booking.vendor_id === user.id;
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'FINANCE';

    if (!isCustomer && !isVendor && !isAdmin) {
      return NextResponse.json({ success: false, message: 'Forbidden: You are not a participant of this booking' }, { status: 403 });
    }

    // Fetch messages (Real-time readiness: just return the list sorted by time)
    const messages = await query<any[]>(
      `SELECT * FROM booking_messages WHERE booking_id = ? ORDER BY created_at ASC`,
      [bookingId]
    );

    // Optionally mark as read if fetching
    if (messages.length > 0) {
      await query(
        `UPDATE booking_messages SET is_read = TRUE WHERE booking_id = ? AND sender_id != ? AND is_read = FALSE`,
        [bookingId, user.id]
      );
    }

    return NextResponse.json({ success: true, messages });

  } catch (error: any) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Send a message
export async function POST(req: NextRequest, { params }: any) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const bookingId = params.id;
    const body = await req.json();
    const { content, message_type = 'TEXT', attachment_url } = body;

    if (!content && !attachment_url) {
      return NextResponse.json({ success: false, message: 'Message content or attachment is required' }, { status: 400 });
    }

    // Validate booking access
    const [booking] = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [bookingId]);
    if (!booking) return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });

    const isCustomer = user.role === 'CUSTOMER' && booking.customer_id === user.id;
    const isVendor = user.role === 'VENDOR' && booking.vendor_id === user.id;

    if (!isCustomer && !isVendor) {
      return NextResponse.json({ success: false, message: 'Forbidden: You are not a participant of this booking' }, { status: 403 });
    }

    // Validate if users have blocked each other
    const targetUserId = isCustomer ? booking.vendor_id : booking.customer_id;
    const [block] = await query<any[]>(
      `SELECT id FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
      [user.id, targetUserId, targetUserId, user.id]
    );

    if (block) {
      return NextResponse.json({ success: false, message: 'Communication is blocked with this user' }, { status: 403 });
    }

    const messageId = randomUUID();
    const senderRole = isCustomer ? 'CUSTOMER' : 'VENDOR';

    await query(
      `INSERT INTO booking_messages (id, booking_id, sender_id, sender_role, message_type, content, attachment_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [messageId, bookingId, user.id, senderRole, message_type, content || null, attachment_url || null]
    );

    // Return the inserted message so it can be broadcasted via real-time sockets on the client
    const [newMessage] = await query<any[]>(`SELECT * FROM booking_messages WHERE id = ?`, [messageId]);

    return NextResponse.json({ success: true, message: newMessage });

  } catch (error: any) {
    console.error('Messages POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
