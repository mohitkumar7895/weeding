import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP';

export interface SendNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  deepLink?: string;
  channels?: NotificationChannel[];
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface SmsMessage {
  to: string;
  body: string;
}

export interface WhatsAppMessage {
  to: string;
  templateName: string;
  parameters: string[];
}

// Provider Abstractions
export class EmailProvider {
  async send(msg: EmailMessage): Promise<boolean> {
    // Configurable SMTP / Provider abstraction
    console.log(`[EmailProvider] Sent to ${msg.to}: "${msg.subject}"`);
    return true;
  }
}

export class SmsProvider {
  async send(msg: SmsMessage): Promise<boolean> {
    // Configurable SMS Gateway abstraction
    console.log(`[SmsProvider] Sent to ${msg.to}: "${msg.body}"`);
    return true;
  }
}

export class WhatsAppProvider {
  async send(msg: WhatsAppMessage): Promise<boolean> {
    // Meta Cloud API / Gupshup abstraction
    console.log(`[WhatsAppProvider] Template ${msg.templateName} dispatched to ${msg.to}`);
    return true;
  }
}

export const emailService = new EmailProvider();
export const smsService = new SmsProvider();
export const whatsappService = new WhatsAppProvider();

export async function sendNotification(params: SendNotificationParams): Promise<void> {
  const { userId, type, title, message, deepLink } = params;

  // 1. Fetch user preferences
  const prefs = await query<any[]>(
    `SELECT * FROM notification_preferences WHERE user_id = ?`,
    [userId]
  );
  const pref = prefs.length ? prefs[0] : { in_app_enabled: true, email_enabled: true };

  // 2. Dispatch In-App Notification (Always if enabled)
  if (pref.in_app_enabled !== false) {
    const id = randomUUID();
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message, deep_link, is_read)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [id, userId, type, title, message, deepLink || null]
    );
  }

  // 3. Dispatch Email if enabled
  if (pref.email_enabled) {
    const userRows = await query<any[]>(`SELECT email FROM users WHERE id = ?`, [userId]);
    if (userRows.length && userRows[0].email) {
      await emailService.send({
        to: userRows[0].email,
        subject: `[WedWithMe] ${title}`,
        html: `<p>${message}</p>`,
      });
    }
  }
}
