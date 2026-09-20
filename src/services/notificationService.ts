import { query } from '@/lib/db';
import { randomUUID } from 'crypto';
import { sendEmail } from './emailService';
import { dispatchWhatsAppMessage } from './whatsappProvider';

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
    const res = await sendEmail({
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    });
    return res.success;
  }
}

export class SmsProvider {
  async send(msg: SmsMessage): Promise<boolean> {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_SMS_FROM;
    const msg91 = process.env.MSG91_AUTH_KEY;

    if (twilioSid && twilioToken && twilioFrom) {
      const body = new URLSearchParams({ To: msg.to, From: twilioFrom, Body: msg.body });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      if (!res.ok) {
        console.warn('[SmsProvider] Twilio failed', await res.text());
        return false;
      }
      return true;
    }

    if (msg91) {
      const res = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: { authkey: msg91, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: process.env.MSG91_TEMPLATE_ID,
          recipients: [{ mobiles: msg.to.replace(/\D/g, ''), VAR1: msg.body }],
        }),
      });
      if (!res.ok) {
        console.warn('[SmsProvider] MSG91 failed', await res.text());
        return false;
      }
      return true;
    }

    console.warn('[SmsProvider] No SMS provider configured; message not sent');
    return false;
  }
}

export class WhatsAppProvider {
  async send(msg: WhatsAppMessage): Promise<boolean> {
    const result = await dispatchWhatsAppMessage({
      recipientPhone: msg.to,
      templateName: msg.templateName,
      messageText: `${msg.templateName}: ${msg.parameters.join(' ')}`,
    });
    return result.status === 'SENT' || result.status === 'DELIVERED';
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
