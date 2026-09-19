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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = params;
    const body = await request.json();
    const { status, notes_and_results } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: 'Status is required' }, { status: 400 });
    }

    const validStatuses = ['PLANNED', 'IN_PROGRESS', 'PASSED', 'FAILED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const db = await getDbConnection();
    const [rows]: any = await db.execute('SELECT status FROM restore_test_records WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    const currentStatus = rows[0].status;

    await db.beginTransaction();

    await db.execute(
      'UPDATE restore_test_records SET status = ?, notes_and_results = ? WHERE id = ?',
      [status, notes_and_results || null, id]
    );

    await auditLog(db, {
      actorId: authResult.user?.id || 'system',
      actorRole: authResult.user?.role || 'SUPER_ADMIN',
      action: 'UPDATE_RESTORE_TEST',
      entityId: id,
      entityType: 'restore_test_records',
      details: { previous_status: currentStatus, new_status: status },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.commit();
    await db.end();

    return NextResponse.json({ success: true, message: 'Restore test updated successfully' });
  } catch (error: any) {
    console.error('Error updating restore test:', error);
    return NextResponse.json({ success: false, error: 'Failed to update test' }, { status: 500 });
  }
}
