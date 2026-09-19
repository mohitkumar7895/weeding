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
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const db = await getDbConnection();
    
    // Fetch roles
    const [roles]: any = await db.execute('SELECT * FROM roles ORDER BY name');
    
    // Fetch all available permissions
    const [permissions]: any = await db.execute('SELECT * FROM permissions ORDER BY module, name');
    
    // Fetch mappings
    const [rolePermissions]: any = await db.execute('SELECT role_id, permission_id FROM role_permissions');

    await db.end();

    return NextResponse.json({ 
      success: true, 
      roles, 
      permissions, 
      mappings: rolePermissions 
    });
  } catch (error: any) {
    console.error('Error fetching roles and permissions:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch roles' }, { status: 500 });
  }
}
