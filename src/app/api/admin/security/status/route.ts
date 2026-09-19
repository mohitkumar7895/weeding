import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
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
      SELECT config_key, config_value FROM system_configuration WHERE category = 'SECURITY'
    `);
    await db.end();

    const configMap = configs.reduce((acc: any, curr: any) => {
      acc[curr.config_key] = typeof curr.config_value === 'string' ? JSON.parse(curr.config_value) : curr.config_value;
      return acc;
    }, {});

    // Derived statuses
    const status = {
      authentication: { active: true, details: 'JWT verification enabled for all /api endpoints except /auth.' },
      authorization: { active: true, details: 'RBAC active. verifyAdminRole protecting admin endpoints.' },
      passwordHashing: { active: true, details: 'bcrypt 10 rounds.' },
      rateLimiting: { active: true, details: `Global limit: ${configMap.RATE_LIMIT_GLOBAL?.maxRequests || 100} req per ${configMap.RATE_LIMIT_GLOBAL?.windowMs ? configMap.RATE_LIMIT_GLOBAL.windowMs / 1000 : 900}s.` },
      cors: { active: true, details: `Allowed Origins: ${configMap.CORS_ALLOWED_ORIGINS?.origins?.join(', ') || 'None'}` },
      strictAuth: { active: configMap.REQUIRE_STRICT_AUTH?.enabled || false, details: 'Strict token validation.' },
      auditLogging: { active: true, details: 'auditLog() capturing sensitive changes.' }
    };

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error('Error fetching security status:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch status' }, { status: 500 });
  }
}
