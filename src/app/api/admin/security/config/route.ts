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
    const [configs]: any = await db.execute(`
      SELECT config_key, config_value, description, updated_at 
      FROM system_configuration 
      WHERE category = 'SECURITY'
    `);
    await db.end();

    const configMap = configs.reduce((acc: any, curr: any) => {
      acc[curr.config_key] = {
        value: typeof curr.config_value === 'string' ? JSON.parse(curr.config_value) : curr.config_value,
        description: curr.description,
        updated_at: curr.updated_at
      };
      return acc;
    }, {});

    return NextResponse.json({ success: true, config: configMap });
  } catch (error: any) {
    console.error('Error fetching security config:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch security configurations' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: 'Key and value are required' }, { status: 400 });
    }

    // Validation
    if (key === 'RATE_LIMIT_GLOBAL') {
      if (typeof value.windowMs !== 'number' || value.windowMs <= 0) {
        return NextResponse.json({ success: false, error: 'windowMs must be a positive number' }, { status: 400 });
      }
      if (typeof value.maxRequests !== 'number' || value.maxRequests <= 0) {
        return NextResponse.json({ success: false, error: 'maxRequests must be a positive number' }, { status: 400 });
      }
    } else if (key === 'CORS_ALLOWED_ORIGINS') {
      if (!Array.isArray(value.origins)) {
        return NextResponse.json({ success: false, error: 'origins must be an array of strings' }, { status: 400 });
      }
    }

    const db = await getDbConnection();
    
    const [rows]: any = await db.execute('SELECT config_value FROM system_configuration WHERE config_key = ?', [key]);
    if (rows.length === 0) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Configuration key not found' }, { status: 404 });
    }

    const previousValue = typeof rows[0].config_value === 'string' ? JSON.parse(rows[0].config_value) : rows[0].config_value;

    await db.beginTransaction();
    await db.execute(
      'UPDATE system_configuration SET config_value = ?, updated_by = ? WHERE config_key = ?',
      [JSON.stringify(value), authResult.user?.id || null, key]
    );

    await auditLog(db, {
      actorId: authResult.user?.id || 'system',
      actorRole: authResult.user?.role || 'SUPER_ADMIN',
      action: 'UPDATE_SECURITY_CONFIG',
      entityId: key,
      entityType: 'system_configuration',
      details: { previous: previousValue, new: value },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.commit();
    await db.end();

    return NextResponse.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error: any) {
    console.error('Error updating security config:', error);
    return NextResponse.json({ success: false, error: 'Failed to update configuration' }, { status: 500 });
  }
}
