import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversation_id');
    const bookingId = searchParams.get('booking_id');

    let convId = conversationId;
    if (!convId && bookingId) {
      const convRows = await query<any[]>(`SELECT id FROM conversations WHERE booking_id = ?`, [bookingId]);
      if (convRows.length) {
        convId = convRows[0].id;
      } else {
        const bRows = await query<any[]>(`SELECT customer_id, vendor_id FROM bookings WHERE id = ?`, [bookingId]);
        if (bRows.length > 0) {
          convId = randomUUID();
          await query(
            `INSERT INTO conversations (id, booking_id, customer_id, vendor_id, status)
             VALUES (?, ?, ?, ?, 'ACTIVE')`,
            [convId, bookingId, bRows[0].customer_id, bRows[0].vendor_id]
          );
        }
      }
    }

    if (!convId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const messages = await query<any[]>(
      `SELECT cm.*, cm.message as body, u.name as sender_name, u.role as sender_role
       FROM conversation_messages cm
       JOIN users u ON cm.sender_id = u.id
       WHERE cm.conversation_id = ?
       ORDER BY cm.created_at ASC, cm.id ASC`,
      [convId]
    );

    return NextResponse.json({
      success: true,
      data: messages,
      messages: messages,
      conversation_id: convId,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { booking_id, vendor_id } = body;
    const messageText = (body.message || body.body || '').trim();

    if (!messageText || (!booking_id && !vendor_id)) {
      return NextResponse.json({ success: false, message: 'Message text and booking/vendor context required' }, { status: 400 });
    }

    // Determine customer and vendor IDs
    let customerId = user.id;
    let targetVendorId = vendor_id;

    if (booking_id) {
      const bRows = await query<any[]>(`SELECT customer_id, vendor_id FROM bookings WHERE id = ?`, [booking_id]);
      if (bRows.length > 0) {
        customerId = bRows[0].customer_id;
        targetVendorId = bRows[0].vendor_id;
      }
    } else {
      if (user.role === 'CUSTOMER') {
        const cust = await query<any[]>(`SELECT id FROM customer_profiles WHERE user_id = ?`, [user.id]);
        if (cust.length) customerId = cust[0].id;
      } else if (user.role === 'VENDOR') {
        const v = await query<any[]>(`SELECT id FROM vendors WHERE user_id = ?`, [user.id]);
        if (v.length) targetVendorId = v[0].id;
      }
    }

    // Find or create conversation
    let convId: string;
    const existing = await query<any[]>(
      `SELECT id FROM conversations WHERE (booking_id = ? AND booking_id IS NOT NULL) OR (customer_id = ? AND vendor_id = ?)`,
      [booking_id || null, customerId, targetVendorId]
    );

    if (existing.length) {
      convId = existing[0].id;
    } else {
      convId = randomUUID();
      await query(
        `INSERT INTO conversations (id, booking_id, customer_id, vendor_id, status)
         VALUES (?, ?, ?, ?, 'ACTIVE')`,
        [convId, booking_id || null, customerId, targetVendorId]
      );
    }

    const msgId = randomUUID();
    const createdAt = new Date().toISOString();
    await query(
      `INSERT INTO conversation_messages (id, conversation_id, sender_id, message, is_read)
       VALUES (?, ?, ?, ?, FALSE)`,
      [msgId, convId, user.id, messageText]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: msgId,
        conversation_id: convId,
        message: messageText,
        body: messageText,
        sender_id: user.id,
        sender_name: user.name,
        sender_role: user.role,
        created_at: createdAt,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
