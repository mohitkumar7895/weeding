import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, logAudit } from '@/lib/auth';
import { verifyAdminRole } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);
    if (!auth.ok) return auth.response!;

    const staff = await query<any[]>(
      `SELECT id, name, email, phone, role, status, created_at, updated_at
       FROM users
       WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE')
       ORDER BY FIELD(role, 'SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT'), name ASC`
    );

    return NextResponse.json({
      success: true,
      data: staff,
      current_user_role: auth.user!.role,
    });
  } catch (error: any) {
    console.error('[Admin Roles GET Error]:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Protected Action: Only Super Admin can modify administrative roles
    const auth = await verifyAdminRole(['SUPER_ADMIN']);
    if (!auth.ok) return auth.response!;

    const body = await req.json();
    const { user_id, new_role, status } = body;

    if (!user_id || !new_role) {
      return NextResponse.json(
        { success: false, message: 'user_id and new_role are required.' },
        { status: 400 }
      );
    }

    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE', 'CUSTOMER', 'VENDOR'];
    if (!validRoles.includes(new_role)) {
      return NextResponse.json(
        { success: false, message: `Invalid role. Allowed roles: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch existing user
    const existing = await query<any[]>(`SELECT id, email, name, role FROM users WHERE id = ?`, [user_id]);
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }
    const targetUser = existing[0];

    // Prevent demoting the last active SUPER_ADMIN
    if (targetUser.role === 'SUPER_ADMIN' && new_role !== 'SUPER_ADMIN') {
      const [countSuper]: any = await query(
        `SELECT COUNT(*) as super_count FROM users WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE'`
      );
      if ((countSuper?.super_count || 0) <= 1) {
        return NextResponse.json(
          { success: false, message: 'Protected Action: Cannot demote the sole remaining Super Admin.' },
          { status: 400 }
        );
      }
    }

    const updates: string[] = ['role = ?'];
    const params: any[] = [new_role];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    params.push(user_id);

    await query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);

    // Audit log this protected role reassignment
    await logAudit(
      auth.user!.id,
      'ASSIGN_ADMIN_ROLE',
      'users',
      user_id,
      { old_role: targetUser.role, new_role, updated_by: auth.user!.email }
    );

    return NextResponse.json({
      success: true,
      message: `Role for ${targetUser.name} successfully updated to ${new_role}.`,
    });
  } catch (error: any) {
    console.error('[Admin Roles PUT Error]:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
