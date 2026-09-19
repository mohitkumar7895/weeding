import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { auditLog } from '@/lib/security';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = params;

    const db = await getDbConnection();
    
    // Fetch the original failed log
    const [rows]: any = await db.execute('SELECT * FROM notification_delivery_logs WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Log not found' }, { status: 404 });
    }

    const log = rows[0];

    if (log.status !== 'FAILED') {
      await db.end();
      return NextResponse.json({ success: false, error: 'Only FAILED notifications can be retried' }, { status: 400 });
    }

    const newId = uuidv4();
    const newIdempotencyKey = log.idempotency_key ? `${log.idempotency_key}_retry_${Date.now()}` : null;

    await db.beginTransaction();

    // Create a new QUEUED log
    await db.execute(`
      INSERT INTO notification_delivery_logs 
      (id, event_type, recipient_type, recipient_id, channel, template_id, status, entity_id, entity_type, idempotency_key)
      VALUES (?, ?, ?, ?, ?, ?, 'QUEUED', ?, ?, ?)
    `, [
      newId, log.event_type, log.recipient_type, log.recipient_id, log.channel, log.template_id, 
      log.entity_id, log.entity_type, newIdempotencyKey
    ]);

    // Update old log to mark it as RETRY
    await db.execute('UPDATE notification_delivery_logs SET status = "RETRY" WHERE id = ?', [id]);

    await auditLog(db, {
      actorId: 'system_admin',
      actorRole: 'ADMIN',
      action: 'RETRY_NOTIFICATION',
      entityId: id,
      entityType: 'notification_delivery_logs',
      details: { new_log_id: newId, event_type: log.event_type, channel: log.channel },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.commit();
    await db.end();

    return NextResponse.json({ success: true, newLogId: newId });
  } catch (error: any) {
    console.error('Error retrying notification:', error);
    return NextResponse.json({ success: false, error: 'Failed to retry notification' }, { status: 500 });
  }
}
