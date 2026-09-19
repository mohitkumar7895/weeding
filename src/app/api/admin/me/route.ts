import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/rbac';
import { query } from '@/lib/db';
import { safeErrorResponse } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    // Enforce Admin RBAC strictly. Only these 4 roles can access this API.
    const rbac = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']);
    
    // If RBAC check fails, return the pre-formatted Next.js response (401 or 403)
    if (!rbac.ok) {
      return rbac.response;
    }

    const session = rbac.user;
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch full, secure details of the admin from the database
    const admins = await query<any[]>(
      `SELECT id, email, phone, name, role, status, created_at, updated_at
       FROM users
       WHERE id = ? AND role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE')
       LIMIT 1`,
      [session.id]
    );

    if (admins.length === 0) {
      return NextResponse.json({ success: false, message: 'Admin account not found or invalid role.' }, { status: 403 });
    }

    const admin = admins[0];

    // Ensure the admin is not suspended
    if (admin.status === 'SUSPENDED') {
      return NextResponse.json(
        { success: false, message: 'Your admin account has been suspended.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Admin RBAC verified successfully',
      data: {
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
          status: admin.status,
          created_at: admin.created_at,
        },
      },
    });
  } catch (error: any) {
    return safeErrorResponse(error, 'Failed to fetch admin profile');
  }
}
