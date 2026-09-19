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
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
    if (authResult instanceof NextResponse) return authResult;

    const db = await getDbConnection();
    const [rows]: any = await db.execute('SELECT * FROM backup_configuration WHERE id = 1');
    await db.end();

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Backup configuration not initialized.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    console.error('Error fetching backup config:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch backup configuration.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    // Only Super Admin can change backup config
    const authResult = await verifyAdminRole(['SUPER_ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { is_enabled, frequency, retention_days, destination_reference } = body;

    const db = await getDbConnection();

    const [existing]: any = await db.execute('SELECT * FROM backup_configuration WHERE id = 1');
    if (existing.length === 0) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Backup configuration not found.' }, { status: 404 });
    }

    await db.execute(`
      UPDATE backup_configuration 
      SET is_enabled = ?, frequency = ?, retention_days = ?, destination_reference = ? 
      WHERE id = 1
    `, [is_enabled ? 1 : 0, frequency, retention_days, destination_reference]);

    await auditLog(db, {
      actorId: authResult.user?.id || 'system',
      actorRole: authResult.user?.role || 'SUPER_ADMIN',
      action: 'UPDATE_BACKUP_CONFIG',
      entityId: '1',
      entityType: 'backup_configuration',
      details: { is_enabled, frequency, retention_days, destination_reference },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.end();

    return NextResponse.json({ success: true, message: 'Backup configuration updated successfully.' });
  } catch (error: any) {
    console.error('Error updating backup config:', error);
    return NextResponse.json({ success: false, error: 'Failed to update backup configuration.' }, { status: 500 });
  }
}
