import { query } from '@/lib/db';
import { randomUUID } from 'crypto';
import { dispatchWhatsAppMessage } from '@/services/whatsappProvider';

export type NotificationCategory = 'BOOKINGS' | 'PAYMENTS' | 'CHAT' | 'REVIEWS' | 'SECURITY' | 'MARKETING';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  link?: string;
  metadata?: any;
}

/**
 * Validates user preferences and dispatches notifications via appropriate channels.
 */
export async function sendNotification(payload: NotificationPayload) {
  const { userId, title, message, category, link, metadata } = payload;
  
  const [userResult] = await query<any[]>(`SELECT phone, email FROM users WHERE id = ?`, [userId]);
  const userPhone = userResult ? userResult.phone : null;
  const userEmail = userResult ? userResult.email : null;

  const [pref] = await query<any[]>(
    `SELECT * FROM notification_preferences WHERE user_id = ? AND category = ?`,
    [userId, category]
  );

  const inAppEnabled = pref ? pref.in_app_enabled : true;
  const emailEnabled = pref ? pref.email_enabled : true;
  const smsEnabled = pref ? pref.sms_enabled !== false : true;
  const whatsappEnabled = pref ? pref.whatsapp_enabled : false;
  const transactional = ['BOOKINGS', 'PAYMENTS', 'SECURITY'].includes(category);

  const results = {
    inApp: false,
    email: false,
    sms: false,
    whatsapp: false,
  };

  let notifId = randomUUID();

  // 2. Dispatch In-App (Database)
  if (inAppEnabled) {
    await query(
      `INSERT INTO notifications (id, user_id, title, message, type, link, category, metadata_json)
       VALUES (?, ?, ?, ?, 'ALERT', ?, ?, ?)`,
      [notifId, userId, title, message, link || null, category, metadata ? JSON.stringify(metadata) : null]
    );
    results.inApp = true;
  }

  if (emailEnabled || transactional) {
    if (!userEmail) {
      console.warn(`[notificationEngine] No email for user ${userId}`);
    } else {
      const { sendEmail } = await import('@/services/emailService');
      const sent = await sendEmail({
        to: userEmail,
        subject: `[WedWithMe] ${title}`,
        html: `<p>${message}</p>${link ? `<p><a href="${link}">Open</a></p>` : ''}`,
      });
      results.email = sent.success;
      if (!sent.success) console.warn('[notificationEngine] Email failed', sent.error);
    }
  }

  if ((smsEnabled || transactional) && userPhone) {
    const { smsService } = await import('@/services/notificationService');
    results.sms = await smsService.send({ to: userPhone, body: `${title}: ${message}` });
  }

  // 4. Dispatch WhatsApp
  if (whatsappEnabled && userPhone) {
    const waResult = await dispatchWhatsAppMessage({
      recipientPhone: userPhone,
      messageText: `*${title}*\n${message}`
    });

    const deliveryId = randomUUID();
    await query(
      `INSERT INTO whatsapp_deliveries (id, notification_id, user_id, provider, provider_reference_id, status, error_metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        deliveryId, 
        notifId, 
        userId, 
        waResult.provider, 
        waResult.provider_reference_id, 
        waResult.status, 
        waResult.error_metadata ? JSON.stringify(waResult.error_metadata) : null
      ]
    );

    results.whatsapp = waResult.status === 'SENT' || waResult.status === 'DELIVERED';
  }

  return results;
}
