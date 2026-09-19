import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest, { params }: any) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const messageId = params.messageId;
    const body = await req.json();
    const { reason, description } = body;

    if (!reason) {
      return NextResponse.json({ success: false, message: 'Report reason is required' }, { status: 400 });
    }

    // Verify message exists
    const [message] = await query<any[]>(`SELECT * FROM booking_messages WHERE id = ?`, [messageId]);
    if (!message) {
      return NextResponse.json({ success: false, message: 'Message not found' }, { status: 404 });
    }

    // Validate access to the booking containing this message
    const [booking] = await query<any[]>(`SELECT * FROM bookings WHERE id = ?`, [message.booking_id]);
    if (!booking) return NextResponse.json({ success: false, message: 'Associated booking not found' }, { status: 404 });

    const isCustomer = user.role === 'CUSTOMER' && booking.customer_id === user.id;
    const isVendor = user.role === 'VENDOR' && booking.vendor_id === user.id;

    if (!isCustomer && !isVendor) {
      return NextResponse.json({ success: false, message: 'Forbidden: You cannot report messages in conversations you are not part of' }, { status: 403 });
    }

    // Insert report
    const reportId = randomUUID();
    await query(
      `INSERT INTO message_reports (id, message_id, reporter_id, reason, description, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [reportId, messageId, user.id, reason, description || null]
    );

    return NextResponse.json({ success: true, message: 'Message reported successfully', report_id: reportId });

  } catch (error: any) {
    console.error('Report POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
