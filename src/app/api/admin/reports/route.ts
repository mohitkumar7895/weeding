import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logAudit } from '@/lib/auth';
import { verifyAdminRole } from '@/lib/rbac';
import { ensureOpsTables, safeSelect } from '@/lib/ensureOpsTables';

export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
  if (!authResult.ok) return authResult.response!;

  try {
    await ensureOpsTables();
    const reports = await safeSelect<any[]>(
      `SELECT r.*, 
              u1.name as reporter_name, u1.email as reporter_email,
              u2.name as reported_name, u2.email as reported_email
       FROM customer_reports r
       LEFT JOIN users u1 ON r.reporter_user_id = u1.id
       LEFT JOIN users u2 ON r.reported_user_id = u2.id
       ORDER BY r.created_at DESC 
       LIMIT 100`
    );

    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);
  if (!authResult.ok) return authResult.response!;

  try {
    const admin = authResult.user;

    const body = await req.json();
    const { report_id, status } = body;
    // status: 'PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'

    if (!report_id || !status) {
      return NextResponse.json({ success: false, message: 'report_id and status are required' }, { status: 400 });
    }

    await query(
      `UPDATE customer_reports SET
        status = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [status, report_id]
    );

    await logAudit(admin?.id || 'system', 'ACTION_CUSTOMER_REPORT', 'customer_reports', report_id, { status });

    return NextResponse.json({
      success: true,
      message: `Report updated to ${status}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
