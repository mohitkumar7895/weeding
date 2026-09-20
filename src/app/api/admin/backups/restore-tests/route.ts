import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { auditLog } from '@/lib/security';
import mysql from 'mysql2/promise';
import { uuidv4 } from '@/lib/uuid';

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
    
    const [rows]: any = await db.execute(`
      SELECT r.*, u.name as tester_name 
      FROM restore_tests r
      LEFT JOIN users u ON r.tested_by = u.id
      ORDER BY r.test_date DESC 
      LIMIT 50
    `);
    
    await db.end();

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Error fetching restore tests:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch restore tests.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Only Super Admin or Admin can log a restore test
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { backup_reference, status, environment_reference, notes } = body;

    if (!backup_reference || !environment_reference || !status) {
      return NextResponse.json({ success: false, error: 'Missing required restore test fields.' }, { status: 400 });
    }

    const db = await getDbConnection();
    const testId = uuidv4();
    const testDate = new Date();

    await db.execute(`
      INSERT INTO restore_tests (id, backup_reference, test_date, status, environment_reference, notes, tested_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [testId, backup_reference, testDate, status, environment_reference, notes || null, authResult.user?.id]);

    await auditLog(db, {
      actorId: authResult.user?.id || 'system',
      actorRole: authResult.user?.role || 'ADMIN',
      action: 'LOG_RESTORE_TEST',
      entityId: testId,
      entityType: 'restore_tests',
      details: { backup_reference, status, environment_reference },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.end();

    return NextResponse.json({ success: true, message: 'Restore test recorded.', data: { id: testId } });
  } catch (error: any) {
    console.error('Error logging restore test:', error);
    return NextResponse.json({ success: false, error: 'Failed to log restore test.' }, { status: 500 });
  }
}
