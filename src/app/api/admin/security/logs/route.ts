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
    const [logs]: any = await db.execute(`
      SELECT * FROM api_security_logs 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    await db.end();

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Error fetching security logs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch logs' }, { status: 500 });
  }
}
