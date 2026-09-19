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

export async function PATCH(request: Request, { params }: { params: { key: string } }) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const { key } = params;
    const body = await request.json();
    const { config_value } = body;

    if (!config_value || typeof config_value !== 'object') {
      return NextResponse.json({ success: false, error: 'config_value must be a valid JSON object' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Fetch existing
    const [rows]: any = await db.execute('SELECT * FROM system_configuration WHERE config_key = ?', [key]);
    if (rows.length === 0) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Configuration key not found' }, { status: 404 });
    }

    const current = rows[0];

    await db.beginTransaction();

    await db.execute(
      'UPDATE system_configuration SET config_value = ?, updated_by = ? WHERE config_key = ?',
      [JSON.stringify(config_value), authResult.user?.id || null, key]
    );

    await auditLog(db, {
      actorId: authResult.user?.id || 'system',
      actorRole: authResult.user?.role || 'SUPER_ADMIN',
      action: 'UPDATE_SYSTEM_CONFIG',
      entityId: key,
      entityType: 'system_configuration',
      details: { 
        previous_value: typeof current.config_value === 'string' ? JSON.parse(current.config_value) : current.config_value, 
        new_value: config_value 
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.commit();
    await db.end();

    return NextResponse.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error: any) {
    console.error('Error updating system configuration:', error);
    return NextResponse.json({ success: false, error: 'Failed to update configuration' }, { status: 500 });
  }
}
