import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getSessionUser();
    if (!adminUser || (adminUser.role !== 'SUPER_ADMIN' && adminUser.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, role } = body;

    const existing = await query<any[]>(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    if (status) {
      await query(`UPDATE users SET status = ? WHERE id = ?`, [status, id]);
    }
    if (role) {
      await query(`UPDATE users SET role = ? WHERE id = ?`, [role, id]);
    }

    await logAudit(adminUser.id, 'UPDATE_USER', 'users', id, { status, role });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error: any) {
    console.error('API /api/admin/users/[id] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
