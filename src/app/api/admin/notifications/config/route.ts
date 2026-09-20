import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { auditLog } from '@/lib/security';
import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wedwithme';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function getDbConnection() {
  return mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
  });
}

export async function GET(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT']);
    if (authResult instanceof NextResponse) return authResult;

    const db = await getDbConnection();
    const [rows]: any = await db.execute('SELECT * FROM system_notification_settings ORDER BY category, event_type');
    await db.end();

    return NextResponse.json({ success: true, settings: rows });
  } catch (error: any) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const actorId = 'system_admin'; 
    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: false, error: 'Updates array is required' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Fetch existing settings for audit comparison
    const [existingRows]: any = await db.execute('SELECT * FROM system_notification_settings');
    const existingMap = new Map(existingRows.map((r: any) => [r.event_type, r]));

    const auditDetails = [];

    // Begin transaction for bulk update
    await db.beginTransaction();

    for (const update of updates) {
      const { event_type, in_app_enabled, email_enabled, sms_enabled, push_enabled, whatsapp_enabled } = update;
      
      const prev: any = existingMap.get(event_type);
      if (!prev) continue; // Skip invalid event types

      // Prepare audit comparison
      const changes: any = {};
      if (in_app_enabled !== undefined && in_app_enabled !== !!prev.in_app_enabled) changes.in_app_enabled = { from: !!prev.in_app_enabled, to: !!in_app_enabled };
      if (email_enabled !== undefined && email_enabled !== !!prev.email_enabled) changes.email_enabled = { from: !!prev.email_enabled, to: !!email_enabled };
      if (sms_enabled !== undefined && sms_enabled !== !!prev.sms_enabled) changes.sms_enabled = { from: !!prev.sms_enabled, to: !!sms_enabled };
      if (push_enabled !== undefined && push_enabled !== !!prev.push_enabled) changes.push_enabled = { from: !!prev.push_enabled, to: !!push_enabled };
      if (whatsapp_enabled !== undefined && whatsapp_enabled !== !!prev.whatsapp_enabled) changes.whatsapp_enabled = { from: !!prev.whatsapp_enabled, to: !!whatsapp_enabled };

      if (Object.keys(changes).length > 0) {
        await db.execute(
          `UPDATE system_notification_settings 
           SET in_app_enabled = COALESCE(?, in_app_enabled),
               email_enabled = COALESCE(?, email_enabled),
               sms_enabled = COALESCE(?, sms_enabled),
               push_enabled = COALESCE(?, push_enabled),
               whatsapp_enabled = COALESCE(?, whatsapp_enabled)
           WHERE event_type = ?`,
          [
            in_app_enabled !== undefined ? (in_app_enabled ? 1 : 0) : null,
            email_enabled !== undefined ? (email_enabled ? 1 : 0) : null,
            sms_enabled !== undefined ? (sms_enabled ? 1 : 0) : null,
            push_enabled !== undefined ? (push_enabled ? 1 : 0) : null,
            whatsapp_enabled !== undefined ? (whatsapp_enabled ? 1 : 0) : null,
            event_type
          ]
        );

        auditDetails.push({ event_type, changes });
      }
    }

    await db.commit();

    if (auditDetails.length > 0) {
      await auditLog(db, {
        actorId,
        actorRole: 'ADMIN',
        action: 'UPDATE_NOTIFICATION_CONFIG',
        entityId: 'BATCH',
        entityType: 'system_notification_settings',
        details: { bulk_updates: auditDetails },
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
      });
    }

    await db.end();

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (error: any) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
