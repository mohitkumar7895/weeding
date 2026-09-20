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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await verifyAdminRole(['SUPER_ADMIN']);
    if (authResult instanceof NextResponse) return authResult;
    const body = await request.json();
    const { permissionIds } = body;

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json({ success: false, error: 'permissionIds must be an array' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Verify role exists
    const [roles]: any = await db.execute('SELECT name FROM roles WHERE id = ?', [id]);
    if (roles.length === 0) {
      await db.end();
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }
    const roleName = roles[0].name;

    await db.beginTransaction();

    // 1. Delete existing permissions for this role
    await db.execute('DELETE FROM role_permissions WHERE role_id = ?', [id]);

    // 2. Insert new permissions
    if (permissionIds.length > 0) {
      const values = permissionIds.map(pid => [id, pid]);
      await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
    }

    // 3. Audit Log
    await auditLog(db, {
      actorId: authResult.user?.id || 'system',
      actorRole: authResult.user?.role || 'SUPER_ADMIN',
      action: 'UPDATE_ROLE_PERMISSIONS',
      entityId: id,
      entityType: 'roles',
      details: { role: roleName, new_permission_count: permissionIds.length },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    await db.commit();
    await db.end();

    return NextResponse.json({ success: true, message: 'Role permissions updated successfully' });
  } catch (error: any) {
    console.error('Error updating role permissions:', error);
    return NextResponse.json({ success: false, error: 'Failed to update role permissions' }, { status: 500 });
  }
}
