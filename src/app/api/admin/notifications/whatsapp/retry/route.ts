import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { dispatchWhatsAppMessage } from '@/services/whatsappProvider';
import { verifyAdminRole } from '@/lib/rbac';

export async function POST(req: NextRequest) {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!authResult.ok) return authResult.response;

  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, message: 'Super Admin authorization required' }, { status: 403 });
    }

    const body = await req.json();
    const { deliveryId } = body;

    if (!deliveryId) {
      return NextResponse.json({ success: false, message: 'Delivery ID is required' }, { status: 400 });
    }

    const [delivery] = await query<any[]>(
      `SELECT wd.*, n.title, n.message, u.phone 
       FROM whatsapp_deliveries wd
       JOIN notifications n ON wd.notification_id = n.id
       JOIN users u ON wd.user_id = u.id
       WHERE wd.id = ?`,
      [deliveryId]
    );

    if (!delivery) {
      return NextResponse.json({ success: false, message: 'Delivery record not found' }, { status: 404 });
    }

    if (delivery.status === 'DELIVERED' || delivery.status === 'SENT') {
      return NextResponse.json({ success: false, message: 'Message is already sent or delivered' }, { status: 400 });
    }

    if (delivery.retry_count >= 3) {
      return NextResponse.json({ success: false, message: 'Maximum retry limit reached' }, { status: 400 });
    }

    if (!delivery.phone) {
      return NextResponse.json({ success: false, message: 'User does not have a registered phone number' }, { status: 400 });
    }

    // Attempt Retry
    const waResult = await dispatchWhatsAppMessage({
      recipientPhone: delivery.phone,
      messageText: `*${delivery.title}*\n${delivery.message}`
    });

    await query(
      `UPDATE whatsapp_deliveries 
       SET status = ?, provider = ?, provider_reference_id = ?, error_metadata = ?, retry_count = retry_count + 1
       WHERE id = ?`,
      [
        waResult.status,
        waResult.provider,
        waResult.provider_reference_id,
        waResult.error_metadata ? JSON.stringify(waResult.error_metadata) : null,
        deliveryId
      ]
    );

    await logAudit(user.id, 'RETRY_WHATSAPP', 'whatsapp_deliveries', deliveryId, { resultStatus: waResult.status });

    return NextResponse.json({ success: true, status: waResult.status });

  } catch (error: any) {
    console.error('WhatsApp Retry error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
