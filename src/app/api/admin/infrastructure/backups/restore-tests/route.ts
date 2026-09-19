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

export async function GET(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const db = await getDbConnection();
    
    const [tests]: any = await db.execute(`
      SELECT r.*, u.name as tested_by_name 
      FROM restore_test_records r
      LEFT JOIN users u ON r.tested_by = u.id
      ORDER BY r.created_at DESC
    `);
    
    await db.end();

    return NextResponse.json({ success: true, tests });
  } catch (error: any) {
    console.error('Error fetching restore tests:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { test_environment, backup_reference } = body;

    if (!test_environment || !backup_reference) {
      return NextResponse.json({ success: false, error: 'test_environment and backup_reference are required' }, { status: 400 });
    }

    const id = uuidv4();
    const db = await getDbConnection();

    await db.beginTransaction();

    await db.execute(
      `INSERT INTO restore_test_records (id, test_environment, backup_reference, status, tested_by)
       VALUES (?, ?, ?, 'PLANNED', ?)`,
      [id, test_environment, backup_reference, authResult.user?.id || null]
    );

    await auditLog(db, {
      actorId: authResult.user?.id || 'system',
      actorRole: authResult.user?.role || 'SUPER_ADMIN',
      action: 'CREATE_RESTORE_TEST',
      entityId: id,
      entityType: 'restore_test_records',
      details: { test_environment, backup_reference },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.commit();
    await db.end();

    return NextResponse.json({ success: true, testId: id });
  } catch (error: any) {
    console.error('Error creating restore test:', error);
    return NextResponse.json({ success: false, error: 'Failed to create test' }, { status: 500 });
  }
}
