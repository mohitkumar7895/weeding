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
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE']);
    if (authResult instanceof NextResponse) return authResult;

    const db = await getDbConnection();
    
    const [configs]: any = await db.execute(`
      SELECT c.*, u.name as updated_by_name 
      FROM system_configuration c
      LEFT JOIN users u ON c.updated_by = u.id
      ORDER BY c.category, c.config_key
    `);

    await db.end();

    // Parse JSON values for client convenience
    const parsedConfigs = configs.map((c: any) => ({
      ...c,
      config_value: typeof c.config_value === 'string' ? JSON.parse(c.config_value) : c.config_value
    }));

    return NextResponse.json({ success: true, configs: parsedConfigs });
  } catch (error: any) {
    console.error('Error fetching system configurations:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch configurations' }, { status: 500 });
  }
}
