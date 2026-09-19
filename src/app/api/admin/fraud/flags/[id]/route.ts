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

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT']);
    if (authResult instanceof NextResponse) return authResult;

    const db = await getDbConnection();

    const [flags]: any = await db.execute(`
      SELECT f.*, u.name as reviewer_name 
      FROM risk_flags f
      LEFT JOIN users u ON f.reviewed_by = u.id
      WHERE f.id = ?
    `, [params.id]);

    if (flags.length === 0) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Flag not found' }, { status: 404 });
    }

    const flag = flags[0];
    
    // Fetch basic masked context based on entity_type
    let context = {};
    if (flag.entity_type === 'CUSTOMER' || flag.entity_type === 'VENDOR') {
      const [users]: any = await db.execute('SELECT email, created_at, status FROM users WHERE id = ?', [flag.entity_id]);
      if (users.length > 0) {
        const emailParts = users[0].email.split('@');
        const maskedEmail = emailParts[0].substring(0, 3) + '***@' + emailParts[1];
        context = { maskedEmail, accountStatus: users[0].status, memberSince: users[0].created_at };
      }
    } else if (flag.entity_type === 'BOOKING') {
      const [bookings]: any = await db.execute('SELECT status, total_amount FROM bookings WHERE id = ?', [flag.entity_id]);
      if (bookings.length > 0) {
        context = { bookingStatus: bookings[0].status, amount: bookings[0].total_amount };
      }
    }

    await db.end();

    return NextResponse.json({ success: true, flag, context });
  } catch (error: any) {
    console.error('Error fetching risk flag:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch risk flag' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { status, review_notes } = body;

    const db = await getDbConnection();

    const [rows]: any = await db.execute('SELECT status FROM risk_flags WHERE id = ?', [params.id]);
    if (rows.length === 0) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Flag not found' }, { status: 404 });
    }

    const previousStatus = rows[0].status;

    await db.beginTransaction();
    await db.execute(`
      UPDATE risk_flags 
      SET status = ?, review_notes = ?, reviewed_by = ? 
      WHERE id = ?
    `, [status, review_notes || null, authResult.user?.id, params.id]);

    await auditLog(db, {
      actorId: authResult.user?.id || 'system',
      actorRole: authResult.user?.role || 'ADMIN',
      action: 'UPDATE_RISK_FLAG',
      entityId: params.id,
      entityType: 'risk_flags',
      details: { previousStatus, newStatus: status, notes: review_notes },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.commit();
    await db.end();

    return NextResponse.json({ success: true, message: 'Risk flag updated' });
  } catch (error: any) {
    console.error('Error updating risk flag:', error);
    return NextResponse.json({ success: false, error: 'Failed to update flag' }, { status: 500 });
  }
}
