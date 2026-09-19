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
    const { status, role } = body;

    if (!status && !role) {
      return NextResponse.json({ success: false, error: 'Status or role is required' }, { status: 400 });
    }

    const db = await getDbConnection();
    const [rows]: any = await db.execute('SELECT id, role, status FROM users WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      await db.end();
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = rows[0];

    const updates: string[] = [];
    const values: any[] = [];
    const auditDetails: any = { previous: { role: user.role, status: user.status }, new: {} };

    if (status && status !== user.status) {
      if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
        await db.end();
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      updates.push('status = ?');
      values.push(status);
      auditDetails.new.status = status;
    }

    if (role && role !== user.role) {
      if (!['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE'].includes(role)) {
        await db.end();
        return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
      }
      updates.push('role = ?');
      values.push(role);
      auditDetails.new.role = role;
    }

    if (updates.length > 0) {
      values.push(id);
      
      await db.beginTransaction();
      
      await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

      await auditLog(db, {
        actorId: authResult.user?.id || 'system',
        actorRole: authResult.user?.role || 'SUPER_ADMIN',
        action: 'UPDATE_ADMIN_STATUS',
        entityId: id,
        entityType: 'users',
        details: auditDetails,
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
      });

      await db.commit();
    }

    await db.end();

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Error updating admin user:', error);
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
}
